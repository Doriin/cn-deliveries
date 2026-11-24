import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Navigation, Phone } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser, COURIER_APP_ROLES } from "@/lib/auth";
import { claimShipment } from "@/app/actions/courier";
import { courierNextStatuses, courierPrimaryStatus, courierSection, mapsUrl } from "@/lib/courier";
import { codDue, FINAL_STATUSES, STATUS_TONE } from "@/lib/status";
import { formatKg, formatMDL } from "@/lib/money";
import { fmtDate, fmtDateTime } from "@/lib/dates";
import { StatusBadge } from "@/components/StatusBadge";
import { SubmitButton } from "@/components/SubmitButton";
import { Tracking, btnClass, cx } from "@/components/ui";
import { CourierTop } from "../../CourierTop";
import { CourierActions } from "./CourierActions";

function Place({ label, address, locality, name, phone, callLabel, mapLabel }: { label?: string; address: string | null; locality?: string | null; name: string; phone: string | null; callLabel: string; mapLabel: string }) {
  return (
    <div className="cr-place">
      {label && <div className="cr-place-label">{label}</div>}
      <h2 className="cr-addr">{address ?? name}</h2>
      {locality && <div className="cr-city">{locality}</div>}
      {(address || phone) && <div className="cr-person">{[address && name, phone].filter(Boolean).join(" · ")}</div>}
      {(phone || address) && (
        <div className="cr-quick">
          {phone && <a href={`tel:${phone.replace(/\s/g, "")}`} className={cx(btnClass("secondary", "lg"), "cr-qbtn")}><Phone aria-hidden /><span>{callLabel}</span></a>}
          {address && <a href={mapsUrl([address, locality])} target="_blank" rel="noreferrer" className={cx(btnClass("secondary", "lg"), "cr-qbtn")}><Navigation aria-hidden /><span>{mapLabel}</span></a>}
        </div>
      )}
    </div>
  );
}

export default async function CourierParcel({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(COURIER_APP_ROLES);
  const { id } = await params;
  const t = await getTranslations("courier");
  const ts = await getTranslations("status");
  const tr = await getTranslations("reason");
  const locale = await getLocale();
  const s = await db.shipment.findUnique({
    where: { id },
    include: { client: true, courier: { select: { name: true } }, codPayments: true, events: { where: { undoneAt: null }, orderBy: { createdAt: "desc" }, take: 5 } },
  });
  if (!s) notFound();
  const mine = s.courierId === user.id;
  const closed = FINAL_STATUSES.includes(s.status);
  const codLeft = codDue(s.status, s.codAmount, s.codPayments.reduce((a, p) => a + p.amount, 0));
  const pickupAddress = s.senderAddress ?? s.client.address;
  const atPickup = courierSection(s.status) === "pickup";
  const next = courierNextStatuses(s.status);
  const due = codLeft > 0 && !closed;

  return (
    <div className="cr-page">
      <CourierTop back="/courier" backLabel={t("back")} title={<Tracking>{s.trackingNo}</Tracking>} />

      <section className="cr-block">
        <div className="cr-meta">
          <StatusBadge status={s.status} size="md" />
          {s.statusReason && <span>{tr(s.statusReason)}</span>}
        </div>
        {atPickup && (
          <>
            <Place label={t("pickup")} address={pickupAddress} name={s.senderName ?? s.client.name} phone={s.senderPhone ?? s.client.phone} callLabel={t("call")} mapLabel={t("map")} />
            <hr className="cr-rule" />
          </>
        )}
        <Place label={atPickup ? t("delivery") : undefined} address={s.recipientAddress} locality={s.recipientLocality} name={s.recipientName} phone={s.recipientPhone} callLabel={t("call")} mapLabel={t("map")} />
        {(due || s.notes) && (
          <div className="cr-facts">
            {due && (
              <div className="cr-fact cr-pay">
                <span>{t("due")}</span>
                <b>{formatMDL(codLeft)}</b>
              </div>
            )}
            {s.notes && (
              <div className="cr-fact cr-note">
                <span>{t("officeNote")}</span>
                <b>{s.notes}</b>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="cr-sec">
        <h2 className="cr-sec-title">{t("details")}</h2>
        <dl className="cr-dl">
          <dt>{t("client")}</dt><dd>{s.client.name}</dd>
          {pickupAddress && !atPickup && <><dt>{t("pickup")}</dt><dd>{pickupAddress}</dd></>}
          <dt>{t("parcel")}</dt>
          <dd>{s.pieces} × {s.weightGrams ? formatKg(s.weightGrams) : "—"}{s.contents ? ` · ${s.contents}` : ""}</dd>
          {s.desiredDate && <><dt>{t("date")}</dt><dd>{fmtDate(s.desiredDate, locale)}</dd></>}
        </dl>
      </section>

      <section className="cr-sec">
        <h2 className="cr-sec-title">{t("history")}</h2>
        <ol className="cr-hist">
          {s.events.map((e) => (
            <li key={e.id} data-tone={STATUS_TONE[e.toStatus]}>
              <b>{ts(e.toStatus)}{e.reason && <span> · {tr(e.reason)}</span>}</b>
              <time>{fmtDateTime(e.createdAt, locale)}</time>
            </li>
          ))}
        </ol>
      </section>

      {mine ? (
        next.length > 0 ? (
          <>
            <div className="cr-bar-space" aria-hidden />
            <CourierActions id={s.id} next={next} primary={courierPrimaryStatus(s.status)!} codLeft={codLeft} recipientName={s.recipientName} />
          </>
        ) : (
          <p className="cr-closed">{t("nothingToDo")}</p>
        )
      ) : closed ? null : (
        <form action={claimShipment} className="cr-sec cr-claim">
          <input type="hidden" name="id" value={s.id} />
          <p>{s.courier ? t("assignedTo", { name: s.courier.name }) : t("unassigned")}</p>
          <SubmitButton size="lg" className="cr-go">{t("takeParcel")}</SubmitButton>
        </form>
      )}
    </div>
  );
}
