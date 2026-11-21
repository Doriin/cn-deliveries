import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Banknote, ClipboardCheck, FileSpreadsheet, MapPinOff, Package, Phone, TriangleAlert } from "lucide-react";
import { btnClass } from "@/components/ui";
import { fmtDayLong } from "@/lib/dates";
import { formatMDL } from "@/lib/money";
import type { DayCourier, DayGroup, DayParcel, DayTask } from "@/lib/day";
import { AssignMenu, ConfirmOrder, ReceiveCash, place, type DayViewProps } from "./shared";

/** A figure for a column or list whose heading already names the currency. */
const amount = (bani: number) => formatMDL(bani).replace(/\sMDL$/, "");

/** The day's stages in the order the bar is read, each with the closest filter of the shipments list. */
const STAGES: { group: DayGroup; href: string }[] = [
  { group: "done", href: "/shipments?status=DONE_TODAY" },
  { group: "road", href: "/shipments?status=OUT_FOR_DELIVERY" },
  { group: "pickup", href: "/shipments?status=NEW" },
  { group: "depot", href: "/shipments?status=AT_WAREHOUSE" },
  { group: "back", href: "/shipments?status=RETURNING" },
  { group: "bad", href: "/shipments?status=PROBLEMS" },
];

const ICON = { size: 22, "aria-hidden": true } as const;

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

/** Today in the "verde" design: one sentence about the day, then what to do, each thing with its own button. */
export async function DayVerde({ day }: DayViewProps) {
  const [t, tr, ts, locale] = await Promise.all([getTranslations("day"), getTranslations("reason"), getTranslations("status"), getLocale()]);
  const date = fmtDayLong(new Date(`${day.date}T12:00:00Z`), locale);
  const road = day.parcels.filter((p) => p.group === "road");
  const stages = STAGES.filter((s) => day.counts[s.group] > 0 || (s.group !== "back" && day.counts.all > 0));
  const dots = (parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" · ");
  const open = (p: DayParcel) => <Link href={`/shipments/${p.id}`} className={btnClass("secondary", "sm")}>{t("open")}</Link>;

  const task = (k: DayTask) => {
    switch (k.kind) {
      case "problem": {
        const p = k.parcel;
        return (
          <div key={`problem-${p.id}`} className="task bad">
            <TriangleAlert {...ICON} />
            <div className="txt">
              <b>{t("task.problem", { name: p.who, status: p.reason && tr.has(p.reason) ? tr(p.reason) : ts(p.status) })}</b>
              <span>{dots([place(p), p.attempts > 0 && t("attempt", { n: p.attempts }), p.codLeft > 0 && formatMDL(p.codLeft)])}</span>
            </div>
            <div className="acts">
              {open(p)}
              <a href={`tel:${p.phone}`} className={btnClass("primary", "sm")}><Phone size={16} aria-hidden />{t("call")}</a>
            </div>
          </div>
        );
      }
      case "confirm": {
        const p = k.parcel;
        return (
          <div key={`confirm-${p.id}`} className="task">
            <ClipboardCheck {...ICON} />
            <div className="txt">
              <b>{t("task.confirm")}</b>
              <span>{dots([[p.who, p.city].filter(Boolean).join(", "), p.client])}</span>
            </div>
            <div className="acts">
              {open(p)}
              <ConfirmOrder parcel={p} variant="primary" size="sm">{t("confirm")}</ConfirmOrder>
            </div>
          </div>
        );
      }
      case "assign": {
        const p = k.parcel;
        return (
          <div key={`assign-${p.id}`} className="task">
            <Package {...ICON} />
            <Link className="txt" href={`/shipments/${p.id}`}>
              <b>{t("task.assign", { city: p.city ?? p.who })}</b>
              <span>{dots([p.city && p.who, `${ts(p.status)} ${t("since", { time: p.time })}`, p.codLeft > 0 && formatMDL(p.codLeft)])}</span>
            </Link>
            <div className="acts"><AssignMenu parcel={p} options={day.courierOptions} label={t("assignCourier")} className="ui-field field pick" /></div>
          </div>
        );
      }
      case "zone": {
        const p = k.parcel;
        return (
          <div key={`zone-${p.id}`} className="task">
            <MapPinOff {...ICON} />
            <div className="txt">
              <b>{t("task.zone", { name: p.who })}</b>
              <span>{place(p)}</span>
            </div>
            <div className="acts"><Link href={`/shipments/${p.id}/edit`} className={btnClass("secondary", "sm")}>{t("fix")}</Link></div>
          </div>
        );
      }
      case "cash":
        return (
          <div key={`cash-${k.courier.id}`} className="task cash">
            <Banknote {...ICON} />
            <div className="txt">
              <b>{t("task.cash", { name: k.courier.name, amount: formatMDL(k.courier.cash) })}</b>
              <span>{t("task.cashHint", { count: k.courier.cashPayments })}</span>
            </div>
            <div className="acts"><ReceiveCash courier={k.courier} variant="secondary" size="sm">{t("receiveCash")}</ReceiveCash></div>
          </div>
        );
      case "sync":
        return (
          <div key="sync" className="task">
            <FileSpreadsheet {...ICON} />
            <div className="txt"><b>{t("task.sync", { count: k.count })}</b></div>
            <div className="acts"><Link href="/sync" className={btnClass("secondary", "sm")}>{t("open")}</Link></div>
          </div>
        );
    }
  };

  return (
    <div className="day day-verde">
      <div className="main">
        <h1>{date.charAt(0).toUpperCase() + date.slice(1)}</h1>
        <p className="lede">
          {day.counts.all === 0 ? (
            t("noParcels")
          ) : (
            <>
              {t.rich("verde.lede", { done: day.counts.done, total: day.counts.all, b: (c) => <b>{c}</b> })}{" "}
              {t.rich("verde.need", { count: day.tasks.length, n: (c) => <b className={day.counts.bad > 0 ? "bad" : undefined}>{c}</b> })}
            </>
          )}
        </p>

        <div className="h2"><h2>{t("todo")}</h2>{day.tasks.length > 0 && <span>{day.tasks.length}</span>}</div>
        {day.tasks.length === 0 ? <p className="none">{t("todoEmpty")}</p> : day.tasks.map(task)}

        <div className="h2">
          <h2>{t("verde.onRoad")}</h2>
          {road.length > 0 && <span>{road.length}</span>}
          <Link href="/shipments">{t("allShipments")}</Link>
        </div>
        {road.length === 0 ? (
          <p className="none">{t("verde.roadEmpty")}</p>
        ) : (
          <div className="quiet">
            {road.map((p) => (
              <Link key={p.id} className="row" href={`/shipments/${p.id}`}>
                <b>{p.who}</b>
                <span className="where">{place(p)}</span>
                <span className={p.cod > 0 ? "amt" : "amt nil"}>{p.cod > 0 ? amount(p.cod) : "—"}</span>
                <span className={p.courierName ? "st" : "st nil"}><i aria-hidden />{p.courierName ?? t("noCourier")}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <aside className="side">
        <section>
          <h2>{t("verde.state")} <span>{t("verde.parcels", { count: day.counts.all })}</span></h2>
          {day.counts.all === 0 ? (
            <p className="none">{t("noParcels")}</p>
          ) : (
            <>
              <div className="split" role="img" aria-label={stages.map((s) => `${day.counts[s.group]} ${t(`group.${s.group}`)}`).join(", ")}>
                {stages.filter((s) => day.counts[s.group] > 0).map((s) => <i key={s.group} className={s.group} style={{ flexGrow: day.counts[s.group] }} />)}
              </div>
              <div className="legend">
                {stages.map((s) => (
                  <Link key={s.group} href={s.href} className={s.group === "bad" && day.counts.bad > 0 ? "bad" : undefined}>
                    <span><i className={s.group} aria-hidden />{t(`group.${s.group}`)}</span>
                    <b>{day.counts[s.group]}</b>
                  </Link>
                ))}
              </div>
            </>
          )}
        </section>

        <section>
          <h2>{t("couriers")} <Link href="/manifest">{t("manifests")}</Link></h2>
          {day.couriers.length === 0 && <p className="none">{t("verde.noCouriers")}</p>}
          {day.couriers.map((c) => (
            <div key={c.id} className="cr">
              <div className="top">
                <b>{c.name}</b>
                {c.total > 0 && <span>{t("ofTotal", { done: c.done, total: c.total })}</span>}
              </div>
              {c.total > 0 && <Run courier={c} label={t("deliveredOf", { done: c.done, total: c.total })} />}
              <p>{c.now ? `${t("now")}: ${c.now.city ?? c.now.addr}` : c.total > 0 ? t("routeDone") : t("noParcels")}</p>
            </div>
          ))}
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
  );
}
