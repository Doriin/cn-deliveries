import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { fmtDayLong } from "@/lib/dates";
import { formatMDL } from "@/lib/money";
import { DAY_END_HOUR, DAY_START_HOUR } from "@/lib/day";
import { StatusBadge } from "@/components/StatusBadge";
import { RowLink } from "@/app/(office)/shipments/RowLink";
import { filtered, groupHref, ReceiveCash, type DayViewProps } from "./shared";
import { SlideTabs, type SlideTab } from "./SlideTabs";

const GROUPS = ["all", "bad", "pickup", "depot", "road", "done"] as const;

/** Today in the Tactil design: one raised sheet, couriers on an hour line, a sliding filter and a dense table. */
export async function DayTactil({ day, filter }: DayViewProps) {
  const t = await getTranslations("day");
  const tr = await getTranslations("reason");
  const ts = await getTranslations("shipments");
  const locale = await getLocale();
  const rows = filtered(day, filter);
  const tabs: SlideTab[] = GROUPS.map((g) => ({ key: g, href: groupHref(g), label: t(`group.${g}`), count: day.counts[g], alert: g === "bad" && day.counts.bad > 0 }));
  const hours = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }, (_, i) => DAY_START_HOUR + i);
  const money = (bani: number) => formatMDL(bani);

  return (
    <div className="day day-tactil">
      <div className="sheet">
        <div className="head">
          <h1>{t("today")} <span>· {fmtDayLong(new Date(), locale)}</span></h1>
          <span className="live"><i aria-hidden />{t("updated")}</span>
        </div>

        {day.couriers.length > 0 && (
          <div className="hours">
            <div className="hrow scale" aria-hidden>
              <span />
              <div className="axis">{hours.map((h, i) => <span key={h} style={{ left: `${(i / (hours.length - 1)) * 100}%` }}>{String(h).padStart(2, "0")}</span>)}</div>
              <span />
            </div>
            {day.couriers.map((c) => (
              <div className="hrow" key={c.id}>
                <Link className="who" href={`/shipments?status=ACTIVE&courier=${c.id}`}><b>{c.name}</b><span>{t("ofTotal", { done: c.done, total: c.total })}</span></Link>
                <div className="axis">
                  {c.stops.filter((p) => p.group === "done" || p.group === "bad").map((p) => (
                    <Link key={p.id} href={`/shipments/${p.id}`} className="tk" data-bad={p.group === "bad" || undefined} style={{ left: `${p.at}%` }} title={`${p.time} · ${p.who}${p.city ? ", " + p.city : ""}${p.cod ? " · " + money(p.cod) : ""}`} />
                  ))}
                  <i className="nowline" style={{ left: `${day.now.at}%` }} data-time={day.now.time} aria-hidden />
                </div>
                <div className="cash">
                  <span><b>{money(c.cash)}</b> {t("cash")}</span>
                  {c.cash > 0 && <ReceiveCash courier={c} variant="secondary" size="sm">{t("receive")}</ReceiveCash>}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="bar2">
          <SlideTabs className="seg" tabs={tabs} active={filter} label={t("col.status")} />
          <Link className="ui-btn ui-btn-ghost" href="/shipments">{t("allShipments")}</Link>
        </div>

        <div className="tw">
          <table>
            <thead>
              <tr><th>{t("col.no")}</th><th>{t("col.recipient")}</th><th>{t("col.address")}</th><th>{t("col.courier")}</th><th className="r">{t("col.cod")}</th><th>{t("col.status")}</th><th className="r">{t("col.time")}</th></tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <RowLink key={p.id} href={`/shipments/${p.id}`} className={p.group === "done" ? "past" : undefined}>
                  <td><Link href={`/shipments/${p.id}`} className="ui-tracking">{p.short}</Link></td>
                  <td className="who">{p.who}</td>
                  <td className="where">{p.city && <b>{p.city}</b>}{p.city && ", "}{p.addr}{p.noZone && <em> · {ts("noZone")}</em>}</td>
                  <td className={p.courierName ? "soft" : "nil"}>{p.courierName ?? t("noCourier")}</td>
                  <td className={p.cod ? "r" : "r nil"}>{p.cod ? money(p.cod) : "—"}</td>
                  <td><StatusBadge status={p.status} />{p.reason && <small> {tr(p.reason)}</small>}{p.group === "bad" && p.attempts > 0 && <small> · {t("attempt", { n: p.attempts })}</small>}</td>
                  <td className="r soft">{p.time}</td>
                </RowLink>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <p className="empty">{day.counts.all === 0 ? t("noParcels") : t("emptyGroup")}</p>}

        <div className="sums">
          <span>{t("cod.collected")}<b>{money(day.sums.collected)}</b></span>
          <span>{t("cod.road")}<b>{money(day.sums.road)}</b></span>
          <span>{t("cod.depot")}<b>{money(day.sums.depot)}</b></span>
          <span>{t("codTotal")}<b>{money(day.sums.total)}</b></span>
        </div>
      </div>
    </div>
  );
}
