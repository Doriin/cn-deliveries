import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ChevronRight, HandCoins, Wallet } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser, COURIER_APP_ROLES } from "@/lib/auth";
import { CASH_METHODS } from "@/lib/courier";
import { formatMDL } from "@/lib/money";
import { fmtDateTime } from "@/lib/dates";
import { AutoRefresh } from "@/components/AutoRefresh";
import { EmptyState, Tracking } from "@/components/ui";
import { CourierTop } from "../CourierTop";

export default async function CashPage() {
  const user = await requireUser(COURIER_APP_ROLES);
  const t = await getTranslations("courier");
  const tc = await getTranslations("common");
  const locale = await getLocale();
  const [open, other, handovers] = await Promise.all([
    db.codPayment.findMany({
      where: { courierId: user.id, handoverId: null, method: { in: [...CASH_METHODS] } },
      include: { shipment: { select: { id: true, trackingNo: true, recipientName: true } } },
      orderBy: { collectedAt: "desc" },
    }),
    db.codPayment.findMany({
      where: { courierId: user.id, method: { notIn: [...CASH_METHODS] }, collectedAt: { gte: new Date(Date.now() - 7 * 864e5) } },
      include: { shipment: { select: { id: true, trackingNo: true, recipientName: true } } },
      orderBy: { collectedAt: "desc" },
    }),
    db.cashHandover.findMany({ where: { courierId: user.id }, orderBy: { createdAt: "desc" }, take: 10, include: { receivedBy: { select: { name: true } } } }),
  ]);
  const total = open.reduce((a, p) => a + p.amount, 0);

  return (
    <div className="cr-page">
      <AutoRefresh seconds={45} />
      <CourierTop title={t("navCash")} />

      <section className="cr-block cr-cash">
        <div className="cr-meta"><span>{t("cashInHand")}</span></div>
        <div className="cr-cash-sum">{formatMDL(total)}</div>
        <p className="cr-hint">{t("cashHint")}</p>
      </section>

      <section className="cr-sec">
        <h2 className="cr-sec-title">{t("cashPayments")}</h2>
        {open.length === 0 ? (
          <EmptyState icon={Wallet} title={t("cashEmpty")} className="!py-8" />
        ) : (
          <ul className="cr-rows">
            {open.map((p) => (
              <li key={p.id}>
                <Link href={`/courier/s/${p.shipment.id}`} className="cr-li cr-tap">
                  <div>
                    <b>{p.shipment.recipientName}</b>
                    <span><Tracking>{p.shipment.trackingNo}</Tracking> · {tc(`method.${p.method}`)}{p.receiptNo && ` · ${p.receiptNo}`}</span>
                  </div>
                  <em>{formatMDL(p.amount)}</em>
                  <ChevronRight aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {other.length > 0 && (
        <section className="cr-sec">
          <h2 className="cr-sec-title">{t("cardPayments")}</h2>
          <ul className="cr-rows">
            {other.map((p) => (
              <li key={p.id} className="cr-li">
                <div>
                  <b>{p.shipment.recipientName}</b>
                  <span><Tracking>{p.shipment.trackingNo}</Tracking> · {tc(`method.${p.method}`)}</span>
                </div>
                <em>{formatMDL(p.amount)}</em>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="cr-sec">
        <h2 className="cr-sec-title">{t("handovers")}</h2>
        {handovers.length === 0 ? (
          <EmptyState icon={HandCoins} title={t("handoversEmpty")} className="!py-8" />
        ) : (
          <ul className="cr-rows">
            {handovers.map((h) => (
              <li key={h.id} className="cr-li" data-done>
                <div>
                  <b>{fmtDateTime(h.createdAt, locale)}</b>
                  <span>{t("receivedByOffice", { name: h.receivedBy.name })}</span>
                </div>
                <em>{formatMDL(h.amount)}</em>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
