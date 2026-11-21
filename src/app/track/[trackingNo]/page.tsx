import { getLocale, getTranslations } from "next-intl/server";
import { CalendarClock, ClipboardCheck, PackageCheck, PackageX, PauseCircle, PhoneMissed, Truck, Undo2, Warehouse, XCircle, type LucideIcon } from "lucide-react";
import type { ShipmentStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { fmtDateTime, fmtDayShort } from "@/lib/dates";
import { STATUS_DOT } from "@/lib/status";
import { PUBLIC_STEPS, publicStep } from "@/lib/tracking-public";
import { RouteLine, type RouteStop } from "@/components/RouteLine";
import { EmptyState, Tracking, cx } from "@/components/ui";
import { TrackForm } from "../TrackForm";

const ICON: Record<ShipmentStatus, LucideIcon> = {
  NEW: ClipboardCheck, CONFIRMED: ClipboardCheck, PICKED_UP: PackageCheck, AT_WAREHOUSE: Warehouse, OUT_FOR_DELIVERY: Truck, DELIVERED: PackageCheck,
  FAILED_ATTEMPT: PhoneMissed, POSTPONED: CalendarClock, ON_HOLD: PauseCircle, REFUSED: Undo2, RETURNING: Undo2, RETURNED: Undo2, CANCELLED: XCircle,
};

/**
 * Public page (no login) opened from the QR code on the label.
 * Tracking numbers are sequential, so it shows no name, phone or street — only status, dates, locality and sender.
 */
export default async function TrackPage({ params }: { params: Promise<{ trackingNo: string }> }) {
  const trackingNo = decodeURIComponent((await params).trackingNo).toUpperCase();
  const t = await getTranslations("track");
  const ts = await getTranslations("status");
  const locale = await getLocale();
  const s = await db.shipment.findUnique({
    where: { trackingNo },
    select: {
      trackingNo: true, status: true, recipientLocality: true, desiredDate: true, deliveredAt: true, createdAt: true,
      client: { select: { name: true } },
      events: { orderBy: { createdAt: "desc" }, select: { toStatus: true, createdAt: true } },
    },
  });

  if (!s) {
    return (
      <div className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-slate-900/5">
        <EmptyState icon={PackageX} title={t("notFoundTitle")} hint={t("notFound", { tracking: trackingNo })} className="py-8" />
        <TrackForm defaultValue={trackingNo} />
      </div>
    );
  }

  const step = publicStep(s.status);
  const delivered = s.status === "DELIVERED";
  const exception = step === -1 || s.status === "FAILED_ATTEMPT" || s.status === "POSTPONED" || s.status === "ON_HOLD";
  const Icon = ICON[s.status];
  const stops: RouteStop[] = PUBLIC_STEPS.map((k, i) => ({
    key: k,
    label: t(`step.${k}`),
    state: i > step ? "todo" : i < step || delivered ? "done" : "current",
    color: delivered ? "bg-emerald-500" : i === step ? STATUS_DOT[s.status] : "bg-brand-500",
  }));
  const updated = s.events[0]?.createdAt ?? s.createdAt;

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-3xl bg-white shadow-raised ring-1 ring-slate-900/5">
        <div className="brand-panel px-5 pb-6 pt-5 sm:px-7">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <Tracking className="!text-sm opacity-80">{s.trackingNo}</Tracking>
            <span className="text-xs opacity-60">{t("updated")}: {fmtDateTime(updated, locale)}</span>
          </div>
          <div className="mt-5 flex items-center gap-4">
            <div className={cx("relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-white", STATUS_DOT[s.status])}>
              {delivered ? (
                <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M5 12.5l4.5 4.5L19 7.5" pathLength={1} strokeDasharray="1" className="animate-draw [--draw-length:1] [animation-delay:350ms] [animation-duration:520ms]" />
                </svg>
              ) : (
                <Icon className={cx("h-7 w-7", s.status === "OUT_FOR_DELIVERY" && "text-ink-950")} aria-hidden />
              )}
            </div>
            <h1 className="text-[28px] font-bold leading-tight tracking-tight">{ts(s.status)}</h1>
          </div>
          <p className="mt-4 text-[15px] leading-relaxed opacity-80">{t(`explain.${s.status}`)}</p>
        </div>

        {step >= 0 && <div className="px-2 pt-5 sm:px-5"><RouteLine stops={stops} size="lg" line={delivered ? "bg-emerald-500" : undefined} /></div>}
        {exception && !delivered && <div className="mx-5 mt-5 rounded-2xl bg-accent-100 px-4 py-3 text-sm font-medium text-amber-900 sm:mx-7">{t("contactUs")}</div>}

        <dl className="mt-5 divide-y divide-slate-100 border-t border-slate-100 px-5 text-[15px] sm:px-7">
          <div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">{t("from")}</dt><dd className="text-right font-semibold text-slate-900">{s.client.name}</dd></div>
          {s.recipientLocality && <div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">{t("to")}</dt><dd className="text-right font-semibold text-slate-900">{s.recipientLocality}</dd></div>}
          {s.deliveredAt ? (
            <div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">{t("deliveredAt")}</dt><dd className="text-right font-semibold text-slate-900">{fmtDateTime(s.deliveredAt, locale)}</dd></div>
          ) : s.desiredDate ? (
            <div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">{t("planned")}</dt><dd className="text-right font-semibold text-slate-900">{fmtDayShort(s.desiredDate, locale)}</dd></div>
          ) : null}
        </dl>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-slate-900/5 sm:px-7">
        <h2 className="mb-4 text-[15px] font-semibold text-slate-900">{t("history")}</h2>
        <ol className="relative space-y-4 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-0.5 before:rounded-full before:bg-slate-100">
          {s.events.map((e, i) => (
            <li key={i} className="relative flex gap-3.5">
              <span className={cx("relative z-10 mt-1 h-4 w-4 shrink-0 rounded-full ring-4 ring-white", i === 0 ? STATUS_DOT[e.toStatus] : "border-[3px] border-slate-300 bg-white")} aria-hidden />
              <div>
                <div className={cx("text-[15px]", i === 0 ? "font-semibold text-slate-900" : "text-slate-700")}>{ts(e.toStatus)}</div>
                <div className="text-[13px] text-slate-500">{fmtDateTime(e.createdAt, locale)}</div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="pt-2">
        <h2 className="mb-2 px-1 text-sm font-medium text-slate-500">{t("another")}</h2>
        <TrackForm />
      </section>
    </div>
  );
}
