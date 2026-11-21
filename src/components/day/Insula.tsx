import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import {
  ArrowsClockwiseIcon, CaretRightIcon, CheckCircleIcon, HandCoinsIcon, MapPinIcon, PhoneIcon, TruckIcon, WarningCircleIcon,
} from "@phosphor-icons/react/ssr";
import { btnClass } from "@/components/ui";
import { fmtDayLong } from "@/lib/dates";
import { formatMDL } from "@/lib/money";
import type { DayCourier, DayGroup, DayParcel, DayTask } from "@/lib/day";
import { AssignMenu, ConfirmOrder, ReceiveCash, groupHref, place, type DayViewProps } from "./shared";
import { SlideTabs, type SlideTab } from "./SlideTabs";

const TABS = ["all", "bad", "road", "pickup", "depot", "done"] as const;
const ORDER: DayGroup[] = ["bad", "road", "pickup", "depot", "back", "done"];
const css = (v: Record<string, string | number>) => v as React.CSSProperties;

/** Three Activity-style rings: delivered, cash collected, on the road. Each draws itself in on a spring. */
function Rings({ rings }: { rings: { v: number; tone: string }[] }) {
  return (
    <svg className="in-rings" viewBox="0 0 120 120" aria-hidden>
      {rings.map((r, i) => {
        const radius = 52 - i * 15;
        return (
          <g key={r.tone} data-tone={r.tone} style={css({ "--v": Math.min(1, Math.max(0, r.v)), "--i": i })}>
            <circle cx="60" cy="60" r={radius} pathLength={1} className="bg" />
            <circle cx="60" cy="60" r={radius} pathLength={1} className="fg" />
          </g>
        );
      })}
    </svg>
  );
}

/** A courier as a Live Activity: how far along the run is, where they are now, what cash they hold. */
function Activity({ c, t, tr, ts }: { c: DayCourier; t: Awaited<ReturnType<typeof getTranslations<"day">>>; tr: (k: string) => string; ts: (k: string) => string }) {
  const share = c.total ? c.done / c.total : 0;
  const bad = c.stops.filter((p) => p.group === "bad").length;
  return (
    <article className="in-act" data-idle={c.total === 0 || undefined}>
      <header>
        <span className="in-av">{c.initials}</span>
        <Link href={`/shipments?status=ACTIVE&courier=${c.id}`} className="in-act-name"><b>{c.name}</b></Link>
        {c.left > 0 && <span className="in-live"><i />{t("insula.live")}</span>}
      </header>
      <div className="in-act-big">
        {c.total === 0 ? <span className="in-quiet">{t("noParcels")}</span> : c.left === 0 ? <span>{t("routeDone")}</span> : (
          <><b className="in-count" style={css({ "--to": c.left })} aria-label={String(c.left)} /> <span>{t("insula.stopsLeft", { count: c.left })}</span></>
        )}
      </div>
      {c.total > 0 && (
        <div className="in-track" style={css({ "--p": share })} role="img" aria-label={t("ofTotal", { done: c.done, total: c.total })}>
          <span className="in-track-fill" />
          {c.stops.map((p, i) => <i key={p.id} data-g={p.group} style={css({ "--x": (i + 1) / c.total })} />)}
          <span className="in-van"><TruckIcon weight="fill" /></span>
        </div>
      )}
      {c.now && (
        <Link className="in-next" href={`/shipments/${c.now.id}`}>
          <small>{c.now.group === "bad" ? (c.now.reason ? tr(c.now.reason) : ts(c.now.status)) : c.now.group === "pickup" ? t("group.pickup") : t("insula.next")}</small>
          <span>{place(c.now) || c.now.who}</span>
        </Link>
      )}
      <footer>
        {bad > 0 && <span className="in-act-bad"><WarningCircleIcon weight="fill" />{bad}</span>}
        <span className="in-act-done">{t("ofTotal", { done: c.done, total: c.total })}</span>
        {c.cash > 0 && (
          <span className="in-act-cash">
            <b>{formatMDL(c.cash)}</b>
            <ReceiveCash courier={c} size="sm" variant="secondary">{t("receive")}</ReceiveCash>
          </span>
        )}
      </footer>
    </article>
  );
}

/** Today in the Insula design: a large title, rings for the day, couriers as Live Activities, then iOS grouped lists. */
export async function DayInsula({ day, filter }: DayViewProps) {
  const [t, tr, ts, locale] = await Promise.all([getTranslations("day"), getTranslations("reason"), getTranslations("status"), getLocale()]);
  const date = fmtDayLong(new Date(`${day.date}T12:00:00Z`), locale);
  const tabs: SlideTab[] = TABS.map((g) => ({ key: g, href: groupHref(g), label: t(`group.${g}`), count: day.counts[g], alert: g === "bad" && day.counts.bad > 0 }));
  const groups = ORDER.filter((g) => (filter === "all" || filter === g) && day.counts[g] > 0);
  const active = day.counts.all - day.counts.done;
  const reason = (p: DayParcel) => (p.reason && tr.has(p.reason) ? tr(p.reason) : ts(p.status));
  const dots = (parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" · ");

  const row = (k: DayTask) => {
    const tile = (tone: string, icon: React.ReactNode) => <span className="in-tile" data-tone={tone}>{icon}</span>;
    switch (k.kind) {
      case "problem": {
        const p = k.parcel;
        return (
          <div className="in-row" key={`p${p.id}`}>
            {tile("red", <WarningCircleIcon weight="fill" />)}
            <Link href={`/shipments/${p.id}`} className="in-row-t"><b>{p.who}</b><small className="bad">{dots([reason(p), p.attempts > 0 && t("attempt", { n: p.attempts }), place(p)])}</small></Link>
            <a href={`tel:${p.phone}`} className={btnClass("primary", "sm")}><PhoneIcon weight="fill" />{t("call")}</a>
          </div>
        );
      }
      case "confirm": {
        const p = k.parcel;
        return (
          <div className="in-row" key={`c${p.id}`}>
            {tile("blue", <CheckCircleIcon weight="fill" />)}
            <Link href={`/shipments/${p.id}`} className="in-row-t"><b>{t("task.confirm")}</b><small>{dots([p.who, p.city, p.client])}</small></Link>
            <ConfirmOrder parcel={p} variant="secondary" size="sm">{t("confirm")}</ConfirmOrder>
          </div>
        );
      }
      case "assign": {
        const p = k.parcel;
        return (
          <div className="in-row" key={`a${p.id}`}>
            {tile("orange", <TruckIcon weight="fill" />)}
            <Link href={`/shipments/${p.id}`} className="in-row-t"><b>{t("task.assign", { city: p.city ?? p.who })}</b><small>{dots([p.who, p.addr])}</small></Link>
            <AssignMenu parcel={p} options={day.courierOptions} label={t("assign")} className="ui-field in-pick" />
          </div>
        );
      }
      case "zone": {
        const p = k.parcel;
        return (
          <div className="in-row" key={`z${p.id}`}>
            {tile("indigo", <MapPinIcon weight="fill" />)}
            <Link href={`/shipments/${p.id}/edit`} className="in-row-t"><b>{t("task.zone", { name: p.who })}</b><small>{place(p)}</small></Link>
            <CaretRightIcon weight="bold" className="in-chev" />
          </div>
        );
      }
      case "cash": {
        const c = k.courier;
        return (
          <div className="in-row" key={`m${c.id}`}>
            {tile("green", <HandCoinsIcon weight="fill" />)}
            <span className="in-row-t"><b>{t("task.cash", { name: c.name, amount: formatMDL(c.cash) })}</b><small>{t("task.cashHint", { count: c.cashPayments })}</small></span>
            <ReceiveCash courier={c} size="sm" variant="secondary">{t("receive")}</ReceiveCash>
          </div>
        );
      }
      case "sync":
        return (
          <div className="in-row" key="sync">
            {tile("gray", <ArrowsClockwiseIcon weight="bold" />)}
            <Link href="/sync" className="in-row-t"><b>{t("task.sync", { count: k.count })}</b></Link>
            <CaretRightIcon weight="bold" className="in-chev" />
          </div>
        );
    }
  };

  return (
    <div className="day day-insula">
      <header className="in-hero">
        <p>{date}</p>
        <h1>{t("today")}</h1>
      </header>

      <section className="in-top">
        <div className="in-sum">
          <Rings rings={[
            { v: day.counts.all ? day.counts.done / day.counts.all : 0, tone: "done" },
            { v: day.sums.total ? day.sums.collected / day.sums.total : 0, tone: "cash" },
            { v: active ? day.counts.road / active : 0, tone: "road" },
          ]} />
          <dl>
            <div data-tone="done"><dt>{t("group.done")}</dt><dd><b className="in-count" style={css({ "--to": day.counts.done })} aria-label={String(day.counts.done)} /><span>/{day.counts.all}</span></dd></div>
            <div data-tone="cash"><dt>{t("cod.collected")}</dt><dd><b>{formatMDL(day.sums.collected).replace(/\sMDL$/, "")}</b><span>/{formatMDL(day.sums.total)}</span></dd></div>
            <div data-tone="road"><dt>{t("group.road")}</dt><dd><b className="in-count" style={css({ "--to": day.counts.road })} aria-label={String(day.counts.road)} /><span>/{active}</span></dd></div>
          </dl>
        </div>
        <div className="in-acts">
          {day.couriers.length === 0 && <p className="in-quiet">{t("verde.noCouriers")}</p>}
          {day.couriers.map((c, i) => (
            <div key={c.id} style={css({ "--i": i })} className="in-act-wrap"><Activity c={c} t={t} tr={(k) => (tr.has(k) ? tr(k) : k)} ts={(k) => ts(k)} /></div>
          ))}
        </div>
      </section>

      {day.tasks.length > 0 && (
        <section className="in-sec">
          <h2>{t("insula.attention")}<span>{day.tasks.length}</span></h2>
          <div className="in-list">{day.tasks.map(row)}</div>
        </section>
      )}

      <div className="in-seg-wrap"><SlideTabs className="in-seg" tabs={tabs} active={filter} label={t("col.status")} /></div>

      {groups.map((g) => (
        <section className="in-sec" data-group={g} key={g}>
          <h2>{t(`group.${g}`)}<span>{day.counts[g]}</span></h2>
          <div className="in-list">
            {day.parcels.filter((p) => p.group === g).map((p) => (
              <Link className="in-row in-parcel" href={`/shipments/${p.id}`} key={p.id}>
                <i className="in-dot" data-g={p.group} />
                <span className="in-row-t">
                  <b>{p.who}<span> · {place(p)}</span></b>
                  <small className={g === "bad" ? "bad" : undefined}>{dots([g === "bad" ? reason(p) : ts(p.status), p.courierName ?? t("noCourier"), p.client, (g === "done" || g === "depot") && p.time])}</small>
                </span>
                <span className="in-row-a">
                  <b data-nil={!p.cod || undefined}>{p.cod ? formatMDL(p.cod) : "—"}</b>
                  <small>{p.short}</small>
                </span>
                <CaretRightIcon weight="bold" className="in-chev" />
              </Link>
            ))}
          </div>
        </section>
      ))}
      {groups.length === 0 && <p className="in-empty">{day.counts.all === 0 ? t("noParcels") : t("emptyGroup")}</p>}
    </div>
  );
}
