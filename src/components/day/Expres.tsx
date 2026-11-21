import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { AlertTriangle, Check, ChevronRight, ClipboardList, Phone } from "lucide-react";
import { fmtDayLong } from "@/lib/dates";
import { formatKg, formatMDL } from "@/lib/money";
import type { DayParcel } from "@/lib/day";
import { AssignTo, ReceiveCash, type DayViewProps } from "./shared";

/**
 * Today in the Expres design: the courier is the starting point. Pick a courier on the left and their day
 * is listed stop by stop; the shape in front of each stop says its state before a word is read.
 */
export async function DayExpres({ day, params }: DayViewProps) {
  const t = await getTranslations("day");
  const ts = await getTranslations("status");
  const tr = await getTranslations("reason");
  const tsh = await getTranslations("shipments");
  const locale = await getLocale();

  const picked = params?.c ?? day.couriers.find((c) => c.total > 0)?.id ?? day.couriers[0]?.id ?? "none";
  const courier = day.couriers.find((c) => c.id === picked) ?? null;
  const stops = courier ? courier.stops : day.unassigned;
  const problems = day.parcels.filter((p) => p.group === "bad").slice(0, 2);
  const share = day.sums.total > 0 ? day.sums.collected / day.sums.total : 0;
  const pickHref = (id: string, open?: string) => `/?c=${id}${open ? `&open=${open}#s-${open}` : ""}`;
  const tel = (v: string) => `tel:${v.replace(/\s/g, "")}`;

  const sub = (p: DayParcel) => {
    const state = p.reason ? tr(p.reason) : ts(p.status);
    if (p.group === "done") return `${state} · ${p.time} · ${p.who}`;
    if (p.group === "bad") return `${state}${p.attempts > 0 ? " · " + t("attempt", { n: p.attempts }) : ""} · ${p.who}`;
    if (p.group === "pickup") return `${state} · ${p.pickup ?? p.client} · ${p.who}`;
    if (p.group === "depot") return `${state} ${t("since", { time: p.time })} · ${p.who}`;
    return `${state} · ${p.who}`;
  };

  return (
    <div className="day day-expres">
      <div className="list">
        <h1>{fmtDayLong(new Date(), locale)}</h1>
        <p className="sum">{t("summary", { done: day.counts.done, total: day.counts.all })}</p>

        {problems.map((p) => (
          <Link className="warn" key={p.id} href={pickHref(p.courierId ?? "none", p.id)}>
            <AlertTriangle aria-hidden />
            <span>{p.who}: {(p.reason ? tr(p.reason) : ts(p.status)).toLowerCase()}</span>
            <ChevronRight aria-hidden />
          </Link>
        ))}

        <h2>{t("couriers")}</h2>
        {day.couriers.map((c) => (
          <Link key={c.id} className="pick" href={pickHref(c.id)} scroll={false} aria-current={c.id === picked ? "true" : undefined}>
            <span className="av">{c.initials}</span>
            <span className="t"><b>{c.name}</b><span>{c.now ? [c.now.city, c.now.addr].filter(Boolean).join(", ") : c.total ? t("routeDone") : t("noParcels")}</span></span>
            <span className="f">{c.done}<small>/{c.total}</small></span>
          </Link>
        ))}
        <Link className="pick" href={pickHref("none")} scroll={false} aria-current={picked === "none" ? "true" : undefined}>
          <span className="av none">?</span>
          <span className="t"><b>{t("noCourier")}</b><span>{t("waitingAtDepot", { count: day.unassigned.length })}</span></span>
          <span className="f">{day.unassigned.length}</span>
        </Link>

        <Link className="tot" href="/cod">
          <span className="line"><span>{t("cod.collected")}</span><b>{formatMDL(day.sums.collected)}</b></span>
          <span className="meter" style={{ "--p": share } as React.CSSProperties}><i /></span>
          <span className="line"><span>{t("cod.total")}</span><span>{formatMDL(day.sums.total)}</span></span>
        </Link>
      </div>

      <div className="day-of">
        <div className="dh">
          <div>
            <h2>{courier ? courier.name : t("noCourier")}</h2>
            <p>
              {courier
                ? <><b>{t("deliveredOf", { done: courier.done, total: courier.total })}</b> · {t("left", { count: courier.left })}</>
                : <b>{t("waitingAtDepot", { count: day.unassigned.length })}</b>}
            </p>
          </div>
          {courier && (
            <div className="sp">
              {courier.phone && <a className="ui-btn ui-btn-secondary" href={tel(courier.phone)}><Phone className="h-4 w-4" aria-hidden />{t("call")}</a>}
              <Link className="ui-btn ui-btn-secondary" href={`/manifest?courier=${courier.id}`}><ClipboardList className="h-4 w-4" aria-hidden />{t("manifests")}</Link>
            </div>
          )}
        </div>

        {courier && courier.cash > 0 && (
          <div className="cashrow">
            <div><div className="n">{formatMDL(courier.cash)}</div><span>{t("cashAt", { name: courier.name.split(" ")[0] })}</span></div>
            <ReceiveCash courier={courier} className="loud">{t("receiveCash")}</ReceiveCash>
          </div>
        )}

        <div className="stops">
          {stops.map((p, i) => (
            <details className="stop" key={p.id} id={`s-${p.id}`} name="stop" data-group={p.group} open={params?.open === p.id}>
              <summary>
                <span className="shape">{p.group === "done" ? <Check aria-hidden /> : p.group === "bad" ? <span>!</span> : <span>{i + 1}</span>}</span>
                <span className="t"><b>{p.city ?? p.who}</b> <span>{p.addr}</span><small>{sub(p)}</small></span>
                <span className="a"><b className={p.cod ? undefined : "nil"}>{p.cod ? formatMDL(p.cod) : t("cod.none")}</b><small>{p.trackingNo}</small></span>
                <ChevronRight className="chev" aria-hidden />
              </summary>
              <div className="in">
                <dl>
                  <div><dt>{t("col.recipient")}</dt><dd>{p.who}</dd></div>
                  <div><dt>{tsh("recipientPhone")}</dt><dd>{p.phone}</dd></div>
                  <div><dt>{tsh("parcel")}</dt><dd>{p.pieces} × {p.weightGrams ? formatKg(p.weightGrams) : "—"}</dd></div>
                  <div><dt>{tsh("client")}</dt><dd>{p.client}</dd></div>
                </dl>
                <div className="acts">
                  {courier
                    ? <a className="ui-btn ui-btn-secondary" href={tel(p.phone)}><Phone className="h-4 w-4" aria-hidden />{t("call")}</a>
                    : day.courierOptions.map((c) => <AssignTo key={c.id} parcel={p} courierId={c.id} variant="secondary">{t("giveTo", { name: c.name.split(" ")[0] })}</AssignTo>)}
                  <Link className="ui-btn ui-btn-ghost" href={`/shipments/${p.id}`}>{t("open")}<ChevronRight className="h-4 w-4" aria-hidden /></Link>
                </div>
              </div>
            </details>
          ))}
          {stops.length === 0 && <p className="empty">{t("noParcels")}</p>}
        </div>
      </div>
    </div>
  );
}
