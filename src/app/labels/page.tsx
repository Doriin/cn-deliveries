import { getTranslations } from "next-intl/server";
import { fmtDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { requireUser, OFFICE_ROLES } from "@/lib/auth";
import { barcodeSvg, qrSvg } from "@/lib/labels";
import { formatKg, formatMDL } from "@/lib/money";
import { ArrowLeft, Tag } from "lucide-react";
import { PrintButton } from "@/components/PrintButton";
import { EmptyState, LinkButton } from "@/components/ui";
import { headers } from "next/headers";

export default async function LabelsPage({ searchParams }: { searchParams: Promise<{ ids?: string | string[] }> }) {
  await requireUser(OFFICE_ROLES);
  const sp = await searchParams;
  const ids = ([] as string[]).concat(sp.ids ?? []).flatMap((s) => s.split(",")).filter(Boolean);
  const t = await getTranslations("labels");
  const rows = await db.shipment.findMany({ where: { id: { in: ids } }, include: { client: true, zone: true }, orderBy: { trackingNo: "asc" } });
  // QR codes point to this TMS's public tracking page. Set PUBLIC_URL to the real domain in production.
  const h = await headers();
  const base = process.env.PUBLIC_URL || `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  return (
    <div className="min-h-dvh bg-slate-200 pb-10 print:min-h-0 print:bg-white print:pb-0">
      <style>{`@page { size: 100mm 150mm; margin: 0; } @media print { .label { break-after: page; box-shadow: none !important; margin: 0 !important; } }`}</style>
      <div className="no-print sticky top-0 z-10 mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-900/10 bg-white/90 px-4 py-3 backdrop-blur-md sm:px-6">
        <LinkButton variant="ghost" href="/shipments" className="-ml-2"><ArrowLeft className="h-4 w-4" aria-hidden />{t("back")}</LinkButton>
        <span className="flex-1 text-sm text-slate-600">{rows.length > 0 && t("hint")}</span>
        {rows.length > 0 && <PrintButton label={t("print", { count: rows.length })} auto />}
      </div>
      {rows.length === 0 && (
        <div className="no-print mx-auto max-w-md rounded-2xl bg-white shadow-card ring-1 ring-slate-900/5">
          <EmptyState icon={Tag} title={t("empty")} hint={t("emptyHint")} />
        </div>
      )}
      {rows.map((s) => (
        <div key={s.id} className="label mx-auto mb-6 flex h-[150mm] w-[100mm] flex-col overflow-hidden bg-white p-[5mm] text-[10pt] leading-snug text-black shadow-lg">
          <div className="flex items-center justify-between border-b-2 border-black pb-1.5">
            <div className="flex items-center gap-[2mm] text-[14pt] font-extrabold leading-none tracking-tight">
              {/* The parcel mark in plain black lines, so it prints cleanly on a thermal label. */}
              <svg viewBox="0 0 32 32" className="h-[7mm] w-[7mm]" fill="none" stroke="#000" strokeWidth="2.2" strokeLinejoin="round" aria-hidden>
                <path d="M16 4 27 10.5V21.5L16 28 5 21.5V10.5Z" />
                <path d="M5 10.5 16 17 27 10.5M16 17V28" />
                <path d="M10.5 7.3 21.5 13.8V18" />
              </svg>
              CN DELIVERIES
            </div>
            <div className="text-right text-[8pt]">{[process.env.COMPANY_PHONE, "cn-deliveries.com"].filter(Boolean).join(" · ")}</div>
          </div>
          <div className="mt-2 flex items-start justify-between gap-2">
            <div>
              <div className="font-mono text-[13pt] font-bold">{s.trackingNo}</div>
              <div className="text-[8pt]">{fmtDate(s.createdAt)} · {s.zone?.nameRo ?? "—"}</div>
            </div>
            <div className="h-[24mm] w-[24mm] shrink-0" dangerouslySetInnerHTML={{ __html: qrSvg(`${base}/track/${s.trackingNo}`) }} />
          </div>
          <div className="mt-1 h-[14mm] w-full [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: barcodeSvg(s.trackingNo) }} />
          <div className="mt-2 border-t border-black pt-1.5">
            <div className="text-[7pt] font-bold uppercase tracking-wide">{t("to")}</div>
            <div className="text-[15pt] font-bold leading-tight">{s.recipientName}</div>
            <div className="text-[13pt] font-semibold">{s.recipientPhone}</div>
            <div className="mt-[1mm] text-[11.5pt] leading-snug">{s.recipientAddress}</div>
            {s.recipientLocality && <div className="mt-[1mm] text-[15pt] font-extrabold uppercase leading-tight tracking-tight">{s.recipientLocality}</div>}
          </div>
          <div className="mt-2 border-t border-black pt-1.5 text-[8.5pt]">
            <div className="text-[7pt] font-bold uppercase tracking-wide">{t("from")}</div>
            <div>{s.senderName ?? s.client.name}{(s.senderPhone ?? s.client.phone) && ` · ${s.senderPhone ?? s.client.phone}`}</div>
          </div>
          <div className="mt-auto grid grid-cols-3 gap-1 border-t-2 border-black pt-1.5 text-center">
            <div><div className="text-[7pt] uppercase">{t("weight")}</div><div className="font-bold">{s.weightGrams ? formatKg(s.weightGrams) : "—"}</div></div>
            <div><div className="text-[7pt] uppercase">{t("pieces")}</div><div className="font-bold">{s.pieces}</div></div>
            <div className={s.codAmount ? "bg-black text-white" : ""}><div className="text-[7pt] uppercase">{t("cod")}</div><div className="font-bold">{s.codAmount ? formatMDL(s.codAmount) : "0"}</div></div>
          </div>
          {s.notes && <div className="mt-1 truncate text-[8pt]">{s.notes}</div>}
        </div>
      ))}
    </div>
  );
}
