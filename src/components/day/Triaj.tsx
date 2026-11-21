import Link from "next/link";
import type { ReactNode } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { RiArrowRightUpLine, RiCheckLine, RiCoinsLine, RiErrorWarningLine, RiFileExcel2Line, RiMapPinLine, RiPhoneLine, RiTruckLine } from "@remixicon/react";
import { fmtDayLong } from "@/lib/dates";
import { formatMDL } from "@/lib/money";
import type { DayCourier, DayGroup, DayParcel, DayTask } from "@/lib/day";
import { AssignMenu, ConfirmOrder, ReceiveCash, groupHref, place, type DayViewProps } from "./shared";
import { TriageList, type TriageItem } from "./TriageList";

const VIEWS = ["all", "bad", "road", "pickup", "depot", "done"] as const;

/** Today in the Triaj design: an inbox of what needs doing, worked through from the keyboard, with the chosen item in full beside it. */
export async function DayTriaj({ day, filter }: DayViewProps) {
  const [t, tr, ts, locale] = await Promise.all([getTranslations("day"), getTranslations("reason"), getTranslations("status"), getLocale()]);
  const reason = (p: DayParcel) => (p.reason && tr.has(p.reason) ? tr(p.reason) : ts(p.status));
  const dots = (parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" · ");
  const kbd = (k: string) => <kbd>{k}</kbd>;

  const row = (tone: string, icon: ReactNode, title: ReactNode, sub: string, right?: string) => (
    <>
      <span className="tr-ico" data-tone={tone}>{icon}</span>
      <span className="tr-row-t"><b>{title}</b><small>{sub}</small></span>
      {right && <span className="tr-row-r">{right}</span>}
    </>
  );

  const parcelDetail = (p: DayParcel, lead: ReactNode, actions: ReactNode) => (
    <>
      <div className="tr-d-head">
        <span className="ui-tracking">{p.trackingNo}</span>
        <span className="tr-pill" data-g={p.group}><i />{p.group === "bad" ? reason(p) : ts(p.status)}</span>
      </div>
      <h2>{p.who}</h2>
      {lead && <p className="tr-lead">{lead}</p>}
      <div className="tr-acts">{actions}</div>
      <dl className="tr-facts">
        <dt>{t("triaj.phone")}</dt><dd><a href={`tel:${p.phone}`}>{p.phone}</a></dd>
        <dt>{t("col.address")}</dt><dd>{place(p) || "—"}</dd>
        <dt>{t("triaj.client")}</dt><dd>{p.client}</dd>
        <dt>{t("col.courier")}</dt><dd>{p.courierName ?? <span className="tr-muted">{t("noCourier")}</span>}</dd>
        <dt>{t("col.cod")}</dt><dd>{p.cod ? <>{formatMDL(p.codLeft)}{p.codLeft !== p.cod && <span className="tr-muted"> / {formatMDL(p.cod)}</span>}</> : <span className="tr-muted">{t("cod.none")}</span>}</dd>
        {p.attempts > 0 && <><dt>{t("triaj.attempts")}</dt><dd>{t("attempt", { n: p.attempts })}</dd></>}
        <dt>{t("triaj.pieces")}</dt><dd>{p.pieces} · {(p.weightGrams / 1000).toLocaleString(locale)} kg</dd>
        {p.notes && <><dt>{t("triaj.notes")}</dt><dd className="tr-note">{p.notes}</dd></>}
      </dl>
    </>
  );
  const open = (p: DayParcel) => <Link href={`/shipments/${p.id}`} className="ui-btn ui-btn-secondary ui-btn-sm">{t("open")} {kbd("↵")}</Link>;
  const call = (p: DayParcel) => <a data-key="call" href={`tel:${p.phone}`} className="ui-btn ui-btn-secondary ui-btn-sm"><RiPhoneLine />{t("call")} {kbd("C")}</a>;
  const assign = (p: DayParcel) => <span data-key="assign" className="tr-assign"><AssignMenu parcel={p} options={day.courierOptions} label={t("assign")} className="ui-field tr-pick" />{kbd("A")}</span>;

  const courierDetail = (c: DayCourier) => (
    <>
      <div className="tr-d-head"><span className="tr-muted">{t("couriers")}</span></div>
      <h2>{c.name}</h2>
      <p className="tr-lead">{t("task.cash", { name: c.name.split(" ")[0], amount: formatMDL(c.cash) })}. {t("task.cashHint", { count: c.cashPayments })}.</p>
      <div className="tr-acts">
        <span data-key="receive" className="contents"><ReceiveCash courier={c} size="sm">{t("receiveCash")} <kbd>R</kbd></ReceiveCash></span>
        {c.phone && <a data-key="call" href={`tel:${c.phone}`} className="ui-btn ui-btn-secondary ui-btn-sm"><RiPhoneLine />{t("call")} {kbd("C")}</a>}
      </div>
      <dl className="tr-facts">
        <dt>{t("triaj.progress")}</dt><dd>{t("deliveredOf", { done: c.done, total: c.total })}</dd>
        <dt>{t("radar.now")}</dt><dd>{c.now ? place(c.now) || c.now.who : "—"}</dd>
      </dl>
    </>
  );

  const fromTask = (k: DayTask): TriageItem => {
    switch (k.kind) {
      case "problem": {
        const p = k.parcel;
        return { key: `p${p.id}`, href: `/shipments/${p.id}`,
          row: row("bad", <RiErrorWarningLine />, p.who, dots([reason(p), place(p)]), p.time),
          detail: parcelDetail(p, dots([reason(p), p.attempts > 0 && t("attempt", { n: p.attempts })]), <>{call(p)}{open(p)}</>) };
      }
      case "confirm": {
        const p = k.parcel;
        return { key: `c${p.id}`, href: `/shipments/${p.id}`,
          row: row("new", <RiCheckLine />, t("task.confirm"), dots([p.who, p.city, p.client]), p.time),
          detail: parcelDetail(p, t("task.confirm"), <><span data-key="confirm" className="contents"><ConfirmOrder parcel={p} size="sm">{t("confirm")} <kbd>X</kbd></ConfirmOrder></span>{open(p)}</>) };
      }
      case "assign": {
        const p = k.parcel;
        return { key: `a${p.id}`, href: `/shipments/${p.id}`,
          row: row("assign", <RiTruckLine />, t("task.assign", { city: p.city ?? p.who }), dots([p.who, p.addr])),
          detail: parcelDetail(p, t("task.assign", { city: p.city ?? p.who }), <>{assign(p)}{open(p)}</>) };
      }
      case "zone": {
        const p = k.parcel;
        return { key: `z${p.id}`, href: `/shipments/${p.id}/edit`,
          row: row("zone", <RiMapPinLine />, t("task.zone", { name: p.who }), place(p)),
          detail: parcelDetail(p, t("task.zone", { name: p.who }), <Link href={`/shipments/${p.id}/edit`} className="ui-btn ui-btn-primary ui-btn-sm">{t("fix")} {kbd("↵")}</Link>) };
      }
      case "cash": {
        const c = k.courier;
        return { key: `m${c.id}`, href: `/cod`,
          row: row("cash", <RiCoinsLine />, t("task.cash", { name: c.name, amount: formatMDL(c.cash) }), t("task.cashHint", { count: c.cashPayments })),
          detail: courierDetail(c) };
      }
      case "sync":
        return { key: "sync", href: "/sync", row: row("sync", <RiFileExcel2Line />, t("task.sync", { count: k.count }), "Google Sheets"),
          detail: <><h2>{t("task.sync", { count: k.count })}</h2><div className="tr-acts"><Link href="/sync" className="ui-btn ui-btn-primary ui-btn-sm">{t("open")} {kbd("↵")}</Link></div></> };
    }
  };

  const fromParcel = (p: DayParcel): TriageItem => ({
    key: p.id, href: `/shipments/${p.id}`,
    row: row(p.group, <i className="tr-dot" data-g={p.group} />, p.who, dots([p.group === "bad" ? reason(p) : ts(p.status), place(p), p.courierName]), p.cod ? formatMDL(p.cod) : undefined),
    detail: parcelDetail(p, null, <>{p.status === "NEW" && <span data-key="confirm" className="contents"><ConfirmOrder parcel={p} size="sm">{t("confirm")} <kbd>X</kbd></ConfirmOrder></span>}{!p.courierId && p.group !== "done" && assign(p)}{call(p)}{open(p)}</>),
  });

  const items = filter === "all" ? day.tasks.map(fromTask) : day.parcels.filter((p) => p.group === filter).map(fromParcel);
  const count = (g: (typeof VIEWS)[number]) => (g === "all" ? day.tasks.length : day.counts[g as DayGroup]);

  return (
    <div className="day day-triaj">
      <header className="tr-head">
        <div>
          <h1>{filter === "all" ? t("triaj.inbox") : t(`group.${filter}`)}</h1>
          <p>{fmtDayLong(new Date(`${day.date}T12:00:00Z`), locale)} · {t("triaj.stats", { done: day.counts.done, total: day.counts.all, cash: formatMDL(day.sums.collected), held: formatMDL(day.sums.cashHeld) })}</p>
        </div>
        <Link href="/shipments" className="tr-all">{t("allShipments")}<RiArrowRightUpLine /></Link>
      </header>
      <nav className="tr-views" aria-label={t("col.status")}>
        {VIEWS.map((g) => (
          <Link key={g} href={groupHref(g)} scroll={false} replace aria-current={filter === g ? "page" : undefined} data-alert={(g === "bad" && day.counts.bad > 0) || undefined}>
            {g === "all" ? t("triaj.inbox") : t(`group.${g}`)}<b>{count(g)}</b>
          </Link>
        ))}
      </nav>
      <TriageList
        items={items}
        empty={<><b>{filter === "all" ? t("triaj.zero") : t("emptyGroup")}</b><span>{filter === "all" ? t("todoEmpty") : ""}</span></>}
        hints={[{ k: "J K", label: t("triaj.move") }, { k: "↵", label: t("open") }, { k: "C", label: t("call") }, { k: "A", label: t("assign") }, { k: "R", label: t("receive") }]}
      />
    </div>
  );
}
