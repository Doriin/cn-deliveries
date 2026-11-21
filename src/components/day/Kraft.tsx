import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Check, ChevronRight, Phone, TriangleAlert } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { btnClass } from "@/components/ui";
import { fmtDayLong } from "@/lib/dates";
import { formatMDL } from "@/lib/money";
import type { DayCourier, DayParcel, DayTask } from "@/lib/day";
import { AssignMenu, ConfirmOrder, ReceiveCash, place, type DayViewProps } from "./shared";

/** A figure for a column or list whose heading already names the currency. */
const amount = (bani: number) => formatMDL(bani).replace(/\sMDL$/, "");

const COLS = 5;

/** A courier's run as stops on a line: delivered, failed, the current one, then what is left. */
function Run({ courier, label }: { courier: DayCourier; label: string }) {
  const rank = { d: 0, f: 0, n: 1, t: 2 };
  const stops = courier.stops
    .map((p) => (p.group === "done" ? "d" : p.group === "bad" ? "f" : p.id === courier.now?.id ? "n" : "t"))
    .sort((a, b) => rank[a] - rank[b]);
  return (
    // The strip keeps the draft's width for a usual run and grows a little for a long one, so stops do not pile up.
    <div className="run" role="img" aria-label={label} style={{ width: Math.min(240, Math.max(140, 5 + stops.length * 16)) }}>
      <i />
      {stops.map((k, i) => <i key={i} className={k} />)}
    </div>
  );
}

/** Today in the "kraft" design: the day grouped by courier, with what needs solving in a column beside it. */
export async function DayKraft({ day }: DayViewProps) {
  const [t, tr, ts, locale] = await Promise.all([getTranslations("day"), getTranslations("reason"), getTranslations("status"), getLocale()]);
  const why = (p: DayParcel) => (p.reason && tr.has(p.reason) ? tr(p.reason) : null);
  const who = (p: DayParcel) => <><b>{p.who}</b>{p.city ? `, ${p.city}` : ""}</>;
  const open = (p: DayParcel) => <Link href={`/shipments/${p.id}`} className={btnClass("secondary", "sm")}>{t("open")}</Link>;

  const row = (p: DayParcel) => {
    const reason = p.group === "bad" ? why(p) : null;
    return (
      <tr key={p.id} className="row">
        <td className="no"><Link href={`/shipments/${p.id}`} title={p.trackingNo}>{p.short}</Link></td>
        <td className="who"><Link href={`/shipments/${p.id}`} tabIndex={-1}>{p.who}</Link></td>
        <td className="where">{p.city && <b>{p.city}</b>}{p.city && p.addr ? ", " : ""}{p.addr}</td>
        <td className={p.cod > 0 ? "r" : "r nil"}>{p.cod > 0 ? amount(p.cod) : "—"}</td>
        <td>
          {reason ? (
            <span className="fail">
              <TriangleAlert size={14} strokeWidth={2.2} aria-hidden />
              {reason}
              {p.attempts > 0 && <small>{t("ofTotal", { done: p.attempts, total: 3 })}</small>}
            </span>
          ) : (
            <StatusBadge status={p.status} />
          )}
        </td>
      </tr>
    );
  };

  const task = (k: DayTask) => {
    switch (k.kind) {
      case "problem": {
        const p = k.parcel;
        return (
          <div key={`problem-${p.id}`} className="todo">
            {who(p)}
            <p className="why">{[why(p) ?? ts(p.status), p.attempts > 0 && t("attempt", { n: p.attempts })].filter(Boolean).join(" · ")}</p>
            <div className="acts">
              <a href={`tel:${p.phone}`} className={btnClass("primary", "sm")}><Phone size={14} aria-hidden />{t("call")}</a>
              {open(p)}
            </div>
          </div>
        );
      }
      case "confirm": {
        const p = k.parcel;
        return (
          <div key={`confirm-${p.id}`} className="todo">
            {who(p)}
            <p>{t("task.confirm")} · {p.client}</p>
            <div className="acts">
              <ConfirmOrder parcel={p} variant="primary" size="sm">{t("confirm")}</ConfirmOrder>
              {open(p)}
            </div>
          </div>
        );
      }
      case "assign": {
        const p = k.parcel;
        return (
          <div key={`assign-${p.id}`} className="todo">
            <Link href={`/shipments/${p.id}`}>{who(p)}</Link>
            <p>{ts(p.status)} {t("since", { time: p.time })}</p>
            <div className="acts"><AssignMenu parcel={p} options={day.courierOptions} label={t("assignCourier")} className="ui-field field pick" /></div>
          </div>
        );
      }
      case "zone": {
        const p = k.parcel;
        return (
          <div key={`zone-${p.id}`} className="todo">
            <b>{t("task.zone", { name: p.who })}</b>
            <p>{place(p)}</p>
            <div className="acts"><Link href={`/shipments/${p.id}/edit`} className={btnClass("secondary", "sm")}>{t("fix")}</Link></div>
          </div>
        );
      }
      case "cash":
        return (
          <div key={`cash-${k.courier.id}`} className="todo">
            <b>{t("task.cash", { name: k.courier.name, amount: formatMDL(k.courier.cash) })}</b>
            <p>{t("task.cashHint", { count: k.courier.cashPayments })}</p>
            <div className="acts"><ReceiveCash courier={k.courier} variant="secondary" size="sm">{t("receiveCash")}</ReceiveCash></div>
          </div>
        );
      case "sync":
        return (
          <div key="sync" className="todo">
            <b>{t("task.sync", { count: k.count })}</b>
            <div className="acts"><Link href="/sync" className={btnClass("secondary", "sm")}>{t("open")}</Link></div>
          </div>
        );
    }
  };

  return (
    <div className="day day-kraft">
      <header className="head">
        <h1>{t("today")} <span>· {fmtDayLong(new Date(`${day.date}T12:00:00Z`), locale)}</span></h1>
        <p className="sync"><i aria-hidden />{t("updated")}</p>
      </header>

      <div className="work">
        <div className="list">
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>{t("col.no")}</th>
                  <th>{t("col.recipient")}</th>
                  <th>{t("col.address")}</th>
                  <th className="r">{t("col.cod")}</th>
                  <th>{t("col.status")}</th>
                </tr>
              </thead>
              {day.couriers.map((c) => {
                const collected = c.stops.filter((p) => p.group === "done").reduce((a, p) => a + p.cod - p.codLeft, 0);
                return (
                  <tbody key={c.id}>
                    <tr className="gh">
                      <td colSpan={COLS}>
                        <div className="in">
                          <b>{c.name}</b>
                          {c.total > 0 && <Run courier={c} label={t("deliveredOf", { done: c.done, total: c.total })} />}
                          <span className="cnt">{c.total > 0 ? t("deliveredOf", { done: c.done, total: c.total }) : t("noParcels")}</span>
                          <div className="cash">
                            {c.cash > 0 ? (
                              <>
                                <span><b>{formatMDL(c.cash)}</b> <span className="cnt">{t("cash")}</span></span>
                                <ReceiveCash courier={c} variant="secondary" size="sm">{t("receive")}</ReceiveCash>
                              </>
                            ) : (
                              <span className="cnt">{formatMDL(0)} {t("cash")}</span>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                    {c.stops.filter((p) => p.group !== "done").map(row)}
                    {c.done > 0 && (
                      <tr className="fold">
                        <td colSpan={COLS}>
                          <Link className="in" href={`/shipments?status=DONE_TODAY&courier=${c.id}`}>
                            <Check size={16} strokeWidth={2.4} aria-hidden />
                            {collected > 0 ? t("kraft.doneWithCod", { count: c.done, amount: formatMDL(collected) }) : t("kraft.doneNoCod", { count: c.done })}
                            <ChevronRight size={16} aria-hidden />
                          </Link>
                        </td>
                      </tr>
                    )}
                  </tbody>
                );
              })}
              {day.counts.all > 0 && (
                <tbody>
                  <tr className="gh">
                    <td colSpan={COLS}>
                      <div className="in">
                        <b>{t("noCourier")}</b>
                        <span className="cnt">{day.unassigned.length > 0 ? t("count", { count: day.unassigned.length }) : t("kraft.allAssigned")}</span>
                      </div>
                    </td>
                  </tr>
                  {day.unassigned.map(row)}
                </tbody>
              )}
            </table>
          </div>
          {day.counts.all === 0 && <p className="empty">{day.couriers.length === 0 ? t("kraft.noCouriers") : t("noParcels")}</p>}
        </div>

        <aside className="side">
          <section>
            <h2>{t("kraft.todo")} <span>{day.tasks.length}</span></h2>
            {day.tasks.length === 0 ? <p className="none">{t("todoEmpty")}</p> : day.tasks.map(task)}
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
