import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { PaymentMethod } from "@prisma/client";
import { change, PERIODS, ratio, type Kpi, type Period, type Stats } from "@/lib/stats";
import { BarList, Columns, Heatmap, SegBar, Spark } from "./charts";
import { Tips } from "./Tips";
import { formats, type Formats } from "./format";

const METHODS: PaymentMethod[] = ["CASH_RECEIPT", "CASH_NO_RECEIPT", "CARD", "TRANSFER"];
const METHOD_COLOR: Record<PaymentMethod, string> = { CASH_RECEIPT: "var(--hm-cash)", CASH_NO_RECEIPT: "var(--hm-cash-2)", CARD: "var(--hm-card)", TRANSFER: "var(--hm-transfer)" };
/** A Monday, to name the weekdays in the user's language. */
const A_MONDAY = "2026-11-16";

type T = Awaited<ReturnType<typeof getTranslations>>;

/** The trend half of the homepage: how the last 7, 30 or 90 days went, against the period before. */
export async function Performance({ stats, period, couriers, zones }: { stats: Stats; period: Period; couriers: Map<string, string>; zones: Map<string, string> }) {
  const [t, tr, ts, tc, locale] = await Promise.all([getTranslations("home"), getTranslations("reason"), getTranslations("status"), getTranslations("common"), getLocale()]);
  const f = formats(locale);
  const { kpis, days } = stats;
  const n = days.length;
  const xLabel = (i: number) => (period === 7 ? f.weekday(days[i]) : (n - 1 - i) % (period === 30 ? 7 : 14) === 0 ? f.dayMonth(days[i]) : null);
  const dayTitle = (i: number) => `${f.weekday(days[i])}, ${f.dayMonth(days[i])}`;
  const duration = (h: number | null) => (h === null ? "–" : h < 24 ? t("hours", { value: f.one(h) }) : t("days", { value: f.one(h / 24), n: h / 24 }));
  const o = stats.outcomes;
  const oTotal = o.firstTry + o.retry + o.returned + o.cancelled + o.open;
  const share = (v: number) => f.pct(ratio(v, oTotal));
  const weekdays = Array.from({ length: 7 }, (_, i) => f.weekday(new Date(Date.parse(`${A_MONDAY}T00:00:00Z`) + i * 86400000).toISOString().slice(0, 10)));
  const heatRows = stats.heat[6].some((v) => v > 0) ? 7 : 6;

  return (
    <section className="hm-perf" aria-labelledby="hm-perf">
      <header className="hm-head small">
        <h2 id="hm-perf">{t("performance")}<span>{t("vsBefore")}</span></h2>
        <nav className="hm-period" aria-label={t("period")}>
          {PERIODS.map((p) => (
            <Link key={p} href={p === 30 ? "/" : `/?p=${p}`} aria-current={p === period ? "page" : undefined} scroll={false}>{t("lastDays", { count: p })}</Link>
          ))}
        </nav>
      </header>

      <Tips>
        <div className="hm-kpis">
          <KpiTile label={t("kpi.shipments")} k={kpis.shipments} show={(v) => f.int(v)} t={t} f={f} />
          <KpiTile label={t("kpi.delivered")} k={kpis.delivered} show={(v) => f.int(v)} t={t} f={f} />
          <KpiTile label={t("kpi.successRate")} k={kpis.successRate} show={(v) => f.pct(v)} points t={t} f={f} hint={t("kpi.successHint")} />
          <KpiTile label={t("kpi.firstTry")} k={kpis.firstTry} show={(v) => f.pct(v)} points t={t} f={f} hint={t("kpi.firstTryHint")} />
          <KpiTile label={t("kpi.avgTime")} k={kpis.avgHours} show={duration} lowerIsBetter t={t} f={f} hint={t("kpi.avgTimeHint")} />
          <KpiTile label={t("kpi.fees")} k={kpis.fees} show={(v) => f.mdl(v)} t={t} f={f} hint={t("kpi.feesHint")} />
          <KpiTile label={t("kpi.cod")} k={kpis.cod} show={(v) => f.mdl(v)} t={t} f={f} />
        </div>

        <div className="hm-grid hm-grid-2">
          <article className="hm-card">
            <h2 className="hm-h">{t("volume")}<span className="hm-key"><i className="bar" />{t("created")}<i className="line" />{t("deliveredSeries")}</span></h2>
            <Columns
              label={t("volume")}
              bars={[{ name: t("created"), values: stats.volume.created, color: "var(--hm-a-soft)" }]}
              line={{ name: t("deliveredSeries"), values: stats.volume.delivered, color: "var(--hm-a)" }}
              xLabel={xLabel} fmt={(v) => f.int(v)} tipTitle={dayTitle}
            />
          </article>
          <article className="hm-card">
            <h2 className="hm-h">{t("codPerDay")}<span className="hm-key">{METHODS.map((m) => <span key={m}><i className="bar" style={{ background: METHOD_COLOR[m] }} />{tc(`method.${m}`)}</span>)}</span></h2>
            <Columns
              label={t("codPerDay")}
              stacked
              bars={METHODS.map((m) => ({ name: tc(`method.${m}`), values: stats.codByMethod[m], color: METHOD_COLOR[m] }))}
              xLabel={xLabel} fmt={(v) => f.mdlShort(v)} tipFmt={(v) => f.mdl(v)} tipTitle={dayTitle}
            />
          </article>
        </div>

        <div className="hm-grid hm-grid-3">
          <article className="hm-card">
            <h2 className="hm-h">{t("outcomes")}<span>{t("outcomesHint", { count: oTotal })}</span></h2>
            <SegBar thick parts={[
              { key: "first", label: t("outcome.firstTry"), value: o.firstTry, color: "var(--hm-done)", tip: `${t("outcome.firstTry")}\n${o.firstTry} · ${share(o.firstTry)}` },
              { key: "retry", label: t("outcome.retry"), value: o.retry, color: "var(--hm-done-2)", tip: `${t("outcome.retry")}\n${o.retry} · ${share(o.retry)}` },
              { key: "ret", label: t("outcome.returned"), value: o.returned, color: "var(--hm-back)", tip: `${t("outcome.returned")}\n${o.returned} · ${share(o.returned)}` },
              { key: "cancel", label: t("outcome.cancelled"), value: o.cancelled, color: "var(--hm-muted)", tip: `${t("outcome.cancelled")}\n${o.cancelled} · ${share(o.cancelled)}` },
              { key: "open", label: t("outcome.open"), value: o.open, color: "var(--hm-road)", tip: `${t("outcome.open")}\n${o.open} · ${share(o.open)}` },
            ]} />
          </article>
          <article className="hm-card">
            <h2 className="hm-h">{t("reasons")}</h2>
            <BarList color="var(--hm-bad)" empty={t("reasonsEmpty")} rows={stats.reasons.slice(0, 6).map((r) => ({
              key: `${r.status}${r.reason}`, value: r.count, display: f.int(r.count),
              label: <>{tr.has(r.reason) ? tr(r.reason) : r.reason}<small>{ts(r.status)}</small></>,
            }))} />
          </article>
          <article className="hm-card">
            <h2 className="hm-h">{t("zones")}</h2>
            <BarList empty={t("noData")} rows={stats.zones.map((z) => ({
              key: z.zone ?? "none", value: z.count, display: f.pct(ratio(z.count, oTotal)),
              label: z.zone ? zones.get(z.zone) ?? z.zone : t("noZoneShort"),
              tip: `${z.zone ? zones.get(z.zone) ?? z.zone : t("noZoneShort")}\n${t("shipmentsCount", { count: z.count })}\n${t("deliveredShare", { pct: f.pct(ratio(z.delivered, z.count)) })}`,
            }))} />
          </article>
        </div>

        <div className="hm-grid hm-grid-2">
          <article className="hm-card">
            <h2 className="hm-h">{t("clients")}</h2>
            <BarList empty={t("noData")} rows={stats.clients.slice(0, 6).map((c) => ({
              key: c.id, value: c.count, display: f.int(c.count), label: c.name, href: `/clients/${c.id}`,
              tip: `${c.name}\n${t("shipmentsCount", { count: c.count })}\n${t("codValue", { amount: f.mdl(c.cod) })}`,
            }))} />
          </article>
          <article className="hm-card">
            <h2 className="hm-h">{t("whenDelivered")}<span>{t("whenDeliveredHint")}</span></h2>
            <Heatmap grid={stats.heat.slice(0, heatRows)} rows={weekdays} from={8} to={20} label={t("whenDelivered")}
              tip={(r, h, v) => `${weekdays[r]}, ${String(h).padStart(2, "0")}:00–${String(h + 1).padStart(2, "0")}:00\n${t("deliveries", { count: v })}`} />
          </article>
        </div>

        <article className="hm-card hm-table">
          <h2 className="hm-h">{t("courierTable")}</h2>
          {stats.couriers.length === 0 ? <p className="hm-empty">{t("noData")}</p> : (
            <table>
              <thead>
                <tr><th>{t("col.courier")}</th><th>{t("col.delivered")}</th><th>{t("col.firstTry")}</th><th>{t("col.perDay")}</th><th>{t("col.failed")}</th><th>{t("col.cod")}</th></tr>
              </thead>
              <tbody>
                {stats.couriers.map((c) => (
                  <tr key={c.id}>
                    <td><Link href={`/couriers/${c.id}`}>{couriers.get(c.id) ?? "–"}</Link></td>
                    <td>{f.int(c.delivered)}</td>
                    <td>{f.pct(ratio(c.firstTry, c.delivered))}</td>
                    <td>{c.activeDays ? f.one(c.delivered / c.activeDays) : "–"}</td>
                    <td>{f.int(c.failed)}</td>
                    <td>{f.mdl(c.cod)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </article>
      </Tips>
    </section>
  );
}

function KpiTile({ label, k, show, points, lowerIsBetter, hint, t, f }: {
  label: string; k: Kpi; show: (v: number) => string; points?: boolean; lowerIsBetter?: boolean; hint?: string; t: T; f: Formats;
}) {
  const diff = points ? (k.value !== null && k.prev !== null ? k.value - k.prev : null) : change(k.value, k.prev);
  const flat = diff === null || Math.abs(diff) < (points ? 0.0005 : 0.005);
  const up = !flat && diff! > 0;
  const good = flat ? "flat" : up !== !!lowerIsBetter ? "good" : "bad";
  const text = diff === null ? t("noCompare") : points ? t("points", { value: `${diff >= 0 ? "+" : "−"}${f.one(Math.abs(diff) * 100)}` }) : `${diff >= 0 ? "+" : "−"}${f.pct(Math.abs(diff))}`;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="hm-kpi" data-tip={`${label}\n${hint ? `${hint}\n` : ""}${t("before")}: ${k.prev === null ? "–" : show(k.prev)}`}>
      <span className="lbl">{label}</span>
      <span className="val">{k.value === null ? "–" : show(k.value)}</span>
      <span className="delta" data-tone={good}><Icon size={13} aria-hidden />{text}</span>
      <Spark values={k.series} />
    </div>
  );
}
