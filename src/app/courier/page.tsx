import type { CSSProperties } from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Check, ChevronRight, Coffee, Package, PackageCheck, PackageOpen, TriangleAlert, Truck, Wallet, type LucideIcon } from "lucide-react";
import { requireUser, COURIER_APP_ROLES } from "@/lib/auth";
import { mapsUrl, type CourierSection } from "@/lib/courier";
import { loadCourierDay, type CourierStop, type RunMark } from "@/lib/courierDay";
import { getDesign } from "@/lib/design.server";
import { PROBLEM_STATUSES } from "@/lib/status";
import { formatKg, formatMDL } from "@/lib/money";
import { EmptyState, LinkButton, Tracking } from "@/components/ui";
import { CourierTop } from "./CourierTop";
import { DoneToast } from "./DoneToast";
import { HomeRefresh } from "./HomeRefresh";
import { CourierActions } from "./s/[id]/CourierActions";

const ROW_ICON: Record<CourierSection, LucideIcon> = { deliver: Truck, pickup: Package, withMe: PackageOpen, other: Package };
/** The wavy part of Expres' progress line; long enough for the widest phone, cut to the delivered share. */
const WAVE = "M2 7" + " q3 -6 6 0 t6 0".repeat(44);

export default async function CourierToday({ searchParams }: { searchParams: Promise<{ done?: string }> }) {
  const user = await requireUser(COURIER_APP_ROLES);
  const { done } = await searchParams;
  const [t, ts, tr, design, day] = await Promise.all([getTranslations("courier"), getTranslations("status"), getTranslations("reason"), getDesign(), loadCourierDay(user.id)]);
  const kind = design === "aer" ? "aer" : design === "expres" ? "expres" : "list";
  const { next, rest, delivered, total, left, cashHeld, codToCollect } = day;
  const complete = total > 0 && left === 0;
  const bad = (s: CourierStop) => PROBLEM_STATUSES.includes(s.status);

  const nextLabel = (s: CourierStop) =>
    s.status === "FAILED_ATTEMPT"
      ? [s.reason ? tr(s.reason) : ts(s.status), t("rowRetry")].join(" · ")
      : s.section === "deliver" ? t("nextDelivery") : s.section === "pickup" ? t("nextPickup") : `${t("nextStop")} · ${ts(s.status)}`;
  const rowTitle = (s: CourierStop) => (s.atPickup ? [s.name, s.address] : [s.locality, s.address ?? s.name]).filter(Boolean).join(", ");
  const rowSub = (s: CourierStop) =>
    (s.atPickup
      ? [t("rowPickup"), s.recipientLocality]
      : s.status === "FAILED_ATTEMPT"
        ? [s.reason ? tr(s.reason) : ts(s.status), t("rowRetry")]
        : [ts(s.status), s.reason && tr(s.reason), s.name, s.codLeft > 0 && formatMDL(s.codLeft)]
    ).filter(Boolean).join(" · ");

  return (
    <div className="cr-home" data-kind={kind}>
      {done && <DoneToast id={done} message={t("saved", { tracking: done })} />}
      <HomeRefresh seconds={45} />

      {kind === "aer" ? (
        <header className="cr-top cr-hello">
          <h1>{left > 0 ? t("stopsLeft", { count: left }) : t("navToday")}</h1>
          <p>{t("helloSub", { done: delivered.length, cash: formatMDL(cashHeld) })}</p>
        </header>
      ) : kind === "expres" ? (
        <header className="cr-top cr-figure">
          <h1 className="cr-big">
            <b>{delivered.length}</b>
            <span>{t("ofTotal", { total })}</span>
          </h1>
          <div className="cr-wave" style={{ "--p": total ? delivered.length / total : 0 } as CSSProperties} aria-hidden>
            <div className="cr-wave-on">
              <svg viewBox="0 0 530 14" width="530" height="14"><path d={WAVE} /></svg>
            </div>
          </div>
        </header>
      ) : (
        <CourierTop title={t("navToday")} count={t("progressShort", { done: delivered.length, total })}>
          <Run marks={day.marks} />
        </CourierTop>
      )}

      {next && (
        <section className="cr-block cr-next">
          <div className="cr-meta">
            <span>{nextLabel(next)}</span>
            <Tracking>{next.trackingNo}</Tracking>
          </div>
          <h2 className="cr-addr">
            <Link href={`/courier/s/${next.id}`}>{next.address ?? next.name}</Link>
          </h2>
          {next.locality && <div className="cr-city">{next.locality}</div>}
          {(next.address || next.phone) && (
            <div className="cr-person">
              {[next.address && next.name, next.phone].filter(Boolean).join(" · ")}
            </div>
          )}
          <div className="cr-facts">
            {next.codLeft > 0 && !next.atPickup && (
              <div className="cr-fact cr-pay">
                <span>{t("due")}</span>
                <b>{formatMDL(next.codLeft)}</b>
              </div>
            )}
            <div className="cr-fact">
              <span>{t("parcel")}</span>
              <b>{[t("pieces", { count: next.pieces }), next.weightGrams ? formatKg(next.weightGrams) : null, next.client].filter(Boolean).join(" · ")}</b>
            </div>
            {next.notes && (
              <div className="cr-fact cr-note">
                <span>{t("officeNote")}</span>
                <b>{next.notes}</b>
              </div>
            )}
          </div>
          {next.primary ? (
            <CourierActions
              key={next.id}
              placement="stop"
              id={next.id}
              next={next.next}
              primary={next.primary}
              codLeft={next.codLeft}
              recipientName={next.recipientName}
              phone={next.phone}
              mapHref={next.address ? mapsUrl([next.address, next.locality]) : null}
            />
          ) : (
            <LinkButton size="lg" className="cr-go" href={`/courier/s/${next.id}`}>{t("details")}</LinkButton>
          )}
        </section>
      )}

      {(rest.length > 0 || delivered.length > 0 || cashHeld > 0 || codToCollect > 0) && (
        <section className="cr-rest">
          {kind !== "list" && rest.length > 0 && <h3 className="cr-rest-title">{t("then")}</h3>}
          {rest.length > 0 && (
            <ol className="cr-list">
              {rest.map((s) => {
                const Icon = bad(s) ? TriangleAlert : ROW_ICON[s.section];
                return (
                  <li key={s.id}>
                    <Link href={`/courier/s/${s.id}`} className="cr-li cr-tap" data-bad={bad(s) || undefined}>
                      <Icon aria-hidden />
                      <div>
                        <b>{rowTitle(s)}</b>
                        <span>{rowSub(s)}</span>
                      </div>
                      <ChevronRight aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
          {delivered.length > 0 && (
            <details className="cr-fold">
              <summary className="cr-li cr-tap" data-done>
                <Check aria-hidden />
                <div><b>{t("deliveredCount", { count: delivered.length })}</b></div>
                <ChevronRight aria-hidden />
              </summary>
              <ol>
                {delivered.map((s) => (
                  <li key={s.id}>
                    <Link href={`/courier/s/${s.id}`} className="cr-li cr-tap">
                      <div>
                        <b>{[s.locality, s.address].filter(Boolean).join(", ")}</b>
                        <span>{s.name}</span>
                      </div>
                      <ChevronRight aria-hidden />
                    </Link>
                  </li>
                ))}
              </ol>
            </details>
          )}
          {(cashHeld > 0 || codToCollect > 0) && (
            <Link href="/courier/cash" className="cr-li cr-tap">
              <Wallet aria-hidden />
              <div>
                <b>{t("cashInHand")}: {formatMDL(cashHeld)}</b>
                {codToCollect > 0 && <span>{t("codToCollect", { amount: formatMDL(codToCollect) })}</span>}
              </div>
              <ChevronRight aria-hidden />
            </Link>
          )}
        </section>
      )}

      {!next &&
        (complete ? (
          <EmptyState icon={PackageCheck} title={t("doneTitle")} hint={t("doneHint")} action={cashHeld > 0 ? <LinkButton size="lg" variant="secondary" href="/courier/cash">{t("navCash")}</LinkButton> : undefined} />
        ) : (
          <EmptyState icon={Coffee} title={t("emptyTitle")} hint={t("emptyHint")} action={<LinkButton size="lg" href="/courier/scan">{t("scanTitle")}</LinkButton>} />
        ))}

      {next?.primary && <div className="cr-dock-space" aria-hidden />}
    </div>
  );
}

/** One mark per parcel: delivered, waiting for a retry, the stop in hand, still ahead. Each design draws it its own way. */
function Run({ marks }: { marks: RunMark[] }) {
  if (marks.length === 0) return null;
  return (
    <div className="cr-run" data-dense={marks.length > 16 || undefined} aria-hidden>
      <i />
      {marks.map((m, i) => (
        <i key={i} data-m={m || undefined} />
      ))}
    </div>
  );
}
