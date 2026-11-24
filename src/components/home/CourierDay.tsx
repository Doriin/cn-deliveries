import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, Banknote, ChevronLeft, ChevronRight, CircleCheck, CircleX, Clock, MapPin, PackageCheck, Phone, StickyNote, Undo2 } from "lucide-react";
import type { CourierRoute, RouteStep } from "@/lib/courierRoute";
import { dayLinePos, LINE_FROM, LINE_TO } from "@/lib/courierRoute";
import type { CourierStop } from "@/lib/courierDay";
import { fmtDayLong } from "@/lib/dates";
import { btnClass, LinkButton } from "@/components/ui";
import { ReceiveCash } from "@/components/day/shared";
import { DayStrip } from "./charts";
import { Tips } from "./Tips";
import { formats } from "./format";

type T = Awaited<ReturnType<typeof getTranslations>>;

const STEP_ICON = { ok: CircleCheck, bad: CircleX, pick: PackageCheck, other: Undo2 } as const;

/** A courier's day for the office: header, figures, the day on a line, then every stop in order. */
export async function CourierDay({ route: r }: { route: CourierRoute }) {
  const [t, ts, tr, tc, locale] = await Promise.all([getTranslations("home"), getTranslations("status"), getTranslations("reason"), getTranslations("common"), getLocale()]);
  const f = formats(locale);
  const date = new Date(`${r.day}T12:00:00Z`);
  const s = r.stats;
  const planned = s.delivered + s.failed + s.left;
  const stops = [r.next, ...r.rest].filter((x): x is CourierStop => !!x);
  const tel = r.courier.phone?.replace(/\s/g, "");
  const reason = (x: { reason: string | null }) => (x.reason && tr.has(x.reason) ? tr(x.reason) : null);

  return (
    <>
      <Link href="/" className="hm-back"><ArrowLeft size={15} aria-hidden />{t("backToToday")}</Link>
      <header className="hm-head hm-person">
        <span className="ava" aria-hidden>{r.courier.initials}</span>
        <div className="who">
          <h1>{r.courier.name}</h1>
          <p>
            <span className="pill" data-state={r.state}>{t(`state.${r.state}`)}</span>
            {r.startedAt && <span>{t("startedAt", { time: f.clock(r.startedAt) })}</span>}
            {r.lastAt && <span>{t("lastAction", { time: f.clock(r.lastAt) })}</span>}
          </p>
        </div>
        <div className="acts">
          {tel && <a className={btnClass("secondary")} href={`tel:${tel}`}><Phone size={15} aria-hidden />{t("call")}</a>}
          {r.isToday && s.cashHeld > 0 && <ReceiveCash courier={{ id: r.courier.id, cash: s.cashHeld }} variant="primary">{t("receiveAmount", { amount: f.mdl(s.cashHeld) })}</ReceiveCash>}
        </div>
      </header>

      <nav className="hm-daynav" aria-label={t("pickDay")}>
        <Link href={`/couriers/${r.courier.id}?d=${r.prevDay}`} className={btnClass("ghost", "sm")} aria-label={t("prevDay")}><ChevronLeft size={16} aria-hidden /></Link>
        <b>{r.isToday ? t("today") : fmtDayLong(date, locale)}</b>
        {r.nextDay ? (
          <>
            <Link href={`/couriers/${r.courier.id}${r.nextDay === r.today ? "" : `?d=${r.nextDay}`}`} className={btnClass("ghost", "sm")} aria-label={t("nextDay")}><ChevronRight size={16} aria-hidden /></Link>
            <LinkButton href={`/couriers/${r.courier.id}`} variant="secondary" size="sm">{t("today")}</LinkButton>
          </>
        ) : null}
      </nav>

      <div className="hm-kpis hm-route-kpis">
        <Figure label={t("fig.delivered")} value={r.isToday ? `${s.delivered} / ${planned}` : f.int(s.delivered)} />
        <Figure label={t("fig.failed")} value={f.int(s.failed)} tone={s.failed ? "bad" : undefined} />
        <Figure label={t("fig.pickups")} value={r.isToday ? `${s.pickedUp} / ${s.pickedUp + s.pickupsLeft}` : f.int(s.pickedUp)} />
        {r.isToday && <Figure label={t("fig.left")} value={f.int(s.left)} />}
        <Figure label={t("fig.cashCollected")} value={f.mdl(s.cashCollected)} />
        {r.isToday && <Figure label={t("fig.cashHeld")} value={f.mdl(s.cashHeld)} tone={s.cashHeld ? "pay" : undefined} />}
        {r.isToday && <Figure label={t("fig.toCollect")} value={f.mdl(s.codToCollect)} />}
      </div>

      <Tips>
        <article className="hm-card">
          <h2 className="hm-h">{t("dayLine")}<span>{t("dayLineHint")}</span></h2>
          <DayStrip
            label={t("dayLine")}
            from={LINE_FROM}
            to={LINE_TO}
            nowPos={r.nowPos}
            marks={r.steps.map((x) => ({ key: x.id, pos: dayLinePos(x.at, r.day), tone: x.tone, tip: `${f.clock(x.at)} · ${ts(x.status)}\n${[x.locality, x.address].filter(Boolean).join(", ")}\n${x.name}` }))}
          />
        </article>
      </Tips>

      <div className={r.isToday ? "hm-grid hm-grid-route" : "hm-grid"}>
        <section className="hm-card hm-steps" aria-labelledby="hm-done">
          <h2 id="hm-done" className="hm-h">{t("doneTitle")}<span className="hm-count">{r.steps.length}</span></h2>
          {r.steps.length === 0 ? <p className="hm-empty">{r.isToday ? t("notStarted") : t("nothingThatDay")}</p> : (
            <ol>{r.steps.map((x) => <Step key={x.id} x={x} t={t} ts={ts} reason={reason(x)} method={x.paid ? tc(`method.${x.paid.method}`) : null} f={f} />)}</ol>
          )}
        </section>

        {r.isToday && (
          <section className="hm-card hm-plan" aria-labelledby="hm-plan">
            <h2 id="hm-plan" className="hm-h">{t("planTitle")}<span className="hm-count">{stops.length}</span></h2>
            {stops.length === 0 ? <p className="hm-calm"><CircleCheck size={18} aria-hidden />{t("planDone")}</p> : (
              <ol>
                {stops.map((x, i) => (
                  <li key={x.id} className={i === 0 ? "next" : undefined} data-section={x.section}>
                    <span className="no">{i === 0 ? t("nowShort") : i + 1}</span>
                    <div className="body">
                      <Link href={`/shipments/${x.id}`} className="place">
                        {x.atPickup ? t("pickupAt", { name: x.name }) : [x.locality, x.address].filter(Boolean).join(", ")}
                      </Link>
                      <span className="sub">
                        {x.atPickup ? x.address ?? "" : x.name}
                        {x.phone && <> · <a href={`tel:${x.phone.replace(/\s/g, "")}`}>{x.phone}</a></>}
                      </span>
                      <span className="tags">
                        <span className="tag" data-section={x.section}>{reason(x) ?? ts(x.status)}</span>
                        {x.codLeft > 0 && <span className="tag pay"><Banknote size={12} aria-hidden />{f.mdl(x.codLeft)}</span>}
                        {x.notes && <span className="tag note"><StickyNote size={12} aria-hidden />{x.notes}</span>}
                      </span>
                    </div>
                    <span className="track">{x.trackingNo.split("-").pop()}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}
      </div>
    </>
  );
}

function Figure({ label, value, tone }: { label: string; value: string; tone?: "bad" | "pay" }) {
  return (
    <div className="hm-kpi" data-tone={tone}>
      <span className="lbl">{label}</span>
      <span className="val">{value}</span>
    </div>
  );
}

function Step({ x, t, ts, reason, method, f }: { x: RouteStep; t: T; ts: T; reason: string | null; method: string | null; f: ReturnType<typeof formats> }) {
  const Icon = STEP_ICON[x.tone];
  return (
    <li data-tone={x.tone}>
      <span className="time"><Clock size={12} aria-hidden />{f.clock(x.at)}</span>
      <Icon className="ico" size={18} aria-hidden />
      <div className="body">
        <span className="what">{ts(x.status)}{reason && <span> · {reason}</span>}</span>
        <Link href={`/shipments/${x.shipmentId}`} className="place"><MapPin size={12} aria-hidden />{[x.locality, x.address].filter(Boolean).join(", ") || x.name}</Link>
        <span className="sub">
          {x.status === "PICKED_UP" ? x.client : x.name}
          {x.receivedBy && <> · {t("receivedBy", { name: x.receivedBy })}</>}
          {x.paid && <> · {f.mdl(x.paid.amount)}{method ? ` (${method})` : ""}</>}
          {x.note && <> · {x.note}</>}
        </span>
      </div>
      <span className="track">{x.trackingNo.split("-").pop()}</span>
    </li>
  );
}
