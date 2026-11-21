import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { IconAlertTriangle, IconCash, IconCircleCheck, IconMapPinOff, IconPhone, IconTableShare, IconTruck } from "@tabler/icons-react";
import { fmtDayLong } from "@/lib/dates";
import { formatMDL } from "@/lib/money";
import { fromDepot, locate } from "@/lib/geo";
import type { DayGroup, DayParcel, DayTask } from "@/lib/day";
import { AssignMenu, ConfirmOrder, ReceiveCash, groupHref, place, type DayViewProps } from "./shared";

const css = (v: Record<string, string | number>) => v as React.CSSProperties;
const TABS = ["all", "bad", "road", "pickup", "depot", "done"] as const;
/** Distance rings, km. The scale is logarithmic so the city and the country both fit. */
const RINGS = [2, 5, 20, 60, 150];
const MAX_KM = 220;
const radius = (km: number) => Math.log(1 + Math.min(km, MAX_KM) / 2) / Math.log(1 + MAX_KM / 2);
const COMPASS = ["N", "NE", "E", "SE", "S", "SV", "V", "NV"];

type Dot = { p: DayParcel; x: number; y: number; deg: number; km: number; c: number };

/** Today in the Radar design: the day drawn around the depot, every parcel at its real direction and distance, couriers' runs as lines. */
export async function DayRadar({ day, filter }: DayViewProps) {
  const [t, tr, ts, locale] = await Promise.all([getTranslations("day"), getTranslations("reason"), getTranslations("status"), getLocale()]);
  const reason = (p: DayParcel) => (p.reason && tr.has(p.reason) ? tr(p.reason) : ts(p.status));
  const courierIdx = new Map(day.couriers.map((c, i) => [c.id, i]));

  // place every parcel; parcels in the same place fan out in a small sunflower so none hides another
  const seen = new Map<string, number>();
  const dots: Dot[] = [];
  const lost: DayParcel[] = [];
  for (const p of day.parcels) {
    const ll = locate(p.city, p.addr);
    if (!ll) { lost.push(p); continue; }
    const { deg, km } = fromDepot(ll);
    const key = ll.join();
    const n = seen.get(key) ?? 0;
    seen.set(key, n + 1);
    const r = Math.max(0.035, radius(km));
    const a = (deg * Math.PI) / 180;
    const fa = n * 2.4, fr = n ? 0.018 * Math.sqrt(n) : 0;
    dots.push({ p, deg, km, c: p.courierId ? courierIdx.get(p.courierId) ?? -1 : -1,
      x: 50 + 50 * (r * Math.sin(a)) + 50 * fr * Math.cos(fa), y: 50 - 50 * (r * Math.cos(a)) + 50 * fr * Math.sin(fa) });
  }
  const at = new Map(dots.map((d) => [d.p.id, d]));
  const routes = day.couriers.map((c, i) => {
    const pts = c.stops.map((p) => at.get(p.id)).filter(Boolean) as Dot[];
    const done = pts.filter((d) => d.p.group === "done");
    const rest = pts.filter((d) => d.p.group !== "done");
    const line = (list: Dot[], from: [number, number]) => [from, ...list.map((d) => [d.x, d.y] as [number, number])].map(([x, y], k) => `${k ? "L" : "M"}${(x * 6.4).toFixed(1)} ${(y * 6.4).toFixed(1)}`).join(" ");
    const last = done.at(-1);
    return { c, i, done: done.length ? line(done, [50, 50]) : "", rest: rest.length ? line(rest, last ? [last.x, last.y] : [50, 50]) : "", now: c.now ? at.get(c.now.id) : undefined };
  });
  const shown = (g: DayGroup) => filter === "all" || filter === g;
  const near = [...dots].sort((a, b) => a.km - b.km).filter((d) => d.p.group !== "done" && shown(d.p.group));
  const dir = (deg: number) => COMPASS[Math.round(deg / 45) % 8];
  const km = (v: number) => (v < 1 ? "<1 km" : `${v.toLocaleString(locale, { maximumFractionDigits: v < 10 ? 1 : 0 })} km`);

  const task = (k: DayTask) => {
    switch (k.kind) {
      case "problem": return (
        <li key={`p${k.parcel.id}`} data-tone="bad"><IconAlertTriangle stroke={1.8} />
          <Link href={`/shipments/${k.parcel.id}`}><b>{k.parcel.who}</b><span>{reason(k.parcel)} · {place(k.parcel)}</span></Link>
          <a className="rd-icon-btn" href={`tel:${k.parcel.phone}`} aria-label={t("call")}><IconPhone stroke={1.8} /></a></li>);
      case "confirm": return (
        <li key={`c${k.parcel.id}`}><IconCircleCheck stroke={1.8} />
          <Link href={`/shipments/${k.parcel.id}`}><b>{t("task.confirm")}</b><span>{k.parcel.who} · {k.parcel.client}</span></Link>
          <ConfirmOrder parcel={k.parcel} variant="secondary" size="sm">{t("confirm")}</ConfirmOrder></li>);
      case "assign": return (
        <li key={`a${k.parcel.id}`}><IconTruck stroke={1.8} />
          <Link href={`/shipments/${k.parcel.id}`}><b>{t("task.assign", { city: k.parcel.city ?? k.parcel.who })}</b><span>{k.parcel.who}</span></Link>
          <AssignMenu parcel={k.parcel} options={day.courierOptions} label={t("assign")} className="ui-field rd-pick" /></li>);
      case "zone": return (
        <li key={`z${k.parcel.id}`}><IconMapPinOff stroke={1.8} />
          <Link href={`/shipments/${k.parcel.id}/edit`}><b>{t("task.zone", { name: k.parcel.who })}</b><span>{place(k.parcel)}</span></Link></li>);
      case "cash": return (
        <li key={`m${k.courier.id}`} data-tone="cash"><IconCash stroke={1.8} />
          <span className="rd-t"><b>{t("task.cash", { name: k.courier.name, amount: formatMDL(k.courier.cash) })}</b><span>{t("task.cashHint", { count: k.courier.cashPayments })}</span></span>
          <ReceiveCash courier={k.courier} size="sm">{t("receive")}</ReceiveCash></li>);
      case "sync": return (
        <li key="sync"><IconTableShare stroke={1.8} /><Link href="/sync"><b>{t("task.sync", { count: k.count })}</b></Link></li>);
    }
  };

  return (
    <div className="day day-radar">
      <header className="rd-head">
        <div>
          <p className="rd-kick"><i />{t("radar.live", { time: day.now.time })}</p>
          <h1>{fmtDayLong(new Date(`${day.date}T12:00:00Z`), locale)}</h1>
        </div>
        <dl className="rd-kpis">
          <div><dt>{t("group.done")}</dt><dd>{day.counts.done}<small>/{day.counts.all}</small></dd></div>
          <div><dt>{t("cod.collected")}</dt><dd>{formatMDL(day.sums.collected).replace(/\sMDL$/, "")}<small> MDL</small></dd></div>
          <div><dt>{t("radar.withCouriers")}</dt><dd>{formatMDL(day.sums.cashHeld).replace(/\sMDL$/, "")}<small> MDL</small></dd></div>
          <div data-bad={day.counts.bad > 0 || undefined}><dt>{t("group.bad")}</dt><dd>{day.counts.bad}</dd></div>
        </dl>
      </header>

      <div className="rd">
        <section className="rd-scope" aria-label={t("radar.map")}>
          <div className="rd-plot">
            <svg viewBox="0 0 640 640" aria-hidden>
              <defs>
                <radialGradient id="rd-glow"><stop offset="0" stopColor="var(--d-accent)" stopOpacity="0.10" /><stop offset="1" stopColor="var(--d-accent)" stopOpacity="0" /></radialGradient>
                <linearGradient id="rd-sweep" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="var(--d-accent)" stopOpacity="0" /><stop offset="1" stopColor="var(--d-accent)" stopOpacity="0.28" /></linearGradient>
              </defs>
              <circle cx="320" cy="320" r="320" fill="url(#rd-glow)" />
              {RINGS.map((k, i) => (
                <g key={k} className="rd-ring" style={css({ "--i": i })}>
                  <circle cx="320" cy="320" r={320 * radius(k)} />
                  <text x={320 + 320 * radius(k) * 0.7071 + 4} y={320 - 320 * radius(k) * 0.7071 - 4}>{k} km</text>
                </g>
              ))}
              <g className="rd-axes"><path d="M320 6V634M6 320H634" /></g>
              {["N", "E", "S", "V"].map((c, i) => <text key={c} className="rd-card" x={[320, 626, 320, 14][i]} y={[22, 324, 630, 324][i]}>{c}</text>)}
              <path className="rd-sweep" d="M320 320 L320 0 A320 320 0 0 1 546.3 93.7 Z" fill="url(#rd-sweep)" />
              {routes.map((r) => (
                <g key={r.c.id} className={`rd-route c${r.i}`}>
                  {r.done && <path className="done" d={r.done} pathLength={1} />}
                  {r.rest && <path className="rest" d={r.rest} pathLength={1} />}
                </g>
              ))}
            </svg>
            <span className="rd-depot" title={t("radar.depot")}><i /></span>
            {dots.map((d) => (
              <Link key={d.p.id} href={`/shipments/${d.p.id}`} className={`rd-dot c${d.c}`} data-g={d.p.group} data-off={!shown(d.p.group) || undefined}
                style={css({ left: `${d.x}%`, top: `${d.y}%`, "--d": `${(d.deg / 360) * 1.3 + 0.25}s` })}>
                <i />
                <span className="rd-tip">
                  <b>{d.p.who}</b>
                  <small>{place(d.p)}</small>
                  <small>{d.p.group === "bad" ? reason(d.p) : ts(d.p.status)}{d.p.cod ? ` · ${formatMDL(d.p.cod)}` : ""}</small>
                  <em>{km(d.km)} {dir(d.deg)}</em>
                </span>
              </Link>
            ))}
            {routes.filter((r) => r.now).map((r) => (
              <span key={r.c.id} className={`rd-courier c${r.i}`} style={css({ left: `${r.now!.x}%`, top: `${r.now!.y}%` })} title={r.c.name}>{r.c.initials}</span>
            ))}
          </div>
          <nav className="rd-tabs" aria-label={t("col.status")}>
            {TABS.map((g) => (
              <Link key={g} href={groupHref(g)} scroll={false} replace aria-current={filter === g ? "page" : undefined} data-g={g}>
                <i />{t(`group.${g}`)}<b>{day.counts[g]}</b>
              </Link>
            ))}
          </nav>
          {lost.length > 0 && <p className="rd-lost">{t("radar.unplaced", { count: lost.length })}: {lost.map((p) => <Link key={p.id} href={`/shipments/${p.id}`}>{p.who}</Link>)}</p>}
        </section>

        <aside className="rd-side">
          <h2>{t("couriers")}</h2>
          <div className="rd-couriers">
            {day.couriers.map((c, i) => (
              <article key={c.id} className={`rd-c c${i}`} style={css({ "--i": i })}>
                <span className="rd-av">{c.initials}</span>
                <div className="rd-c-t">
                  <Link href={`/shipments?status=ACTIVE&courier=${c.id}`}><b>{c.name}</b></Link>
                  <span>{c.total === 0 ? t("noParcels") : c.left === 0 ? t("routeDone") : `${t("radar.now")}: ${c.now ? place(c.now) || c.now.who : "—"}`}</span>
                  {c.total > 0 && <span className="rd-meter" style={css({ "--p": c.done / c.total })}><i /></span>}
                </div>
                <div className="rd-c-n"><b>{c.done}/{c.total}</b>{c.cash > 0 && <small>{formatMDL(c.cash)}</small>}</div>
              </article>
            ))}
          </div>
          {day.tasks.length > 0 && (
            <>
              <h2>{t("radar.attention")} <span>{day.tasks.length}</span></h2>
              <ul className="rd-tasks">{day.tasks.map(task)}</ul>
            </>
          )}
        </aside>
      </div>

      <section className="rd-near">
        <h2>{t("radar.byDistance")}</h2>
        <ol>
          {near.map((d, i) => (
            <li key={d.p.id} style={css({ "--i": i })}>
              <Link href={`/shipments/${d.p.id}`} data-g={d.p.group}>
                <span className="rd-km"><b>{km(d.km)}</b><small>{dir(d.deg)}</small></span>
                <span className="rd-n-t"><b>{d.p.who}</b><small>{place(d.p)}</small></span>
                <span className="rd-n-s">{d.p.group === "bad" ? reason(d.p) : ts(d.p.status)}</span>
                <span className="rd-n-c">{d.p.courierName ?? t("noCourier")}</span>
                <span className="rd-n-m">{d.p.codLeft ? formatMDL(d.p.codLeft) : "—"}</span>
              </Link>
            </li>
          ))}
        </ol>
        {near.length === 0 && <p className="rd-empty">{day.counts.all === 0 ? t("noParcels") : t("emptyGroup")}</p>}
      </section>
    </div>
  );
}
