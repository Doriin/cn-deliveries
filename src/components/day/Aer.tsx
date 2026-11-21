import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { fmtDayLong } from "@/lib/dates";
import { formatMDL } from "@/lib/money";
import type { DayGroup, DayParcel } from "@/lib/day";
import { AssignMenu, groupHref, ReceiveCash, type DayViewProps } from "./shared";
import { SlideTabs, type SlideTab } from "./SlideTabs";

const TABS = ["all", "bad", "road", "pickup", "depot", "done"] as const;
const ORDER: DayGroup[] = ["bad", "road", "pickup", "depot", "back", "done"];

/** Today in the Aer design: no table, a list grouped by stage under floating controls, money on a dock. */
export async function DayAer({ day, filter }: DayViewProps) {
  const t = await getTranslations("day");
  const ts = await getTranslations("status");
  const tr = await getTranslations("reason");
  const locale = await getLocale();
  const tabs: SlideTab[] = TABS.map((g) => ({ key: g, href: groupHref(g), label: t(`group.${g}`), count: day.counts[g], alert: g === "bad" && day.counts.bad > 0 }));
  const groups = ORDER.filter((g) => (filter === "all" || filter === g) && day.counts[g] > 0);
  const withCash = day.couriers.filter((c) => c.cash > 0);
  const share = day.sums.total > 0 ? day.sums.collected / day.sums.total : 0;

  const sub = (p: DayParcel) => {
    const state = p.reason ? tr(p.reason) : ts(p.status);
    const bits = [p.group === "bad" && p.attempts > 0 ? `${state} · ${t("attempt", { n: p.attempts })}` : state, p.group === "done" || p.group === "depot" ? p.time : null, p.client, p.courierName].filter(Boolean);
    return bits.join(" · ");
  };

  return (
    <div className="day day-aer">
      <h1>{fmtDayLong(new Date(), locale)}</h1>
      <p className="lede"><b>{t("summary", { done: day.counts.done, total: day.counts.all })}.</b> {t("needYou", { count: day.counts.bad })}</p>

      <SlideTabs className="chips" tabs={tabs} active={filter} label={t("col.status")} />

      <div className="cols">
        <div>
          {groups.map((g) => (
            <section className="grp" data-group={g} key={g}>
              <h2><i aria-hidden />{t(`group.${g}`)} <b>{day.counts[g]}</b></h2>
              <div className="rows">
                {day.parcels.filter((p) => p.group === g).map((p) => (
                  <Link className="row" href={`/shipments/${p.id}`} key={p.id}>
                    <span className="t">
                      <b>{p.who} <span>· {[p.city, p.addr].filter(Boolean).join(", ")}</span></b>
                      <small>{sub(p)}</small>
                    </span>
                    <span className="a">
                      <b className={p.cod ? undefined : "nil"}>{p.cod ? formatMDL(p.cod) : "—"}</b>
                      <small>{p.short}</small>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
          {groups.length === 0 && <p className="empty">{day.counts.all === 0 ? t("noParcels") : t("emptyGroup")}</p>}
        </div>

        <aside className="side">
          <h2>{t("couriers")}</h2>
          {day.couriers.map((c) => {
            const todo = c.stops.filter((p) => p.group !== "done");
            return (
              <div key={c.id} className="courier">
                <Link className="who" href={`/shipments?status=ACTIVE&courier=${c.id}`}>
                  <span className="av">{c.initials}</span>
                  <span><b>{c.name}</b><span>{c.total === 0 ? t("noParcels") : t("stopsLeft", { count: c.left })}</span></span>
                </Link>
                {todo.length > 0 && (
                  <ol className="left">
                    {todo.map((p) => (
                      <li key={p.id} data-now={p.id === c.now?.id || undefined} data-bad={p.group === "bad" || undefined}>
                        <Link href={`/shipments/${p.id}`}><b>{p.city ?? p.who}</b> · {p.group === "pickup" ? t("group.pickup").toLowerCase() : p.group === "bad" ? (p.reason ? tr(p.reason) : ts(p.status)).toLowerCase() : p.who}</Link>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            );
          })}
          {day.unassigned.length > 0 && (
            <>
              <h2>{t("noCourier")}</h2>
              {day.unassigned.map((p) => (
                <div className="lone" key={p.id}>
                  <Link href={`/shipments/${p.id}`}><b>{p.city ?? p.who}</b> <span>· {p.who}</span></Link>
                  <AssignMenu parcel={p} options={day.courierOptions} label={t("assign")} className="ui-field field pick" />
                </div>
              ))}
            </>
          )}
        </aside>
      </div>

      <div className="dock no-print">
        <Link className="m" href="/cod">
          <span className="line"><span>{t("cod.collected")}</span><span><b>{formatMDL(day.sums.collected)}</b> / {formatMDL(day.sums.total)}</span></span>
          <span className="meter" style={{ "--p": share } as React.CSSProperties}><i /></span>
        </Link>
        {withCash.map((c) => (
          <span className="c" key={c.id}>
            <span className="sep" aria-hidden />
            <span>{c.name.split(" ")[0]} · <b>{formatMDL(c.cash)}</b></span>
            <ReceiveCash courier={c} size="sm">{t("receive")}</ReceiveCash>
          </span>
        ))}
      </div>
    </div>
  );
}
