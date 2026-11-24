import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { AlertTriangle, Banknote, ChevronRight, CircleCheck, MapPinOff, PackagePlus, Phone, Plus, RefreshCw, Truck, UserPlus } from "lucide-react";
import type { PaymentMethod } from "@prisma/client";
import type { Day, DayCourier, DayTask } from "@/lib/day";
import { fmtDayLong } from "@/lib/dates";
import { btnClass, LinkButton } from "@/components/ui";
import { AssignMenu, ConfirmOrder, ReceiveCash } from "@/components/day/shared";
import { Columns, SegBar, type Part } from "./charts";
import { Tips } from "./Tips";
import { formats, GROUP_HREF, GROUP_ORDER, groupColor, reasonOrStatus } from "./format";

const METHODS: PaymentMethod[] = ["CASH_RECEIPT", "CASH_NO_RECEIPT", "CARD", "TRANSFER"];
const HOUR_FROM = 8;
const HOUR_TO = 20;
const TASKS_SHOWN = 6;

type Flow = { hours: { today: number[]; typical: number[] }; paid: Record<PaymentMethod, number> };

/** The live half of the homepage: today's progress, money, what needs the office, and each courier. */
export async function Live({ day, flow }: { day: Day; flow: Flow }) {
  const [t, tg, tr, ts, tc, locale] = await Promise.all([
    getTranslations("home"), getTranslations("day.group"), getTranslations("reason"), getTranslations("status"), getTranslations("common"), getLocale(),
  ]);
  const f = formats(locale);
  const parts: Part[] = GROUP_ORDER.map((g) => ({ key: g, label: tg(g), value: day.counts[g], color: groupColor(g), href: GROUP_HREF[g] }));
  const hours = Array.from({ length: HOUR_TO - HOUR_FROM }, (_, i) => HOUR_FROM + i);
  const [hh, mm] = day.now.time.split(":").map(Number);
  const nowAt = hh + mm / 60 - HOUR_FROM;
  const paidTotal = METHODS.reduce((a, m) => a + flow.paid[m], 0);
  const methodColor: Record<PaymentMethod, string> = { CASH_RECEIPT: "var(--hm-cash)", CASH_NO_RECEIPT: "var(--hm-cash-2)", CARD: "var(--hm-card)", TRANSFER: "var(--hm-transfer)" };
  const pctDone = day.counts.all ? day.counts.done / day.counts.all : 0;

  return (
    <section className="hm-live" aria-labelledby="hm-today">
      <header className="hm-head">
        <div>
          <h1 id="hm-today">{t("today")} <span>· {fmtDayLong(new Date(), locale)}</span></h1>
          <p className="hm-sync"><i aria-hidden />{t("live", { time: day.now.time })}</p>
        </div>
        <LinkButton href="/shipments/new" size="md"><Plus size={16} aria-hidden />{t("newShipment")}</LinkButton>
      </header>

      <Tips className="hm-grid hm-grid-live">
        <article className="hm-card hm-hero">
          <div className="hm-hero-top">
            <p className="hm-big">
              <b>{day.counts.done}</b><span>/ {day.counts.all}</span>
            </p>
            <p className="hm-hero-sub">
              {t("deliveredToday", { pct: f.pct(pctDone) })}
              <span>{t("createdToday", { count: day.createdToday })}</span>
            </p>
          </div>
          <SegBar parts={parts} thick />
        </article>

        <article className="hm-card hm-hours">
          <h2 className="hm-h">{t("perHour")}<span>{t("perHourHint")}</span></h2>
          <Columns
            label={t("perHour")}
            height={132}
            bars={[{ name: t("todaySeries"), values: hours.map((h) => flow.hours.today[h]), color: "var(--hm-a)" }]}
            line={{ name: t("usualSeries"), values: hours.map((h) => Math.round(flow.hours.typical[h] * 10) / 10), color: "var(--hm-ghost)", dashed: true }}
            nowAt={nowAt}
            xLabel={(i) => (i % 2 === 0 ? String(hours[i]).padStart(2, "0") : null)}
            fmt={(v) => f.one(v)}
            tipTitle={(i) => `${String(hours[i]).padStart(2, "0")}:00–${String(hours[i] + 1).padStart(2, "0")}:00`}
          />
        </article>

        <article className="hm-card hm-money">
          <h2 className="hm-h">{t("moneyToday")}</h2>
          <dl className="hm-kv">
            <div className="lead"><dt>{t("collected")}</dt><dd>{f.mdl(paidTotal)}</dd></div>
          </dl>
          <SegBar legend={false} parts={METHODS.map((m) => ({ key: m, label: tc(`method.${m}`), value: flow.paid[m], color: methodColor[m], tip: `${tc(`method.${m}`)}\n${f.mdl(flow.paid[m])}` }))} />
          <ul className="hm-legend small">
            {METHODS.filter((m) => flow.paid[m] > 0).map((m) => <li key={m}><i style={{ background: methodColor[m] }} />{tc(`method.${m}`)}<b>{f.mdl(flow.paid[m])}</b></li>)}
          </ul>
          <dl className="hm-kv">
            <div><dt>{t("toCollectRoad")}</dt><dd>{f.mdl(day.sums.road)}</dd></div>
            <div><dt>{t("atDepot")}</dt><dd>{f.mdl(day.sums.depot)}</dd></div>
            <div><dt><Link href="/cod">{t("cashWithCouriers")}</Link></dt><dd>{f.mdl(day.sums.cashHeld)}</dd></div>
          </dl>
        </article>
      </Tips>

      <div className="hm-grid hm-grid-ops">
        <Attention day={day} t={t} tr={tr} ts={ts} f={f} />
        <section className="hm-couriers" aria-labelledby="hm-couriers">
          <h2 id="hm-couriers" className="hm-h">{t("couriers")}<span>{t("couriersHint")}</span></h2>
          {day.couriers.length === 0 ? <p className="hm-empty">{t("noCouriers")}</p> : (
            <ul>{day.couriers.map((c) => <CourierCard key={c.id} c={c} t={t} f={f} />)}</ul>
          )}
        </section>
      </div>
    </section>
  );
}

type T = Awaited<ReturnType<typeof getTranslations>>;
type Tr = T;
type Ts = T;
type F = ReturnType<typeof formats>;

function Attention({ day, t, tr, ts, f }: { day: Day; t: T; tr: Tr; ts: Ts; f: F }) {
  const row = (k: DayTask) => {
    switch (k.kind) {
      case "problem": {
        const p = k.parcel;
        return (
          <li key={`p${p.id}`} data-tone="bad">
            <AlertTriangle size={16} aria-hidden />
            <div className="txt"><b>{p.who}{p.city ? `, ${p.city}` : ""}</b><span>{reasonOrStatus(p.status, p.reason, tr, ts)}{p.attempts ? ` · ${t("attempt", { n: p.attempts })}` : ""}{p.codLeft ? ` · ${f.mdl(p.codLeft)}` : ""}</span></div>
            <div className="acts">
              <a className={btnClass("secondary", "sm")} href={`tel:${p.phone.replace(/\s/g, "")}`}><Phone size={14} aria-hidden />{t("call")}</a>
              <LinkButton href={`/shipments/${p.id}`} variant="ghost" size="sm">{t("open")}</LinkButton>
            </div>
          </li>
        );
      }
      case "confirm": {
        const p = k.parcel;
        return (
          <li key={`c${p.id}`} data-tone="new">
            <PackagePlus size={16} aria-hidden />
            <div className="txt"><b>{t("toConfirm")}</b><span>{p.client} → {p.who}{p.city ? `, ${p.city}` : ""}</span></div>
            <div className="acts"><ConfirmOrder parcel={p} variant="secondary" size="sm">{t("confirm")}</ConfirmOrder></div>
          </li>
        );
      }
      case "assign": {
        const p = k.parcel;
        return (
          <li key={`a${p.id}`} data-tone="assign">
            <UserPlus size={16} aria-hidden />
            <div className="txt"><b>{t("noCourier", { city: p.city ?? p.addr })}</b><span>{p.who} · {ts(p.status)}</span></div>
            <div className="acts"><AssignMenu parcel={p} options={day.courierOptions} label={t("assign")} /></div>
          </li>
        );
      }
      case "zone": {
        const p = k.parcel;
        return (
          <li key={`z${p.id}`} data-tone="zone">
            <MapPinOff size={16} aria-hidden />
            <div className="txt"><b>{t("noZone", { name: p.who })}</b><span>{p.city ?? ""} {p.addr}</span></div>
            <div className="acts"><LinkButton href={`/shipments/${p.id}/edit`} variant="secondary" size="sm">{t("fix")}</LinkButton></div>
          </li>
        );
      }
      case "cash":
        return (
          <li key={`m${k.courier.id}`} data-tone="cash">
            <Banknote size={16} aria-hidden />
            <div className="txt"><b>{t("cashTask", { name: k.courier.name, amount: f.mdl(k.courier.cash) })}</b><span>{t("payments", { count: k.courier.cashPayments })}</span></div>
            <div className="acts"><ReceiveCash courier={k.courier} variant="secondary" size="sm">{t("receive")}</ReceiveCash></div>
          </li>
        );
      case "sync":
        return (
          <li key="sync" data-tone="bad">
            <RefreshCw size={16} aria-hidden />
            <div className="txt"><b>{t("syncErrors", { count: k.count })}</b></div>
            <div className="acts"><LinkButton href="/sync" variant="secondary" size="sm">{t("open")}</LinkButton></div>
          </li>
        );
    }
  };
  const first = day.tasks.slice(0, TASKS_SHOWN);
  const more = day.tasks.slice(TASKS_SHOWN);
  return (
    <section className="hm-card hm-todo" aria-labelledby="hm-todo">
      <h2 id="hm-todo" className="hm-h">{t("todo")}<span className="hm-count">{day.tasks.length}</span></h2>
      {day.tasks.length === 0 ? (
        <p className="hm-calm"><CircleCheck size={18} aria-hidden />{t("todoEmpty")}</p>
      ) : (
        <>
          <ul>{first.map(row)}</ul>
          {more.length > 0 && (
            <details>
              <summary>{t("showMore", { count: more.length })}</summary>
              <ul>{more.map(row)}</ul>
            </details>
          )}
        </>
      )}
    </section>
  );
}

function CourierCard({ c, t, f }: { c: DayCourier; t: T; f: F }) {
  const failed = c.stops.filter((s) => s.group === "bad").length;
  const pct = c.total ? (c.done / c.total) * 100 : 0;
  const badPct = c.total ? (failed / c.total) * 100 : 0;
  const state = c.total === 0 ? t("courierFree") : c.left === 0 ? t("courierDone") : c.now ? t("courierAt", { place: c.now.city ?? c.now.who }) : t("courierWaiting");
  return (
    <li>
      <Link href={`/couriers/${c.id}`} className="hm-courier">
        <span className="ava" aria-hidden>{c.initials}</span>
        <span className="who"><b>{c.name}</b><span>{state}</span></span>
        <span className="num"><b>{c.done}</b>/{c.total}</span>
        <span className="bar" aria-hidden><span className="ok" style={{ width: `${pct}%` }} /><span className="bad" style={{ width: `${badPct}%` }} /></span>
        <span className="meta">
          <span><Truck size={13} aria-hidden />{t("stopsLeft", { count: c.left })}</span>
          {c.cash > 0 && <span><Banknote size={13} aria-hidden />{f.mdl(c.cash)}</span>}
        </span>
        <ChevronRight className="go" size={16} aria-hidden />
      </Link>
    </li>
  );
}
