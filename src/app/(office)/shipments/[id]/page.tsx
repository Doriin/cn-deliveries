import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { AlertTriangle, ArrowLeft, ExternalLink, MapPin, Pencil, PencilLine, Phone, Printer } from "lucide-react";
import { db } from "@/lib/db";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { StatusBadge } from "@/components/StatusBadge";
import { RouteLine, type RouteStop } from "@/components/RouteLine";
import { Card, Field, Input, LinkButton, Select, Tracking, cx } from "@/components/ui";
import { assignCourierAction, recordCodAction } from "@/app/actions/shipments";
import { codDue, COD_NOT_DUE, MAIN_FLOW, STATUS_COLORS, STATUS_DOT, TRANSITIONS } from "@/lib/status";
import { mapsUrl } from "@/lib/courier";
import { fmtDateTime, fmtDayShort } from "@/lib/dates";
import { formatKg, formatMDL } from "@/lib/money";
import { zoneName } from "@/lib/zones";
import { StatusChanger } from "./StatusChanger";
import { ChangeLines, PaymentFix, UndoStep } from "./Corrections";
import { undoTarget } from "@/lib/corrections";

const METHODS = ["CASH_RECEIPT", "CASH_NO_RECEIPT", "CARD", "TRANSFER"] as const;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-3 px-5 py-2.5 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="col-span-2 min-w-0 break-words text-slate-900">{children || <span className="text-slate-300">—</span>}</dd>
    </div>
  );
}

export default async function ShipmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations("shipments");
  const tc = await getTranslations("common");
  const ts = await getTranslations("status");
  const tr = await getTranslations("reason");
  const locale = await getLocale();
  const s = await db.shipment.findUnique({
    where: { id },
    include: {
      client: true,
      zone: true,
      courier: true,
      events: { orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } }, undoneBy: { select: { name: true } } } },
      changes: { orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } } } },
      codPayments: { orderBy: { collectedAt: "desc" }, include: { courier: { select: { name: true } } } },
    },
  });
  if (!s) notFound();
  const [couriers, zones] = await Promise.all([
    db.user.findMany({ where: { role: "COURIER", active: true }, orderBy: { name: "asc" } }),
    db.zone.findMany(),
  ]);
  /** Steps still in force; steps undone by the office only show in the history. */
  const active = s.events.filter((e) => !e.undoneAt);
  const undo = undoTarget(s.events, s.status);
  const codPaid = s.codPayments.reduce((a, p) => a + p.amount, 0);
  const codLeft = codDue(s.status, s.codAmount, codPaid);
  /** Delivery failed, blocked or going back: the missing COD is not expected, and nothing is owed to the client for it. */
  const codNotDue = COD_NOT_DUE.includes(s.status) && codPaid < s.codAmount;
  const codGone = ["REFUSED", "RETURNING", "RETURNED", "CANCELLED"].includes(s.status);
  const fmt = (d: Date) => fmtDateTime(d, locale);

  // On the normal journey the route shows where the parcel is; on an exception it shows how far it got.
  const at = MAIN_FLOW.indexOf(s.status);
  const exception = at === -1;
  const reached = exception ? Math.max(0, ...active.map((e) => MAIN_FLOW.indexOf(e.toStatus))) : at;
  const stops: RouteStop[] = MAIN_FLOW.map((m, i) => ({
    key: m,
    label: ts(m),
    state: i > reached ? "todo" : exception ? "active" : i < reached || m === "DELIVERED" ? "done" : "current",
    color: exception ? "bg-slate-400" : s.status === "DELIVERED" ? "bg-emerald-500" : i === reached ? STATUS_DOT[m] : "bg-brand-500",
  }));
  const address = [s.recipientAddress, s.recipientLocality].filter(Boolean).join(", ");
  const next = TRANSITIONS[s.status];

  return (
    <>
      <Link href="/shipments" className="no-print mb-3 inline-flex h-8 items-center gap-1.5 rounded-lg pr-2 text-sm font-medium text-slate-500 transition-colors duration-150 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" aria-hidden /> {t("back")}
      </Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-2xl font-bold tracking-tight text-ink-950 sm:text-[28px]">{s.trackingNo}</h1>
            <StatusBadge status={s.status} size="md" />
          </div>
          <p className="mt-1.5 text-sm text-slate-500">{s.client.name} · {t(`source.${s.source}`)} · {fmt(s.createdAt)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LinkButton variant="ghost" href={`/track/${s.trackingNo}`} target="_blank"><ExternalLink className="h-4 w-4" aria-hidden /> {t("publicPage")}</LinkButton>
          <LinkButton variant="secondary" href={`/shipments/${s.id}/edit`}><Pencil className="h-4 w-4" aria-hidden /> {t("editOrder")}</LinkButton>
          <LinkButton variant="secondary" href={`/labels?ids=${s.id}`} target="_blank"><Printer className="h-4 w-4" aria-hidden /> {t("printLabel")}</LinkButton>
        </div>
      </div>

      <section className="mb-5 rounded-2xl bg-white p-5 shadow-card ring-1 ring-slate-900/5 sm:px-6">
        <RouteLine stops={stops} line={exception ? "bg-slate-300" : s.status === "DELIVERED" ? "bg-emerald-500" : undefined} />
        {exception && (
          <div className={cx("mt-4 flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-sm", STATUS_COLORS[s.status], "!no-underline")}>
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <div>
              <span className="font-semibold">{ts(s.status)}</span>
              {s.statusReason && <span> · {tr(s.statusReason)}</span>}
              {active[0]?.note && <div className="mt-0.5 opacity-80">{active[0].note}</div>}
            </div>
          </div>
        )}
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card flush title={t("recipient")}>
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div className="min-w-0">
                <div className="text-lg font-bold tracking-tight text-ink-950">{s.recipientName}</div>
                <div className="mt-0.5 text-sm text-slate-600">{address}</div>
              </div>
              <div className="flex gap-2">
                <a href={`tel:${s.recipientPhone.replace(/\s/g, "")}`} className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-brand-50 px-3.5 text-sm font-semibold text-brand-700 transition-[transform,background-color] duration-150 ease-out hover:bg-brand-100 active:scale-[0.97]">
                  <Phone className="h-4 w-4" aria-hidden /> {s.recipientPhone}
                </a>
                <a href={mapsUrl([s.recipientAddress, s.recipientLocality])} target="_blank" rel="noreferrer" aria-label={t("openMap")} title={t("openMap")} className="grid h-10 w-10 place-items-center rounded-[10px] bg-slate-100 text-slate-700 transition-[transform,background-color] duration-150 ease-out hover:bg-slate-200 active:scale-[0.97]">
                  <MapPin className="h-4 w-4" aria-hidden />
                </a>
              </div>
            </div>
            <dl className="divide-y divide-slate-100 py-1">
              <Row label={t("zone")}>{s.zone ? zoneName(s.zone, locale) : <span className="font-semibold text-red-600">{t("noZone")}</span>}</Row>
              <Row label={t("desiredDate")}>{s.desiredDate && fmtDayShort(s.desiredDate, locale)}</Row>
              <Row label={tc("notes")}>{s.notes}</Row>
            </dl>
          </Card>

          <Card flush title={t("parcel")}>
            <dl className="divide-y divide-slate-100 py-1">
              <Row label={t("type")}>{s.type === "PARCEL" ? t("typeParcel") : t("typeDocuments")}</Row>
              <Row label={t("weightKg")}>{s.weightGrams ? formatKg(s.weightGrams) : null}</Row>
              <Row label={t("pieces")}>{s.pieces}</Row>
              <Row label={t("contents")}>{s.contents}</Row>
              <Row label={t("fee")}>
                <span className="font-semibold">{formatMDL(s.deliveryFee)}</span>
                <span className="text-slate-500"> · {tc(`feeMode.${s.feeMode}`)}{s.feeOverridden && ` · ${t("manual")}`}</span>
              </Row>
              <Row label={t("sender")}>{[s.senderName, s.senderPhone, s.senderAddress].filter(Boolean).join(", ") || s.client.address}</Row>
            </dl>
          </Card>

          <Card title={t("history")}>
            <ol className="relative space-y-5 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-0.5 before:rounded-full before:bg-slate-100">
              {[...s.events.map((e) => ({ at: e.createdAt, e, c: null })), ...s.changes.map((c) => ({ at: c.createdAt, e: null, c }))]
                .sort((x, y) => y.at.getTime() - x.at.getTime())
                .map(({ e, c }) => {
                  if (c) {
                    const { title, lines } = ChangeLines({ change: c, t, tc, zoneLabel: (code) => { const z = zones.find((x) => x.code === code); return z ? zoneName(z, locale) : code; }, dayLabel: (iso) => fmtDayShort(new Date(`${iso}T00:00:00Z`), locale) });
                    return (
                      <li key={c.id} className="relative flex gap-3.5 text-sm">
                        <span className="relative z-10 mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-amber-100 ring-4 ring-white" aria-hidden><PencilLine className="h-2.5 w-2.5 text-amber-700" /></span>
                        <div className="min-w-0">
                          <div className="font-medium text-slate-700">{title}</div>
                          {lines.map((l, i) => <div key={i} className="mt-0.5 text-slate-600">{l}</div>)}
                          <div className="mt-0.5 text-xs text-slate-400">{fmt(c.createdAt)}{c.user && ` · ${c.user.name}`}</div>
                        </div>
                      </li>
                    );
                  }
                  const ev = e!;
                  const current = ev.id === active[0]?.id;
                  return (
                    <li key={ev.id} className="relative flex gap-3.5 text-sm">
                      <span className={cx("relative z-10 mt-0.5 h-4 w-4 shrink-0 rounded-full ring-4 ring-white", current ? STATUS_DOT[ev.toStatus] : "border-[3px] border-slate-300 bg-white")} aria-hidden />
                      <div className="min-w-0">
                        <div className={cx(ev.undoneAt ? "text-slate-400 line-through" : current ? "font-semibold text-slate-900" : "font-medium text-slate-700")}>
                          {ts(ev.toStatus)}{ev.reason && <span className="font-normal text-slate-500"> · {tr(ev.reason)}</span>}
                        </div>
                        {ev.undoneAt && (
                          <div className="mt-0.5 text-[13px] text-red-700">
                            {t("undoneBy", { name: ev.undoneBy?.name ?? "—", time: fmt(ev.undoneAt) })}{ev.undoReason && `: ${ev.undoReason}`}
                          </div>
                        )}
                        {ev.note && <div className="mt-0.5 text-slate-600">{ev.note}</div>}
                        {ev.receivedBy && <div className="mt-0.5 text-slate-600">{t("receivedBy")}: {ev.receivedBy}</div>}
                        {(ev.photoPath || ev.signaturePath) && (
                          <div className="mt-2 flex gap-2">
                            {ev.photoPath && (
                              <a href={`/api/files/${ev.photoPath}`} target="_blank" rel="noreferrer" className="overflow-hidden rounded-xl ring-1 ring-slate-200 transition-shadow duration-150 hover:shadow-raised">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={`/api/files/${ev.photoPath}`} alt={t("photo")} className="h-24 w-32 object-cover" />
                              </a>
                            )}
                            {ev.signaturePath && (
                              <a href={`/api/files/${ev.signaturePath}`} target="_blank" rel="noreferrer" className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200 transition-shadow duration-150 hover:shadow-raised">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={`/api/files/${ev.signaturePath}`} alt={t("signature")} className="h-24 w-40 object-contain" />
                              </a>
                            )}
                          </div>
                        )}
                        <div className="mt-0.5 text-xs text-slate-400">{fmt(ev.createdAt)}{ev.user && ` · ${ev.user.name}`}</div>
                      </div>
                    </li>
                  );
                })}
            </ol>
          </Card>
        </div>

        <div className="space-y-5 lg:sticky lg:top-20">
          <Card title={next.length ? t("nextStep") : t("currentStatus")}>
            <StatusChanger key={s.status} id={s.id} next={next} />
            {undo && <UndoStep shipmentId={s.id} step={ts(undo.event.toStatus)} back={ts(undo.back)} t={t} />}
          </Card>

          <Card title={t("courier")}>
            <ActionForm action={assignCourierAction} className="flex flex-wrap gap-2">
              <input type="hidden" name="id" value={s.id} />
              <Select name="courierId" defaultValue={s.courierId ?? ""} aria-label={t("courier")} className="min-w-0 flex-1">
                <option value="">{t("noCourier")}</option>
                {couriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              <SubmitButton variant="secondary">{t("assign")}</SubmitButton>
            </ActionForm>
          </Card>

          <Card title={t("cod")}>
            {s.codAmount === 0 ? (
              <p className="text-sm text-slate-500">{t("noCod")}</p>
            ) : (
              <>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-2xl font-bold tracking-tight text-ink-950 tabular-nums">{formatMDL(codPaid)}</span>
                  <span className="text-sm text-slate-500 tabular-nums">/ {formatMDL(s.codAmount)}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden>
                  <div className={cx("h-full origin-left animate-grow-x rounded-full", codNotDue ? "bg-slate-300" : codLeft ? "bg-accent-500" : "bg-emerald-500")} style={{ width: `${Math.min(100, (codPaid / s.codAmount) * 100)}%` }} />
                </div>
                <p className={cx("mt-2 text-[13px] font-medium", codNotDue ? "text-slate-600" : codLeft ? "text-amber-700" : "text-emerald-700")}>
                  {codNotDue ? t(codGone ? "codNone" : "codPaused") : codLeft ? `${t("codLeft")}: ${formatMDL(codLeft)}` : t("codDone")}
                </p>
                {s.codPayments.length > 0 && (
                  <ul className="mt-3 divide-y divide-slate-100 border-t border-slate-100 text-sm">
                    {s.codPayments.map((p) => (
                      <li key={p.id} className="py-2">
                        <div className="flex justify-between gap-2"><span className="font-medium">{tc(`method.${p.method}`)}</span><span className="font-semibold tabular-nums">{formatMDL(p.amount)}</span></div>
                        <div className="text-xs text-slate-500">{fmt(p.collectedAt)}{p.receiptNo && ` · ${t("receiptNo")} ${p.receiptNo}`}{p.courier && ` · ${p.courier.name}`}</div>
                        <PaymentFix shipmentId={s.id} payment={p} t={t} tc={tc} />
                      </li>
                    ))}
                  </ul>
                )}
                {codLeft > 0 && (
                  <ActionForm action={recordCodAction} className="mt-4 grid gap-3 border-t border-slate-100 pt-4">
                    <input type="hidden" name="id" value={s.id} />
                    <div className="grid grid-cols-2 gap-3">
                      <Field label={t("amount")}><Input name="amount" inputMode="decimal" required defaultValue={String(codLeft / 100)} /></Field>
                      <Field label={t("receiptNo")}><Input name="receiptNo" inputMode="numeric" autoComplete="off" /></Field>
                    </div>
                    <Field label={t("method")}>
                      <Select name="method" defaultValue="CASH_RECEIPT">
                        {METHODS.map((m) => <option key={m} value={m}>{tc(`method.${m}`)}</option>)}
                      </Select>
                    </Field>
                    <SubmitButton variant="secondary" className="w-full">{t("recordCod")}</SubmitButton>
                  </ActionForm>
                )}
              </>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
