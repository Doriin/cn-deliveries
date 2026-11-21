import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Icon } from "@iconify/react";
import warn from "@iconify-icons/material-symbols/warning-rounded";
import check from "@iconify-icons/material-symbols/check-circle-rounded";
import truck from "@iconify-icons/material-symbols/local-shipping-rounded";
import pin from "@iconify-icons/material-symbols/edit-location-alt-rounded";
import pay from "@iconify-icons/material-symbols/payments-rounded";
import sync from "@iconify-icons/material-symbols/table-chart-rounded";
import call from "@iconify-icons/material-symbols/call-rounded";
import { fmtDayLong } from "@/lib/dates";
import { formatMDL } from "@/lib/money";
import type { DayCourier, DayGroup, DayParcel, DayTask } from "@/lib/day";
import { SHAPE, wave, wavyCircle, type ShapeName } from "@/components/val/shapes";
import { AssignMenu, ConfirmOrder, ReceiveCash, groupHref, place, type DayViewProps } from "./shared";

const css = (v: Record<string, string | number>) => v as React.CSSProperties;
const TABS = ["all", "bad", "road", "pickup", "depot", "done"] as const;
const ORDER: DayGroup[] = ["bad", "road", "pickup", "depot", "back", "done"];
const AVATAR: ShapeName[] = ["cookie", "clover", "sunny", "burst"];
const RING = wavyCircle(60, 60, 50, 2.6, 14);

/** M3 Expressive wavy linear progress: the done part waves (and travels while the run is still going), the rest is a flat track. */
function WavyBar({ id, p, moving }: { id: string; p: number; moving: boolean }) {
  const end = Math.max(0, p * 100 - (p < 1 ? 3 : 0));
  return (
    <svg className="vl-wave" viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden>
      <clipPath id={`w${id}`}><rect x="0" y="0" width={end} height="12" /></clipPath>
      {p < 1 && <line className="trk" x1={Math.min(100, p * 100 + 3)} y1="6" x2="99" y2="6" />}
      {p < 1 && <circle className="stop" cx="99" cy="6" r="1.4" />}
      <g clipPath={`url(#w${id})`}><path className="act" data-moving={moving || undefined} d={wave(-12, 112, 6, moving ? 2.4 : 0.01, 12)} /></g>
    </svg>
  );
}

/** Today in the Val design (Material 3 Expressive): a big expressive title, a wavy day ring, a connected button group, shaped avatars and a FAB. */
export async function DayVal({ day, filter }: DayViewProps) {
  const [t, tr, ts, locale] = await Promise.all([getTranslations("day"), getTranslations("reason"), getTranslations("status"), getLocale()]);
  const reason = (p: DayParcel) => (p.reason && tr.has(p.reason) ? tr(p.reason) : ts(p.status));
  const dots = (parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" · ");
  const share = day.counts.all ? day.counts.done / day.counts.all : 0;
  const groups = ORDER.filter((g) => (filter === "all" || filter === g) && day.counts[g] > 0);

  const lead = (shape: ShapeName, icon: typeof warn, tone: string) => (
    <span className="vl-lead" data-tone={tone} style={css({ "--shape": SHAPE[shape], "--shape-to": SHAPE.circle })}><Icon icon={icon} /></span>
  );
  const item = (k: DayTask) => {
    switch (k.kind) {
      case "problem": {
        const p = k.parcel;
        return <li key={`p${p.id}`}>{lead("sunny", warn, "error")}<Link className="vl-li-t" href={`/shipments/${p.id}`}><b>{p.who}</b><span>{dots([reason(p), p.attempts > 0 && t("attempt", { n: p.attempts }), place(p)])}</span></Link>
          <a href={`tel:${p.phone}`} className="ui-btn ui-btn-primary ui-btn-sm vl-btn"><Icon icon={call} />{t("call")}</a></li>;
      }
      case "confirm": {
        const p = k.parcel;
        return <li key={`c${p.id}`}>{lead("cookie", check, "primary")}<Link className="vl-li-t" href={`/shipments/${p.id}`}><b>{t("task.confirm")}</b><span>{dots([p.who, p.city, p.client])}</span></Link>
          <ConfirmOrder parcel={p} variant="secondary" size="sm" className="vl-btn">{t("confirm")}</ConfirmOrder></li>;
      }
      case "assign": {
        const p = k.parcel;
        return <li key={`a${p.id}`}>{lead("clover", truck, "tertiary")}<Link className="vl-li-t" href={`/shipments/${p.id}`}><b>{t("task.assign", { city: p.city ?? p.who })}</b><span>{dots([p.who, p.addr])}</span></Link>
          <AssignMenu parcel={p} options={day.courierOptions} label={t("assign")} className="ui-field vl-pick" /></li>;
      }
      case "zone": {
        const p = k.parcel;
        return <li key={`z${p.id}`}>{lead("burst", pin, "secondary")}<Link className="vl-li-t" href={`/shipments/${p.id}/edit`}><b>{t("task.zone", { name: p.who })}</b><span>{place(p)}</span></Link></li>;
      }
      case "cash": {
        const c = k.courier;
        return <li key={`m${c.id}`}>{lead("square", pay, "primary")}<span className="vl-li-t"><b>{t("task.cash", { name: c.name, amount: formatMDL(c.cash) })}</b><span>{t("task.cashHint", { count: c.cashPayments })}</span></span>
          <ReceiveCash courier={c} size="sm" className="vl-btn">{t("receive")}</ReceiveCash></li>;
      }
      case "sync":
        return <li key="sync">{lead("cookie", sync, "secondary")}<Link className="vl-li-t" href="/sync"><b>{t("task.sync", { count: k.count })}</b></Link></li>;
    }
  };
  const courier = (c: DayCourier, i: number) => (
    <article key={c.id} className="vl-card" style={css({ "--i": i })}>
      <header>
        <span className="vl-av" style={css({ "--shape": SHAPE[AVATAR[i % AVATAR.length]], "--shape-to": SHAPE.circle })}>{c.initials}</span>
        <div><Link href={`/shipments?status=ACTIVE&courier=${c.id}`}><b>{c.name}</b></Link><span>{c.total === 0 ? t("noParcels") : c.left === 0 ? t("routeDone") : t("stopsLeft", { count: c.left })}</span></div>
        <b className="vl-frac">{c.done}<small>/{c.total}</small></b>
      </header>
      {c.total > 0 && <WavyBar id={c.id} p={c.done / c.total} moving={c.left > 0} />}
      {c.now && c.left > 0 && <Link href={`/shipments/${c.now.id}`} className="vl-now"><small>{t("insula.next")}</small><span>{place(c.now) || c.now.who}</span></Link>}
      {c.cash > 0 && (
        <footer><span className="vl-chip">{formatMDL(c.cash)}</span><ReceiveCash courier={c} size="sm" variant="secondary" className="vl-btn">{t("receive")}</ReceiveCash></footer>
      )}
    </article>
  );

  return (
    <div className="day day-val">
      <header className="vl-hero">
        <div className="vl-hero-t">
          <p>{fmtDayLong(new Date(`${day.date}T12:00:00Z`), locale)}</p>
          <h1>{t("today")}</h1>
          <span className="vl-sub">{t("summary", { done: day.counts.done, total: day.counts.all })}. {t("needYou", { count: day.counts.bad })}</span>
        </div>
        <div className="vl-ring" role="img" aria-label={t("deliveredOf", { done: day.counts.done, total: day.counts.all })}>
          <svg viewBox="0 0 120 120" aria-hidden>
            <circle className="trk" cx="60" cy="60" r="50" pathLength={1} style={css({ "--v": share })} />
            <path className="act" d={RING} pathLength={1} style={css({ "--v": share })} />
          </svg>
          <span><b>{Math.round(share * 100)}%</b><small>{t("ofTotal", { done: day.counts.done, total: day.counts.all })}</small></span>
        </div>
        <div className="vl-money">
          <div><small>{t("cod.collected")}</small><b>{formatMDL(day.sums.collected)}</b></div>
          <div><small>{t("cod.road")}</small><b>{formatMDL(day.sums.road)}</b></div>
          <div><small>{t("radar.withCouriers")}</small><b>{formatMDL(day.sums.cashHeld)}</b></div>
        </div>
      </header>

      <nav className="vl-bgroup" aria-label={t("col.status")}>
        {TABS.map((g) => (
          <Link key={g} href={groupHref(g)} scroll={false} replace aria-current={filter === g ? "page" : undefined} data-alert={(g === "bad" && day.counts.bad > 0) || undefined}>
            {filter === g && <Icon icon={check} className="vl-bg-check" />}{t(`group.${g}`)}<b>{day.counts[g]}</b>
          </Link>
        ))}
      </nav>

      <div className="vl-cols">
        <div>
          {day.tasks.length > 0 && (
            <section className="vl-sec">
              <h2>{t("insula.attention")}</h2>
              <ul className="vl-list">{day.tasks.map(item)}</ul>
            </section>
          )}
          {groups.map((g) => (
            <section className="vl-sec" key={g} data-g={g}>
              <h2>{t(`group.${g}`)} <span>{day.counts[g]}</span></h2>
              <ul className="vl-list vl-parcels">
                {day.parcels.filter((p) => p.group === g).map((p) => (
                  <li key={p.id}>
                    <Link href={`/shipments/${p.id}`} className="vl-li-a">
                      <i className="vl-dot" data-g={p.group} />
                      <span className="vl-li-t"><b>{p.who}</b><span>{dots([g === "bad" ? reason(p) : ts(p.status), place(p), p.courierName ?? t("noCourier")])}</span></span>
                      <span className="vl-li-m"><b>{p.cod ? formatMDL(p.cod) : "—"}</b><small>{p.short}</small></span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {groups.length === 0 && <p className="vl-empty">{day.counts.all === 0 ? t("noParcels") : t("emptyGroup")}</p>}
        </div>
        <aside className="vl-side">
          <h2>{t("couriers")}</h2>
          {day.couriers.map(courier)}
          {day.couriers.length === 0 && <p className="vl-empty">{t("verde.noCouriers")}</p>}
        </aside>
      </div>
    </div>
  );
}
