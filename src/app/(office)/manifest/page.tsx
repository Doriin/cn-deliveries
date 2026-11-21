import { getLocale, getTranslations } from "next-intl/server";
import { ClipboardList, PackageOpen } from "lucide-react";
import { db } from "@/lib/db";
import { FINAL_STATUSES } from "@/lib/status";
import { dayBounds, fmtDate, isDay, todayMD } from "@/lib/dates";
import { formatMDL } from "@/lib/money";
import { PrintButton } from "@/components/PrintButton";
import { AutoForm } from "@/components/office/AutoForm";
import { Card, EmptyState, Input, PageHeader, Select, Tracking } from "@/components/ui";

const TH = "border-b-2 border-slate-900 px-2 py-2 text-left text-xs font-bold text-slate-900";
const TD = "border-b border-slate-300 px-2 py-2.5 align-top";

export default async function ManifestPage({ searchParams }: { searchParams: Promise<{ courier?: string; date?: string }> }) {
  const sp = await searchParams;
  const t = await getTranslations("manifest");
  const ts = await getTranslations("shipments");
  const tc = await getTranslations("common");
  const locale = await getLocale();
  const day = isDay(sp.date) ? sp.date : todayMD();
  const couriers = await db.user.findMany({ where: { role: "COURIER", active: true }, orderBy: { name: "asc" } });
  const courier = couriers.find((c) => c.id === sp.courier);
  const rows = courier
    ? await db.shipment.findMany({
        where: {
          courierId: courier.id,
          status: { notIn: FINAL_STATUSES },
          OR: [{ desiredDate: null }, { desiredDate: { lt: dayBounds(day).end } }],
        },
        include: { client: { select: { name: true } } },
        orderBy: [{ recipientLocality: "asc" }, { recipientAddress: "asc" }],
      })
    : [];
  const totalCod = rows.reduce((a, s) => a + s.codAmount, 0);
  const dayLabel = fmtDate(new Date(`${day}T12:00:00Z`), locale);
  return (
    <>
      <div className="no-print">
        <PageHeader title={t("title")} subtitle={t("subtitle")} actions={courier && rows.length > 0 && <PrintButton label={tc("print")} />} />
        <AutoForm className="mb-6 flex flex-wrap items-center gap-2">
          <Select name="courier" defaultValue={sp.courier ?? ""} className="w-60" aria-label={ts("courier")}>
            <option value="">{t("allCouriers")}</option>
            {couriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Input type="date" name="date" defaultValue={day} className="w-44" aria-label={t("date")} title={t("date")} />
        </AutoForm>
      </div>

      {!courier ? (
        <Card className="no-print"><EmptyState icon={ClipboardList} title={t("chooseCourier")} hint={t("chooseHint")} /></Card>
      ) : rows.length === 0 ? (
        <Card className="no-print"><EmptyState icon={PackageOpen} title={t("noParcels")} hint={t("noParcelsHint")} /></Card>
      ) : (
        // The sheet is drawn in plain black on white so it prints the same on any office printer.
        <div className="rounded-2xl bg-white p-6 text-slate-900 shadow-card ring-1 ring-slate-900/5 sm:p-8 print:rounded-none print:p-0 print:shadow-none print:ring-0">
          <div className="mb-5 flex items-end justify-between gap-4 border-b-2 border-slate-900 pb-3">
            <div>
              <h2 className="text-xl font-bold tracking-tight">{t("heading", { courier: courier.name, date: dayLabel })}</h2>
              <div className="mt-0.5 text-sm text-slate-700">{t("summary", { count: rows.length, cod: formatMDL(totalCod) })}</div>
            </div>
            <div className="text-right text-sm font-extrabold tracking-tight">CN Deliveries</div>
          </div>
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full min-w-[720px] border-collapse text-sm print:min-w-0">
              <thead>
                <tr>
                  <th className={TH + " w-8"}>#</th>
                  <th className={TH}>{ts("tracking")}</th>
                  <th className={TH}>{ts("recipient")}</th>
                  <th className={TH}>{ts("address")}</th>
                  <th className={TH + " text-right"}>{ts("codAmount")}</th>
                  <th className={TH}>{tc("notes")}</th>
                  <th className={TH + " w-32"}>{t("signature")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s, i) => (
                  <tr key={s.id} className="break-inside-avoid">
                    <td className={TD + " tabular-nums text-slate-600"}>{i + 1}</td>
                    <td className={TD}><Tracking className="text-xs">{s.trackingNo}</Tracking><div className="text-xs text-slate-600">{s.client.name}</div></td>
                    <td className={TD}>{s.recipientName}<div className="whitespace-nowrap font-semibold tabular-nums">{s.recipientPhone}</div></td>
                    <td className={TD}>{s.recipientAddress}{s.recipientLocality && <div className="text-slate-600">{s.recipientLocality}</div>}</td>
                    <td className={TD + " whitespace-nowrap text-right font-semibold tabular-nums"}>{s.codAmount ? formatMDL(s.codAmount) : "—"}</td>
                    <td className={TD + " text-xs"}>{s.notes}</td>
                    <td className={TD} />
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className="px-2 py-3 text-right text-sm font-bold">{t("total")}</td>
                  <td className="whitespace-nowrap px-2 py-3 text-right text-base font-bold tabular-nums">{formatMDL(totalCod)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-10 text-xs text-slate-700">
            <div className="border-t border-slate-900 pt-1.5">{t("officeSignature")}</div>
            <div className="border-t border-slate-900 pt-1.5">{t("courierSignature")}</div>
          </div>
        </div>
      )}
    </>
  );
}
