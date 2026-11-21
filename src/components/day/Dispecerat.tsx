import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Phone, TriangleAlert } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { btnClass } from "@/components/ui";
import { fmtDayLong } from "@/lib/dates";
import { formatMDL } from "@/lib/money";
import type { DayCourier, DayGroup, DayParcel } from "@/lib/day";
import { AssignMenu, ReceiveCash, filtered, groupHref, place, type DayViewProps } from "./shared";

/** A figure for a column or list whose heading already names the currency. */
const amount = (bani: number) => formatMDL(bani).replace(/\sMDL$/, "");

const STAGES: (DayGroup | "all")[] = ["all", "bad", "pickup", "depot", "road", "back", "done"];
const SIDE_LIST = 8;

/** A courier's run as stops on a line: delivered, failed, the current one, then what is left. */
function Run({ courier, label }: { courier: DayCourier; label: string }) {
  const rank = { d: 0, f: 0, n: 1, t: 2 };
  const stops = courier.stops
    .map((p) => (p.group === "done" ? "d" : p.group === "bad" ? "f" : p.id === courier.now?.id ? "n" : "t"))
    .sort((a, b) => rank[a] - rank[b]);
  return (
    <div className="run" role="img" aria-label={label}>
      <i />
      {stops.map((k, i) => <i key={i} className={k} />)}
    </div>
  );
}

/** Today in the "dispecerat" design: a dense table of the day with the couriers docked on the right. */
export async function DayDispecerat({ day, filter }: DayViewProps) {
  const [t, tr, locale] = await Promise.all([getTranslations("day"), getTranslations("reason"), getLocale()]);
  const rows = filtered(day, filter);
  const problems = day.parcels.filter((p) => p.group === "bad");
  // Returns get a tab only on days that have some, so the usual row of tabs stays short.
  const stages = STAGES.filter((g) => g !== "back" || day.counts.back > 0 || filter === "back");
  const why = (p: DayParcel) => (p.reason && tr.has(p.reason) ? tr(p.reason) : null);

  const status = (p: DayParcel) => {
    const reason = p.group === "bad" ? why(p) : null;
    if (!reason) return <StatusBadge status={p.status} />;
    return (
      <span className="fail">
        <TriangleAlert size={13} strokeWidth={2.4} aria-hidden />
        {reason}
        {p.attempts > 0 && <small>{t("ofTotal", { done: p.attempts, total: 3 })}</small>}
      </span>
    );
  };

  return (
    <div className="day day-dispecerat">
      <header className="head">
        <h1>{t("today")} <span>· {fmtDayLong(new Date(`${day.date}T12:00:00Z`), locale)}</span></h1>
        <p className="sync"><i aria-hidden />{t("updated")}</p>
      </header>

      {problems.slice(0, 2).map((p) => (
        <div key={p.id} className="alert">
          <TriangleAlert size={16} aria-hidden />
          <div className="txt">
            <b>{[p.who, p.city].filter(Boolean).join(", ")}</b>
            <span>
              {[why(p), p.attempts > 0 && t("attempt", { n: p.attempts }), p.codLeft > 0 && `${t("col.cod")} ${formatMDL(p.codLeft)}`].filter(Boolean).join(" · ")}
            </span>
            {!why(p) && <StatusBadge status={p.status} />}
          </div>
          <div className="acts">
            <a href={`tel:${p.phone}`} className={btnClass("secondary", "sm")}><Phone size={13} aria-hidden />{p.phone}</a>
            <Link href={`/shipments/${p.id}`} className={btnClass("secondary", "sm")}>{t("open")}</Link>
          </div>
        </div>
      ))}

      <div className="work">
        <div className="list">
          <nav className="tabs" aria-label={t("col.status")}>
            {stages.map((g) => (
              <Link key={g} href={groupHref(g)} aria-current={g === filter ? "true" : undefined} className={g === "bad" && day.counts.bad > 0 ? "bad" : undefined}>
                {t(`group.${g}`)} <b>{day.counts[g]}</b>
              </Link>
            ))}
          </nav>

          {rows.length === 0 ? (
            <p className="empty">{day.counts.all === 0 ? t("noParcels") : t("emptyGroup")}</p>
          ) : (
            <>
              <div className="scroll">
                <table>
                  <thead>
                    <tr>
                      <th>{t("col.no")}</th>
                      <th>{t("col.recipient")}</th>
                      <th>{t("col.address")}</th>
                      <th>{t("col.courier")}</th>
                      <th className="r">{t("col.cod")}</th>
                      <th>{t("col.status")}</th>
                      <th className="r">{t("col.time")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((p) => (
                      <tr key={p.id} className={p.group === "done" ? "past" : undefined}>
                        <td className="no"><Link href={`/shipments/${p.id}`} title={p.trackingNo}>{p.short}</Link></td>
                        <td className="who"><Link href={`/shipments/${p.id}`} tabIndex={-1}>{p.who}</Link></td>
                        <td className="where">{p.city && <b>{p.city}</b>}{p.city && p.addr ? ", " : ""}{p.addr}</td>
                        <td className={p.courierName ? "soft" : "nil"}>{p.courierName ?? t("noCourier")}</td>
                        <td className={p.cod > 0 ? "r" : "r nil"}>{p.cod > 0 ? amount(p.cod) : "—"}</td>
                        <td>{status(p)}</td>
                        <td className="r soft">{p.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="foot">
                <span>{t("count", { count: rows.length })}</span>
                <span>{t("codTotal")} {formatMDL(rows.reduce((a, p) => a + p.cod, 0))}</span>
              </div>
            </>
          )}
        </div>

        <aside className="side">
          <section>
            <h2>{t("couriers")} <Link href="/manifest">{t("manifests")}</Link></h2>
            {day.couriers.length === 0 && <p className="none">{t("dispecerat.noCouriers")}</p>}
            {day.couriers.map((c) => (
              <div key={c.id} className="cr">
                <div className="top">
                  <b>{c.name}</b>
                  {c.total > 0 && <span>{t("ofTotal", { done: c.done, total: c.total })}</span>}
                </div>
                {c.total > 0 && <Run courier={c} label={t("deliveredOf", { done: c.done, total: c.total })} />}
                <p>{c.now ? <><span>{t("now")}:</span> {place(c.now)}</> : <span>{c.total > 0 ? t("routeDone") : t("noParcels")}</span>}</p>
                <div className="cash">
                  {c.cash > 0 ? (
                    <>
                      <div><b>{formatMDL(c.cash)}</b> <span>{t("cash")}</span></div>
                      <ReceiveCash courier={c} variant="secondary" size="sm">{t("receive")}</ReceiveCash>
                    </>
                  ) : (
                    <div><span>{formatMDL(0)} {t("cash")}</span></div>
                  )}
                </div>
              </div>
            ))}
          </section>

          <section>
            <h2>{t("noCourier")} <span>{day.unassigned.length}</span></h2>
            {day.unassigned.length === 0 && <p className="none">{t("dispecerat.allAssigned")}</p>}
            {day.unassigned.slice(0, SIDE_LIST).map((p) => (
              <div key={p.id} className="wait">
                <Link href={`/shipments/${p.id}`}><b>{p.city ?? p.who}</b>{p.city && <span> · {p.who}</span>}</Link>
                <AssignMenu parcel={p} options={day.courierOptions} label={t("assign")} className="ui-field field pick" />
              </div>
            ))}
            {day.unassigned.length > SIDE_LIST && <Link className="more" href="/shipments?courier=none">{t("allShipments")}</Link>}
          </section>

          <section>
            <h2>{t("cod.title")} <Link href="/cod">{t("cod.details")}</Link></h2>
            <dl>
              <dt>{t("cod.collected")}</dt><dd>{amount(day.sums.collected)}</dd>
              <dt>{t("cod.road")}</dt><dd>{amount(day.sums.road)}</dd>
              <dt>{t("cod.depot")}</dt><dd>{amount(day.sums.depot)}</dd>
              <dt className="sum">{t("cod.total")}</dt><dd className="sum">{amount(day.sums.total)}</dd>
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}
