import type { ShipmentStatus } from "@prisma/client";
import { db } from "./db";
import { dayBounds, todayMD } from "./dates";
import { codDue, FINAL_STATUSES } from "./status";
import { dayGroup, type DayGroup } from "./dayGroups";
import { CASH_METHODS } from "./courier";

/**
 * Everything the "Today" screen shows, loaded once and shaped the same way for every design.
 * A design only decides how to draw it.
 */

export { DAY_GROUPS, dayGroup, type DayGroup } from "./dayGroups";

/** The order a courier works through their parcels: what is done, what went wrong, what is in the van, then the rest. */
const STOP_ORDER: DayGroup[] = ["done", "bad", "road", "depot", "pickup", "back"];
/** The order the office reads the day in: what needs attention first, finished parcels last. */
const LIST_ORDER: DayGroup[] = ["bad", "road", "pickup", "depot", "back", "done"];

const TZ = "Europe/Chisinau";
const clock = new Intl.DateTimeFormat("ro-MD", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const minutesOfDay = (d: Date) => {
  const [h, m] = clock.format(d).split(":").map(Number);
  return h * 60 + m;
};
/** Position of a moment on a 09:00–18:00 line, as 0–100. */
export const DAY_START_HOUR = 9;
export const DAY_END_HOUR = 18;
const onDayLine = (d: Date) => Math.min(100, Math.max(0, ((minutesOfDay(d) - DAY_START_HOUR * 60) / ((DAY_END_HOUR - DAY_START_HOUR) * 60)) * 100));
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");

export type DayParcel = {
  id: string;
  trackingNo: string;
  /** Last block of the tracking number, enough to tell parcels apart on one day. */
  short: string;
  status: ShipmentStatus;
  group: DayGroup;
  reason: string | null;
  /** Failed delivery attempts so far. */
  attempts: number;
  who: string;
  phone: string;
  city: string | null;
  addr: string;
  client: string;
  /** Where a parcel still to be collected is picked up from. */
  pickup: string | null;
  courierId: string | null;
  courierName: string | null;
  /** bani */
  cod: number;
  /** bani still to collect */
  codLeft: number;
  /** When it reached its current state, "15:32". */
  time: string;
  /** Same moment as a position on the 09–18 line (0–100). */
  at: number;
  noZone: boolean;
  notes: string | null;
  pieces: number;
  weightGrams: number;
};

export type DayCourier = {
  id: string;
  name: string;
  initials: string;
  phone: string | null;
  /** Parcels on this courier today, in working order. */
  stops: DayParcel[];
  done: number;
  total: number;
  left: number;
  /** The stop the courier is on, or the next one. */
  now: DayParcel | null;
  /** Cash collected and not yet handed to the office, bani. */
  cash: number;
  cashPayments: number;
};

export type DayTask =
  | { kind: "problem"; parcel: DayParcel }
  | { kind: "confirm"; parcel: DayParcel }
  | { kind: "assign"; parcel: DayParcel }
  | { kind: "zone"; parcel: DayParcel }
  | { kind: "cash"; courier: DayCourier }
  | { kind: "sync"; count: number };

export type Day = {
  /** YYYY-MM-DD in Moldova time. */
  date: string;
  /** Position of "now" on the 09–18 line and its clock time. */
  now: { at: number; time: string };
  parcels: DayParcel[];
  counts: Record<DayGroup | "all", number>;
  couriers: DayCourier[];
  /** Active parcels with no courier. */
  unassigned: DayParcel[];
  /** bani */
  sums: { collected: number; road: number; depot: number; total: number; cashHeld: number };
  tasks: DayTask[];
  createdToday: number;
  /** For "assign to" menus. */
  courierOptions: { id: string; name: string }[];
};

export async function loadDay(): Promise<Day> {
  const date = todayMD();
  const { start, end } = dayBounds(date);
  const [rows, couriers, held, syncErrors, createdToday] = await Promise.all([
    db.shipment.findMany({
      where: { OR: [{ status: { notIn: FINAL_STATUSES } }, { deliveredAt: { gte: start, lt: end } }] },
      include: {
        client: { select: { name: true, address: true } },
        courier: { select: { name: true } },
        codPayments: { select: { amount: true, collectedAt: true } },
        events: { where: { toStatus: "FAILED_ATTEMPT", undoneAt: null }, select: { id: true } },
      },
    }),
    db.user.findMany({ where: { role: "COURIER", active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, phone: true } }),
    db.codPayment.groupBy({ by: ["courierId"], where: { handoverId: null, method: { in: [...CASH_METHODS] }, courierId: { not: null } }, _sum: { amount: true }, _count: true }),
    db.sheetSyncLog.count({ where: { startedAt: { gte: start }, errors: { gt: 0 } } }),
    db.shipment.count({ where: { createdAt: { gte: start, lt: end } } }),
  ]);

  const parcels: DayParcel[] = [];
  let collected = 0;
  for (const s of rows) {
    const group = dayGroup(s.status);
    if (!group) continue;
    const paid = s.codPayments.reduce((a, p) => a + p.amount, 0);
    collected += s.codPayments.filter((p) => p.collectedAt >= start && p.collectedAt < end).reduce((a, p) => a + p.amount, 0);
    const moment = s.deliveredAt ?? s.updatedAt;
    parcels.push({
      id: s.id,
      trackingNo: s.trackingNo,
      short: s.trackingNo.split("-").pop() ?? s.trackingNo,
      status: s.status,
      group,
      reason: s.statusReason,
      attempts: s.events.length,
      who: s.recipientName,
      phone: s.recipientPhone,
      city: s.recipientLocality,
      addr: s.recipientAddress,
      client: s.client.name,
      pickup: s.senderAddress ?? s.client.address ?? null,
      courierId: s.courierId,
      courierName: s.courier?.name ?? null,
      cod: s.codAmount,
      codLeft: codDue(s.status, s.codAmount, paid),
      time: clock.format(moment),
      at: onDayLine(moment),
      noZone: !s.zoneId,
      notes: s.notes,
      pieces: s.pieces,
      weightGrams: s.weightGrams,
    });
  }
  const rank = (order: DayGroup[]) => (a: DayParcel, b: DayParcel) =>
    order.indexOf(a.group) - order.indexOf(b.group) || (a.group === "done" ? a.at - b.at : 0) || a.trackingNo.localeCompare(b.trackingNo);
  parcels.sort((a, b) => LIST_ORDER.indexOf(a.group) - LIST_ORDER.indexOf(b.group) || (a.group === "done" ? b.at - a.at : 0) || b.trackingNo.localeCompare(a.trackingNo));

  const counts = { all: parcels.length, bad: 0, pickup: 0, depot: 0, road: 0, back: 0, done: 0 } as Day["counts"];
  for (const p of parcels) counts[p.group] += 1;

  const dayCouriers: DayCourier[] = couriers.map((c) => {
    const stops = parcels.filter((p) => p.courierId === c.id).sort(rank(STOP_ORDER));
    const done = stops.filter((p) => p.group === "done").length;
    const h = held.find((x) => x.courierId === c.id);
    return {
      id: c.id,
      name: c.name,
      initials: initials(c.name),
      phone: c.phone,
      stops,
      done,
      total: stops.length,
      left: stops.length - done,
      now: stops.find((p) => p.status === "OUT_FOR_DELIVERY") ?? stops.find((p) => p.group !== "done" && p.group !== "bad") ?? stops.find((p) => p.group === "bad") ?? null,
      cash: h?._sum.amount ?? 0,
      cashPayments: h?._count ?? 0,
    };
  });

  const active = parcels.filter((p) => p.group !== "done");
  const unassigned = active.filter((p) => !p.courierId);
  const road = active.filter((p) => p.group !== "depot").reduce((a, p) => a + p.codLeft, 0);
  const depot = active.filter((p) => p.group === "depot").reduce((a, p) => a + p.codLeft, 0);

  const tasks: DayTask[] = [
    ...active.filter((p) => p.group === "bad").map((parcel) => ({ kind: "problem" as const, parcel })),
    ...active.filter((p) => p.status === "NEW").map((parcel) => ({ kind: "confirm" as const, parcel })),
    ...unassigned.filter((p) => p.status !== "NEW" && p.group !== "bad").map((parcel) => ({ kind: "assign" as const, parcel })),
    ...active.filter((p) => p.noZone).map((parcel) => ({ kind: "zone" as const, parcel })),
    ...dayCouriers.filter((c) => c.cash > 0).map((courier) => ({ kind: "cash" as const, courier })),
    ...(syncErrors > 0 ? [{ kind: "sync" as const, count: syncErrors }] : []),
  ];

  const nowDate = new Date();
  return {
    date,
    now: { at: onDayLine(nowDate), time: clock.format(nowDate) },
    parcels,
    counts,
    couriers: dayCouriers,
    unassigned,
    sums: { collected, road, depot, total: collected + road + depot, cashHeld: dayCouriers.reduce((a, c) => a + c.cash, 0) },
    tasks,
    createdToday,
    courierOptions: couriers.map((c) => ({ id: c.id, name: c.name })),
  };
}
