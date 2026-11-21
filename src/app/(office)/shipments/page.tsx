import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ChevronLeft, ChevronRight, Download, PackageSearch, Search, X } from "lucide-react";
import { db } from "@/lib/db";
import { ActionForm } from "@/components/ActionForm";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState, Input, LinkButton, PageHeader, Select, Table, Td, Th, Tracking, cx } from "@/components/ui";
import { bulkAction } from "@/app/actions/shipments";
import { STATUSES } from "@/lib/status";
import { formatKg, formatMDL } from "@/lib/money";
import { fmtDate } from "@/lib/dates";
import { shipmentWhere, statusWhere, TABS, type ShipmentFilters } from "@/lib/shipmentFilters";
import { BulkBar, SelectAll } from "./BulkBar";
import { FilterBar } from "./FilterBar";
import { RowLink } from "./RowLink";

type SP = ShipmentFilters;
const PAGE = 100;

export default async function ShipmentsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const t = await getTranslations("shipments");
  const ts = await getTranslations("status");
  const tc = await getTranslations("common");
  const tr = await getTranslations("reason");
  const locale = await getLocale();
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const w = shipmentWhere(sp);
  const current = sp.status || "ACTIVE";
  // Tab counts respect the other filters (client, courier, search, dates) but not the status.
  const base = shipmentWhere({ ...sp, status: "ALL" });
  const tabCounts = await Promise.all(TABS.map((tab) => db.shipment.count({ where: { AND: [base, statusWhere(tab)] } })));
  const [rows, total, clients, couriers] = await Promise.all([
    db.shipment.findMany({
      where: w,
      orderBy: { createdAt: "desc" },
      take: PAGE,
      skip: (page - 1) * PAGE,
      include: { client: { select: { name: true } }, courier: { select: { name: true } }, zone: { select: { nameRo: true } } },
    }),
    db.shipment.count({ where: w }),
    db.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.user.findMany({ where: { role: "COURIER", active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const clean = Object.fromEntries(Object.entries(sp).filter(([, v]) => typeof v === "string" && v)) as Record<string, string>;
  const qs = (over: Record<string, string>) => "?" + new URLSearchParams({ ...clean, ...over }).toString();
  const exportQs = new URLSearchParams(Object.entries(clean).filter(([k]) => k !== "page")).toString();
  const filtered = !!(sp.q || sp.client || sp.courier || sp.from || sp.to);
  const pages = Math.ceil(total / PAGE);

  return (
    <>
      <PageHeader
        title={t("title")}
        subtitle={t("count", { count: total })}
        actions={<LinkButton variant="secondary" href={`/api/export/shipments?${exportQs}`} prefetch={false}><Download className="h-4 w-4" aria-hidden /> {t("export")}</LinkButton>}
      />

      <nav className="no-print -mx-1 mb-4 flex gap-1 overflow-x-auto px-1 pb-1" aria-label={t("status")}>
        {TABS.map((tab, i) => {
          const on = current === tab;
          return (
            <Link
              key={tab}
              href={qs({ status: tab, page: "1" })}
              aria-current={on ? "page" : undefined}
              className={cx(
                "flex h-9 shrink-0 items-center gap-2 rounded-full px-3.5 text-sm transition-[background-color,color,box-shadow] duration-150",
                on ? "bg-ink-950 font-semibold text-white shadow-sm" : "font-medium text-slate-600 hover:bg-slate-900/5 hover:text-slate-900",
              )}
            >
              {t(`tab.${tab}`)}
              <span
                className={cx(
                  "rounded-full px-1.5 text-xs font-bold tabular-nums",
                  tab === "PROBLEMS" && tabCounts[i] > 0 ? "bg-red-500 text-white" : on ? "bg-white/15 text-white" : "bg-slate-900/5 text-slate-500",
                )}
              >
                {tabCounts[i]}
              </span>
            </Link>
          );
        })}
      </nav>

      <FilterBar action="/shipments" className="no-print mb-4 flex flex-wrap items-center gap-2">
        <label className="relative w-full sm:w-72">
          <span className="sr-only">{t("search")}</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <Input type="search" name="q" defaultValue={sp.q} placeholder={t("search")} enterKeyHint="search" autoComplete="off" className="w-full pl-9" />
        </label>
        <Select name="status" defaultValue={current} key={current} aria-label={t("status")} className="w-44">
          {TABS.map((tab) => <option key={tab} value={tab}>{t(`tab.${tab}`)}</option>)}
          {STATUSES.map((s) => <option key={s} value={s}>{ts(s)}</option>)}
        </Select>
        <Select name="client" defaultValue={sp.client ?? ""} aria-label={t("client")} className="w-44">
          <option value="">{t("allClients")}</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select name="courier" defaultValue={sp.courier ?? ""} aria-label={t("courier")} className="w-40">
          <option value="">{t("allCouriers")}</option>
          <option value="none">{t("noCourier")}</option>
          {couriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Input type="date" name="from" defaultValue={sp.from} aria-label={tc("from")} title={tc("from")} className="w-40" />
        <Input type="date" name="to" defaultValue={sp.to} aria-label={tc("to")} title={tc("to")} className="w-40" />
        {filtered && (
          <Link href={`?status=${current}`} className="inline-flex h-10 items-center gap-1 rounded-[10px] px-2.5 text-sm font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-900/5 hover:text-slate-900">
            <X className="h-4 w-4" aria-hidden /> {t("clearFilters")}
          </Link>
        )}
      </FilterBar>

      <ActionForm action={bulkAction}>
        <Table>
          <thead>
            <tr>
              <Th className="w-10 pr-0"><SelectAll label={t("selectAll")} /></Th>
              <Th>{t("tracking")}</Th>
              <Th>{t("recipient")}</Th>
              <Th>{t("client")}</Th>
              <Th className="hidden 2xl:table-cell">{t("zone")}</Th>
              <Th className="hidden text-right 2xl:table-cell">{t("weightKg")}</Th>
              <Th className="text-right">{t("codAmount")}</Th>
              <Th className="hidden whitespace-nowrap text-right xl:table-cell">{t("fee")}</Th>
              <Th>{t("courier")}</Th>
              <Th>{t("status")}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const address = [s.recipientLocality, s.recipientAddress].filter(Boolean).join(", ");
              return (
                <RowLink key={s.id} href={`/shipments/${s.id}`} className="cursor-pointer transition-colors duration-100 hover:bg-slate-50 has-[input:checked]:bg-brand-50/70">
                  <Td className="pr-0"><input type="checkbox" name="ids" value={s.id} aria-label={s.trackingNo} /></Td>
                  <Td>
                    <Link href={`/shipments/${s.id}`} className="text-brand-700 hover:text-brand-900 hover:underline"><Tracking>{s.trackingNo}</Tracking></Link>
                    <div className="mt-0.5 whitespace-nowrap text-xs text-slate-500">{fmtDate(s.createdAt, locale)}{s.source === "SHEET" ? " · Sheets" : ""}</div>
                  </Td>
                  <Td>
                    <div className="font-semibold text-slate-900">{s.recipientName}</div>
                    <div className="whitespace-nowrap text-xs text-slate-600">{s.recipientPhone}</div>
                    <div className="max-w-[16rem] truncate text-xs text-slate-500" title={address}>{address}</div>
                    {!s.zone && <div className="mt-0.5 text-xs font-semibold text-red-600 2xl:hidden">{t("noZone")}</div>}
                  </Td>
                  <Td className="max-w-[10rem] truncate text-slate-700" >{s.client.name}</Td>
                  <Td className="hidden text-[13px] text-slate-600 2xl:table-cell">{s.zone?.nameRo ?? <span className="font-semibold text-red-600">{t("noZone")}</span>}</Td>
                  <Td className="hidden whitespace-nowrap text-right text-[13px] text-slate-600 2xl:table-cell">{s.weightGrams ? formatKg(s.weightGrams) : "—"}</Td>
                  <Td className={cx("whitespace-nowrap text-right", s.codAmount ? "font-semibold text-slate-900" : "text-slate-400")}>{s.codAmount ? formatMDL(s.codAmount) : "—"}</Td>
                  <Td className="hidden whitespace-nowrap text-right text-slate-600 xl:table-cell">{formatMDL(s.deliveryFee)}</Td>
                  <Td className={cx("text-[13px]", s.courier ? "text-slate-700" : "text-slate-400")}>{s.courier?.name ?? "—"}</Td>
                  <Td><StatusBadge status={s.status} />{s.statusReason && <div className="mt-1 text-xs text-slate-500">{tr(s.statusReason)}</div>}</Td>
                </RowLink>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <Td colSpan={10}>
                  <EmptyState icon={PackageSearch} title={t("emptyTitle")} hint={t("emptyHint")} action={<LinkButton href="/shipments/new">{t("new")}</LinkButton>} />
                </Td>
              </tr>
            )}
          </tbody>
        </Table>
        <BulkBar couriers={couriers} />
      </ActionForm>

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-end gap-2 text-sm">
          {page > 1 && <LinkButton variant="secondary" size="sm" href={qs({ page: String(page - 1) })} aria-label={t("prevPage")}><ChevronLeft className="h-4 w-4" aria-hidden /></LinkButton>}
          <span className="px-1 font-medium tabular-nums text-slate-600">{page} / {pages}</span>
          {page < pages && <LinkButton variant="secondary" size="sm" href={qs({ page: String(page + 1) })} aria-label={t("nextPage")}><ChevronRight className="h-4 w-4" aria-hidden /></LinkButton>}
        </div>
      )}
    </>
  );
}
