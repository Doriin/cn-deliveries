import type { PaymentMethod, ShipmentStatus } from "@prisma/client";

/**
 * The numbers behind the homepage graphs. The loader (`loadStats` in stats.server.ts) fetches the rows of the
 * chosen period plus the period before; everything is counted here, in Moldova time, so it can be tested.
 */

export const PERIODS = [7, 30, 90] as const;
export type Period = (typeof PERIODS)[number];
export const parsePeriod = (v: string | undefined): Period => (PERIODS.find((p) => String(p) === v) ?? 30);

const DAY_MS = 86400000;
const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T12:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);

/** The last `n` days ending with `today` (YYYY-MM-DD), oldest first. */
export function lastDays(today: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addDays(today, i - n + 1));
}

export type Moment = { day: string; hour: number; /** Monday = 0 … Sunday = 6 */ weekday: number };
const MOLDOVA = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Chisinau", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23", weekday: "short" });
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Day, hour and weekday of an instant in Moldova time. */
export function moment(d: Date): Moment {
  const p = MOLDOVA.formatToParts(d);
  const get = (t: string) => p.find((x) => x.type === t)!.value;
  return { day: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")), weekday: WEEKDAYS.indexOf(get("weekday")) };
}

/** Relative change from `prev` to `cur`; null when there is nothing to compare with. */
export function change(cur: number | null, prev: number | null): number | null {
  if (cur === null || prev === null || prev === 0) return null;
  return (cur - prev) / prev;
}
export const ratio = (n: number, d: number): number | null => (d > 0 ? n / d : null);

export type StatShipment = {
  createdAt: Date;
  deliveredAt: Date | null;
  status: ShipmentStatus;
  /** bani */
  deliveryFee: number;
  /** bani */
  codAmount: number;
  /** zone code, null when the address has no zone */
  zone: string | null;
  clientId: string;
  client: string;
  courierId: string | null;
  /** failed delivery attempts on this parcel */
  failed: number;
};
export type StatPayment = { amount: number; method: PaymentMethod; collectedAt: Date; courierId: string | null };
export type StatEvent = { toStatus: ShipmentStatus; reason: string | null; createdAt: Date; userId: string | null };

/** A headline number for this period, the same for the period before, and one value per day for its trend line. */
export type Kpi = { value: number | null; prev: number | null; series: (number | null)[] };

export type Stats = {
  days: string[];
  kpis: { shipments: Kpi; delivered: Kpi; successRate: Kpi; firstTry: Kpi; avgHours: Kpi; fees: Kpi; cod: Kpi };
  volume: { created: number[]; delivered: number[] };
  /** COD collected per day, bani, by payment method */
  codByMethod: Record<PaymentMethod, number[]>;
  /** Every shipment created in the period, sorted into one outcome. */
  outcomes: { firstTry: number; retry: number; returned: number; cancelled: number; open: number };
  reasons: { status: ShipmentStatus; reason: string; count: number }[];
  zones: { zone: string | null; count: number; delivered: number }[];
  /** cod: COD of the client's delivered parcels (bani); failed, refused and returned parcels bring none. */
  clients: { id: string; name: string; count: number; cod: number }[];
  couriers: { id: string; delivered: number; firstTry: number; activeDays: number; cod: number; failed: number }[];
  /** Deliveries per [weekday Monday = 0][hour]. */
  heat: number[][];
};

const METHODS: PaymentMethod[] = ["CASH_RECEIPT", "CASH_NO_RECEIPT", "CARD", "TRANSFER"];
const RETURNED: ShipmentStatus[] = ["RETURNED", "RETURNING", "REFUSED"];
const REASON_STATUSES: ShipmentStatus[] = ["FAILED_ATTEMPT", "REFUSED", "ON_HOLD"];

type Window = { days: string[]; index: Map<string, number> };
const windowOf = (days: string[]): Window => ({ days, index: new Map(days.map((d, i) => [d, i])) });

/** Shipment figures for one window of days (created-day cohort for outcomes, delivered-day for deliveries). */
function measure(w: Window, shipments: StatShipment[], payments: StatPayment[]) {
  const n = w.days.length;
  const created = Array<number>(n).fill(0);
  const delivered = Array<number>(n).fill(0);
  const fees = Array<number>(n).fill(0);
  const hours: number[][] = Array.from({ length: n }, () => []);
  const finished = Array<number>(n).fill(0);
  const succeeded = Array<number>(n).fill(0);
  const deliveredOfCohort = Array<number>(n).fill(0);
  const firstOfCohort = Array<number>(n).fill(0);
  const cod = Array<number>(n).fill(0);

  for (const s of shipments) {
    const c = w.index.get(moment(s.createdAt).day);
    if (c !== undefined) {
      created[c]++;
      if (s.status === "DELIVERED") {
        finished[c]++;
        succeeded[c]++;
        deliveredOfCohort[c]++;
        if (s.failed === 0) firstOfCohort[c]++;
      } else if (RETURNED.includes(s.status)) finished[c]++;
    }
    if (s.deliveredAt) {
      const d = w.index.get(moment(s.deliveredAt).day);
      if (d !== undefined) {
        delivered[d]++;
        fees[d] += s.deliveryFee;
        hours[d].push((s.deliveredAt.getTime() - s.createdAt.getTime()) / 3600000);
      }
    }
  }
  for (const p of payments) {
    const d = w.index.get(moment(p.collectedAt).day);
    if (d !== undefined) cod[d] += p.amount;
  }
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const allHours = hours.flat();
  return {
    created, delivered, fees, cod,
    total: { created: sum(created), delivered: sum(delivered), fees: sum(fees), cod: sum(cod) },
    successRate: { value: ratio(sum(succeeded), sum(finished)), series: succeeded.map((s, i) => ratio(s, finished[i])) },
    firstTry: { value: ratio(sum(firstOfCohort), sum(deliveredOfCohort)), series: firstOfCohort.map((s, i) => ratio(s, deliveredOfCohort[i])) },
    avgHours: { value: allHours.length ? sum(allHours) / allHours.length : null, series: hours.map((h) => (h.length ? sum(h) / h.length : null)) },
  };
}

export function computeStats({ today, period, shipments, payments, events }: { today: string; period: Period; shipments: StatShipment[]; payments: StatPayment[]; events: StatEvent[] }): Stats {
  const cur = windowOf(lastDays(today, period));
  const prev = windowOf(lastDays(lastDays(today, period)[0], period + 1).slice(0, period));
  const a = measure(cur, shipments, payments);
  const b = measure(prev, shipments, payments);
  const kpi = (value: number | null, prevValue: number | null, series: (number | null)[]): Kpi => ({ value, prev: prevValue, series });

  const inCur = (d: Date | null) => d !== null && cur.index.has(moment(d).day);
  const cohort = shipments.filter((s) => inCur(s.createdAt));

  const outcomes = { firstTry: 0, retry: 0, returned: 0, cancelled: 0, open: 0 };
  for (const s of cohort) {
    if (s.status === "DELIVERED") s.failed === 0 ? outcomes.firstTry++ : outcomes.retry++;
    else if (RETURNED.includes(s.status)) outcomes.returned++;
    else if (s.status === "CANCELLED") outcomes.cancelled++;
    else outcomes.open++;
  }

  const reasonCount = new Map<string, { status: ShipmentStatus; reason: string; count: number }>();
  for (const e of events) {
    if (!e.reason || !REASON_STATUSES.includes(e.toStatus) || !inCur(e.createdAt)) continue;
    const key = `${e.toStatus}|${e.reason}`;
    const r = reasonCount.get(key) ?? { status: e.toStatus, reason: e.reason, count: 0 };
    r.count++;
    reasonCount.set(key, r);
  }

  const zones = new Map<string | null, { zone: string | null; count: number; delivered: number }>();
  const clients = new Map<string, { id: string; name: string; count: number; cod: number }>();
  for (const s of cohort) {
    const z = zones.get(s.zone) ?? { zone: s.zone, count: 0, delivered: 0 };
    z.count++;
    if (s.status === "DELIVERED") z.delivered++;
    zones.set(s.zone, z);
    const c = clients.get(s.clientId) ?? { id: s.clientId, name: s.client, count: 0, cod: 0 };
    c.count++;
    if (s.status === "DELIVERED") c.cod += s.codAmount;
    clients.set(s.clientId, c);
  }

  type CourierRow = Stats["couriers"][number] & { days: Set<string> };
  const couriers = new Map<string, CourierRow>();
  const courier = (id: string) => {
    let c = couriers.get(id);
    if (!c) couriers.set(id, (c = { id, delivered: 0, firstTry: 0, activeDays: 0, cod: 0, failed: 0, days: new Set() }));
    return c;
  };
  const heat = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  for (const s of shipments) {
    if (!s.deliveredAt || !inCur(s.deliveredAt)) continue;
    const m = moment(s.deliveredAt);
    heat[m.weekday][m.hour]++;
    if (!s.courierId) continue;
    const c = courier(s.courierId);
    c.delivered++;
    if (s.failed === 0) c.firstTry++;
    c.days.add(m.day);
  }
  for (const s of cohort) if (s.courierId) courier(s.courierId);
  for (const p of payments) if (p.courierId && inCur(p.collectedAt)) courier(p.courierId).cod += p.amount;
  for (const e of events) if (e.userId && e.toStatus === "FAILED_ATTEMPT" && inCur(e.createdAt)) courier(e.userId).failed++;

  const codByMethod = Object.fromEntries(METHODS.map((m) => [m, Array<number>(period).fill(0)])) as Record<PaymentMethod, number[]>;
  for (const p of payments) {
    const i = cur.index.get(moment(p.collectedAt).day);
    if (i !== undefined) codByMethod[p.method][i] += p.amount;
  }

  return {
    days: cur.days,
    kpis: {
      shipments: kpi(a.total.created, b.total.created, a.created),
      delivered: kpi(a.total.delivered, b.total.delivered, a.delivered),
      successRate: kpi(a.successRate.value, b.successRate.value, a.successRate.series),
      firstTry: kpi(a.firstTry.value, b.firstTry.value, a.firstTry.series),
      avgHours: kpi(a.avgHours.value, b.avgHours.value, a.avgHours.series),
      fees: kpi(a.total.fees, b.total.fees, a.fees),
      cod: kpi(a.total.cod, b.total.cod, a.cod),
    },
    volume: { created: a.created, delivered: a.delivered },
    codByMethod,
    outcomes,
    reasons: [...reasonCount.values()].sort((x, y) => y.count - x.count),
    zones: [...zones.values()].sort((x, y) => y.count - x.count),
    clients: [...clients.values()].sort((x, y) => y.count - x.count || y.cod - x.cod),
    couriers: [...couriers.values()].map(({ days, ...c }) => ({ ...c, activeDays: days.size })).sort((x, y) => y.delivered - x.delivered),
    heat,
  };
}

/** Deliveries per hour today, next to the average of the same weekday over the previous `weeks` weeks. */
export function hourly(deliveredAt: Date[], today: string, weeks = 4): { today: number[]; typical: number[] } {
  const same = new Set(Array.from({ length: weeks }, (_, i) => addDays(today, -7 * (i + 1))));
  const t = Array<number>(24).fill(0);
  const usual = Array<number>(24).fill(0);
  for (const d of deliveredAt) {
    const m = moment(d);
    if (m.day === today) t[m.hour]++;
    else if (same.has(m.day)) usual[m.hour]++;
  }
  return { today: t, typical: usual.map((v) => v / weeks) };
}

/** Fetches the chosen period and the one before it, then counts them. */
export async function loadStats(period: Period): Promise<Stats> {
  const { db } = await import("./db");
  const { dayBounds, todayMD } = await import("./dates");
  const today = todayMD();
  const from = dayBounds(lastDays(today, period * 2)[0]).start;
  const [rows, payments, events] = await Promise.all([
    db.shipment.findMany({
      where: { OR: [{ createdAt: { gte: from } }, { deliveredAt: { gte: from } }] },
      select: {
        createdAt: true, deliveredAt: true, status: true, deliveryFee: true, codAmount: true, clientId: true, courierId: true,
        client: { select: { name: true } },
        zone: { select: { code: true } },
        _count: { select: { events: { where: { toStatus: "FAILED_ATTEMPT", undoneAt: null } } } },
      },
    }),
    db.codPayment.findMany({ where: { collectedAt: { gte: from } }, select: { amount: true, method: true, collectedAt: true, courierId: true } }),
    db.statusEvent.findMany({ where: { createdAt: { gte: from }, toStatus: { in: REASON_STATUSES }, undoneAt: null }, select: { toStatus: true, reason: true, createdAt: true, userId: true } }),
  ]);
  const shipments: StatShipment[] = rows.map((s) => ({
    createdAt: s.createdAt, deliveredAt: s.deliveredAt, status: s.status, deliveryFee: s.deliveryFee, codAmount: s.codAmount,
    zone: s.zone?.code ?? null, clientId: s.clientId, client: s.client.name, courierId: s.courierId, failed: s._count.events,
  }));
  return computeStats({ today, period, shipments, payments, events });
}

/** Today's deliveries per hour against the usual same weekday, and today's COD by payment method (bani). */
export async function loadTodayFlow(): Promise<{ hours: { today: number[]; typical: number[] }; paid: Record<PaymentMethod, number> }> {
  const { db } = await import("./db");
  const { dayBounds, todayMD } = await import("./dates");
  const today = todayMD();
  const { start, end } = dayBounds(today);
  const [delivered, paid] = await Promise.all([
    db.shipment.findMany({ where: { deliveredAt: { gte: dayBounds(addDays(today, -28)).start } }, select: { deliveredAt: true } }),
    db.codPayment.groupBy({ by: ["method"], where: { collectedAt: { gte: start, lt: end } }, _sum: { amount: true } }),
  ]);
  return {
    hours: hourly(delivered.map((s) => s.deliveredAt!), today),
    paid: Object.fromEntries(METHODS.map((m) => [m, paid.find((p) => p.method === m)?._sum.amount ?? 0])) as Record<PaymentMethod, number>,
  };
}
