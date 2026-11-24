import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Banknote, CheckCircle2, HandCoins, Truck, Wallet } from "lucide-react";
import { db } from "@/lib/db";
import { dayBounds, fmtDateTime, isDay, todayMD } from "@/lib/dates";
import { Card, EmptyState, Input, PageHeader, Table, Td, Th, Tracking, cx } from "@/components/ui";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { AutoForm } from "@/components/office/AutoForm";
import { SectionTitle, Stat } from "@/components/office/Stat";
import { confirmHandover } from "@/app/actions/courier";
import { CASH_METHODS } from "@/lib/courier";
import { baniToInput, formatMDL } from "@/lib/money";

const METHODS = ["CASH_RECEIPT", "CASH_NO_RECEIPT", "CARD", "TRANSFER"] as const;

const shiftDay = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
const FOOT = "border-t border-slate-200 bg-slate-50/70 font-semibold";

export default async function CodPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const sp = await searchParams;
  const t = await getTranslations("cod");
  const tc = await getTranslations("common");
  const locale = await getLocale();
  const today = todayMD();
  const from = isDay(sp.from) ? sp.from : today;
  const to = isDay(sp.to) ? sp.to : from;
  const range = { gte: dayBounds(from).start, lt: dayBounds(to).end };
  const presets = [
    { key: "today", from: today, to: today },
    { key: "yesterday", from: shiftDay(today, -1), to: shiftDay(today, -1) },
    { key: "last7", from: shiftDay(today, -6), to: today },
    { key: "month", from: `${today.slice(0, 8)}01`, to: today },
  ] as const;

  const payments = await db.codPayment.findMany({
    where: { collectedAt: range },
    include: { courier: { select: { name: true } }, shipment: { select: { id: true, trackingNo: true, clientId: true, deliveryFee: true, feeMode: true, client: { select: { name: true } } } } },
    orderBy: { collectedAt: "asc" },
  });

  // Courier × method totals: cash the courier must hand over vs. money that went straight to the bank.
  const byCourier = new Map<string, { name: string; totals: Record<string, number>; sum: number }>();
  for (const p of payments) {
    const key = p.courierId ?? "-";
    const row = byCourier.get(key) ?? { name: p.courier?.name ?? "—", totals: {}, sum: 0 };
    row.totals[p.method] = (row.totals[p.method] ?? 0) + p.amount;
    row.sum += p.amount;
    byCourier.set(key, row);
  }

  // Per-client: COD collected, minus fees when the client pays by deduction.
  const byClient = new Map<string, { name: string; cod: number; fees: number; shipments: Set<string> }>();
  for (const p of payments) {
    const c = byClient.get(p.shipment.clientId) ?? { name: p.shipment.client.name, cod: 0, fees: 0, shipments: new Set<string>() };
    c.cod += p.amount;
    if (p.shipment.feeMode === "DEDUCT_FROM_COD" && !c.shipments.has(p.shipment.id)) c.fees += p.shipment.deliveryFee;
    c.shipments.add(p.shipment.id);
    byClient.set(p.shipment.clientId, c);
  }

  // Cash currently held by couriers (not yet handed over to the office), regardless of the date filter.
  const held = await db.codPayment.groupBy({
    by: ["courierId"],
    where: { handoverId: null, method: { in: [...CASH_METHODS] }, courierId: { not: null } },
    _sum: { amount: true },
    _count: true,
  });
  const heldCouriers = await db.user.findMany({ where: { id: { in: held.map((h) => h.courierId!) } }, select: { id: true, name: true } });
  const handovers = await db.cashHandover.findMany({
    where: { createdAt: range },
    orderBy: { createdAt: "desc" },
    include: { courier: { select: { name: true } }, receivedBy: { select: { name: true } } },
  });

  const outstanding = await db.shipment.aggregate({
    where: { codAmount: { gt: 0 }, status: { in: ["OUT_FOR_DELIVERY", "AT_WAREHOUSE", "PICKED_UP", "POSTPONED"] } },
    _sum: { codAmount: true },
    _count: true,
  });

  const collected = payments.reduce((a, p) => a + p.amount, 0);
  const heldTotal = held.reduce((a, h) => a + (h._sum.amount ?? 0), 0);
  const clients = [...byClient.values()];
  const totalFees = clients.reduce((a, c) => a + c.fees, 0);
  const toPay = collected - totalFees;
  const courierRows = [...byCourier.values()];
  const methodTotal = (m: string) => courierRows.reduce((a, r) => a + (r.totals[m] ?? 0), 0);

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-3">
        <nav className="inline-flex rounded-[10px] bg-slate-900/5 p-0.5" aria-label={t("period")}>
          {presets.map((p) => {
            const active = p.from === from && p.to === to;
            return (
              <Link
                key={p.key}
                href={`/cod?from=${p.from}&to=${p.to}`}
                aria-current={active ? "true" : undefined}
                className={cx(
                  "flex h-9 items-center rounded-lg px-3 text-[13px] font-semibold transition-colors duration-150",
                  active ? "bg-white text-ink-950 shadow-sm" : "text-slate-600 hover:text-slate-900",
                )}
              >
                {t(`preset.${p.key}`)}
              </Link>
            );
          })}
        </nav>
        <AutoForm key={`${from}_${to}`} className="flex flex-wrap items-center gap-2">
          <Input type="date" name="from" defaultValue={from} max={today} aria-label={tc("from")} title={tc("from")} className="w-40" />
          <span className="text-slate-400" aria-hidden>–</span>
          <Input type="date" name="to" defaultValue={to} max={today} aria-label={tc("to")} title={tc("to")} className="w-40" />
        </AutoForm>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Banknote} tone="bg-emerald-50 text-emerald-600" label={t("statCollected")} value={formatMDL(collected)} hint={t("statPaymentsHint", { count: payments.length })} />
        <Stat icon={Wallet} tone="bg-accent-100 text-accent-600" label={t("held")} value={formatMDL(heldTotal)} hint={t("statHeldHint")} />
        <Stat icon={HandCoins} tone="bg-brand-50 text-brand-600" label={t("statToPay")} value={formatMDL(toPay)} hint={t("statToPayHint")} />
        <Stat icon={Truck} label={t("statOnRoad")} value={formatMDL(outstanding._sum.codAmount ?? 0)} hint={t("statOnRoadHint", { count: outstanding._count })} />
      </div>

      <div className="mt-6 space-y-8">
        <Card title={t("held")} actions={held.length > 0 && <span className="hidden text-xs text-slate-500 md:inline">{t("heldHint")}</span>} flush>
          {held.length === 0 ? (
            <EmptyState icon={CheckCircle2} title={t("nothingHeld")} hint={t("nothingHeldHint")} className="py-10" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {held.map((h) => {
                const name = heldCouriers.find((c) => c.id === h.courierId)?.name ?? "—";
                return (
                  <li key={h.courierId} className="px-5 py-4">
                    <ActionForm action={confirmHandover} className="flex flex-wrap items-center gap-x-4 gap-y-3">
                      <input type="hidden" name="courierId" value={h.courierId!} />
                      <input type="hidden" name="expected" value={baniToInput(h._sum.amount ?? 0)} />
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-100 text-xs font-bold text-amber-900" aria-hidden>{initials(name)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold text-slate-900">{name}</div>
                        <div className="text-xs text-slate-500">{t("heldPayments", { count: h._count })}</div>
                      </div>
                      <div className="text-2xl font-bold tabular-nums tracking-tight text-ink-950">{formatMDL(h._sum.amount ?? 0)}</div>
                      <SubmitButton variant="success"><CheckCircle2 className="h-4 w-4" aria-hidden />{t("confirmReceived")}</SubmitButton>
                    </ActionForm>
                  </li>
                );
              })}
            </ul>
          )}
          {handovers.length > 0 && (
            <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4">
              <div className="mb-2 text-xs font-semibold text-slate-500">{t("recentHandovers")}</div>
              <ul className="space-y-1.5 text-sm">
                {handovers.map((h) => (
                  <li key={h.id} className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-slate-700">
                      <span className="font-medium text-slate-900">{h.courier.name}</span>
                      <span className="text-slate-500"> · {fmtDateTime(h.createdAt, locale)} · {t("receivedBy", { by: h.receivedBy.name })}</span>
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums text-slate-900">{formatMDL(h.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        {payments.length === 0 ? (
          <Card><EmptyState icon={Banknote} title={t("noPayments")} hint={t("noPaymentsHint")} /></Card>
        ) : (
          <>
            <section>
              <SectionTitle>{t("byClient")}</SectionTitle>
              <Table>
                <thead><tr><Th>{t("client")}</Th><Th className="text-right">{t("parcels")}</Th><Th className="text-right">{t("collected")}</Th><Th className="text-right">{t("feesDeducted")}</Th><Th className="text-right">{t("toPay")}</Th></tr></thead>
                <tbody>
                  {clients.map((c) => (
                    <tr key={c.name}>
                      <Td className="font-medium text-slate-900">{c.name}</Td>
                      <Td className="text-right tabular-nums">{c.shipments.size}</Td>
                      <Td className="text-right tabular-nums">{formatMDL(c.cod)}</Td>
                      <Td className="text-right tabular-nums text-slate-600">{c.fees ? `−${formatMDL(c.fees)}` : "—"}</Td>
                      <Td className="text-right font-semibold tabular-nums text-slate-900">{formatMDL(c.cod - c.fees)}</Td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className={FOOT}>
                    <Td>{t("total")}</Td>
                    <Td className="text-right tabular-nums">{clients.reduce((a, c) => a + c.shipments.size, 0)}</Td>
                    <Td className="text-right tabular-nums">{formatMDL(collected)}</Td>
                    <Td className="text-right tabular-nums">{totalFees ? `−${formatMDL(totalFees)}` : "—"}</Td>
                    <Td className="text-right tabular-nums">{formatMDL(toPay)}</Td>
                  </tr>
                </tfoot>
              </Table>
            </section>

            <section>
              <SectionTitle>{t("byCourier")}</SectionTitle>
              <Table>
                <thead><tr><Th>{t("courier")}</Th>{METHODS.map((m) => <Th key={m} className="text-right">{tc(`method.${m}`)}</Th>)}<Th className="text-right">{t("total")}</Th></tr></thead>
                <tbody>
                  {courierRows.map((r) => (
                    <tr key={r.name}>
                      <Td className="font-medium text-slate-900">{r.name}</Td>
                      {METHODS.map((m) => <Td key={m} className="text-right tabular-nums">{r.totals[m] ? formatMDL(r.totals[m]) : <span className="text-slate-300">—</span>}</Td>)}
                      <Td className="text-right font-semibold tabular-nums text-slate-900">{formatMDL(r.sum)}</Td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className={FOOT}>
                    <Td>{t("total")}</Td>
                    {METHODS.map((m) => <Td key={m} className="text-right tabular-nums">{methodTotal(m) ? formatMDL(methodTotal(m)) : "—"}</Td>)}
                    <Td className="text-right tabular-nums">{formatMDL(collected)}</Td>
                  </tr>
                </tfoot>
              </Table>
              <p className="mt-2 px-1 text-xs text-slate-500">{t("cashHint")}</p>
            </section>

            <section>
              <SectionTitle aside={t("statPaymentsHint", { count: payments.length })}>{t("payments")}</SectionTitle>
              <Table>
                <thead><tr><Th>{t("time")}</Th><Th>{t("shipment")}</Th><Th>{t("client")}</Th><Th>{t("courier")}</Th><Th>{t("method")}</Th><Th>{t("receipt")}</Th><Th className="text-right">{t("amount")}</Th></tr></thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="transition-colors duration-150 hover:bg-slate-50">
                      <Td className="whitespace-nowrap text-[13px] tabular-nums text-slate-600">{fmtDateTime(p.collectedAt, locale)}</Td>
                      <Td><Link className="text-brand-700 hover:underline" href={`/shipments/${p.shipment.id}`}><Tracking>{p.shipment.trackingNo}</Tracking></Link></Td>
                      <Td>{p.shipment.client.name}</Td>
                      <Td>{p.courier?.name ?? "—"}</Td>
                      <Td>{tc(`method.${p.method}`)}</Td>
                      <Td className="tabular-nums text-slate-600">{p.receiptNo ?? "—"}</Td>
                      <Td className="text-right font-medium tabular-nums text-slate-900">{formatMDL(p.amount)}</Td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className={FOOT}>
                    <Td colSpan={6}>{t("total")}</Td>
                    <Td className="text-right tabular-nums">{formatMDL(collected)}</Td>
                  </tr>
                </tfoot>
              </Table>
            </section>
          </>
        )}
      </div>
    </>
  );
}
