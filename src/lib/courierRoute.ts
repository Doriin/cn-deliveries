import type { PaymentMethod, ShipmentStatus } from "@prisma/client";
import { dayBounds, todayMD } from "./dates";
import { CASH_METHODS } from "./courier";
import type { CourierStop } from "./courierDay";

/** One courier's day as the office sees it: what was done, where they are, what is still ahead. */

/** The steps that show what a courier did. Loading the van and office steps are left out. */
export const TIMELINE: ShipmentStatus[] = ["PICKED_UP", "DELIVERED", "FAILED_ATTEMPT", "REFUSED", "POSTPONED", "ON_HOLD", "RETURNED"];

export type RouteTone = "ok" | "bad" | "pick" | "other";
export function routeTone(status: ShipmentStatus): RouteTone {
  if (status === "DELIVERED") return "ok";
  if (status === "FAILED_ATTEMPT" || status === "REFUSED" || status === "ON_HOLD") return "bad";
  if (status === "PICKED_UP") return "pick";
  return "other";
}

export const LINE_FROM = 8;
export const LINE_TO = 20;
/** Position of a moment on the 08–20 line of a Moldova day, 0–100. */
export function dayLinePos(d: Date, day: string): number {
  const h = (d.getTime() - dayBounds(day).start.getTime()) / 3600000;
  return Math.min(100, Math.max(0, ((h - LINE_FROM) / (LINE_TO - LINE_FROM)) * 100));
}

export type RouteState = "idle" | "onRoute" | "finished";
export function routeState({ isToday, started, left }: { isToday: boolean; started: boolean; left: number }): RouteState {
  if (!started) return "idle";
  return isToday && left > 0 ? "onRoute" : "finished";
}

export type RouteStep = {
  id: string;
  shipmentId: string;
  trackingNo: string;
  at: Date;
  status: ShipmentStatus;
  tone: RouteTone;
  reason: string | null;
  note: string | null;
  receivedBy: string | null;
  /** Where it happened: the sender for a pickup, the recipient otherwise. */
  name: string;
  address: string | null;
  locality: string | null;
  client: string;
  /** COD this courier collected for the parcel that day, bani. */
  paid: { amount: number; method: PaymentMethod } | null;
};

export type CourierRoute = {
  courier: { id: string; name: string; phone: string | null; initials: string };
  day: string;
  today: string;
  isToday: boolean;
  prevDay: string;
  nextDay: string | null;
  state: RouteState;
  startedAt: Date | null;
  lastAt: Date | null;
  /** What was done, in time order. */
  steps: RouteStep[];
  /** Today only: the stop being worked on and the ones after it, in working order. */
  next: CourierStop | null;
  rest: CourierStop[];
  stats: { delivered: number; failed: number; pickedUp: number; pickupsLeft: number; left: number; cashCollected: number; cashHeld: number; codToCollect: number };
  nowPos: number | null;
};

const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");

export async function loadCourierRoute(courierId: string, day: string): Promise<CourierRoute | null> {
  const { db } = await import("./db");
  const { loadCourierDay } = await import("./courierDay");
  const user = await db.user.findUnique({ where: { id: courierId }, select: { id: true, name: true, phone: true, role: true } });
  if (!user || user.role !== "COURIER") return null;
  const today = todayMD();
  const isToday = day === today;
  const { start, end } = dayBounds(day);
  const [events, payments, plan] = await Promise.all([
    db.statusEvent.findMany({
      where: { userId: courierId, createdAt: { gte: start, lt: end }, undoneAt: null },
      orderBy: { createdAt: "asc" },
      include: {
        shipment: {
          select: {
            id: true, trackingNo: true, recipientName: true, recipientAddress: true, recipientLocality: true, senderName: true, senderAddress: true,
            client: { select: { name: true, address: true } },
          },
        },
      },
    }),
    db.codPayment.findMany({ where: { courierId, collectedAt: { gte: start, lt: end } }, select: { shipmentId: true, amount: true, method: true } }),
    isToday ? loadCourierDay(courierId) : null,
  ]);

  const paidFor = new Map<string, { amount: number; method: PaymentMethod }>();
  for (const p of payments) {
    const cur = paidFor.get(p.shipmentId);
    paidFor.set(p.shipmentId, { amount: (cur?.amount ?? 0) + p.amount, method: p.method });
  }
  const steps: RouteStep[] = events
    .filter((e) => TIMELINE.includes(e.toStatus))
    .map((e) => {
      const s = e.shipment;
      const pickup = e.toStatus === "PICKED_UP";
      return {
        id: e.id,
        shipmentId: s.id,
        trackingNo: s.trackingNo,
        at: e.createdAt,
        status: e.toStatus,
        tone: routeTone(e.toStatus),
        reason: e.reason,
        note: e.note,
        receivedBy: e.receivedBy,
        name: pickup ? s.senderName ?? s.client.name : s.recipientName,
        address: pickup ? s.senderAddress ?? s.client.address : s.recipientAddress,
        locality: pickup ? null : s.recipientLocality,
        client: s.client.name,
        paid: e.toStatus === "DELIVERED" ? paidFor.get(s.id) ?? null : null,
      };
    });

  const left = plan?.left ?? 0;
  const stops = plan ? [plan.next, ...plan.rest].filter((s): s is CourierStop => !!s) : [];
  return {
    courier: { id: user.id, name: user.name, phone: user.phone, initials: initials(user.name) },
    day,
    today,
    isToday,
    prevDay: addDays(day, -1),
    nextDay: day < today ? addDays(day, 1) : null,
    state: routeState({ isToday, started: events.length > 0, left }),
    startedAt: events[0]?.createdAt ?? null,
    lastAt: events.at(-1)?.createdAt ?? null,
    steps,
    next: plan?.next ?? null,
    rest: plan?.rest ?? [],
    stats: {
      delivered: steps.filter((s) => s.status === "DELIVERED").length,
      failed: steps.filter((s) => s.status === "FAILED_ATTEMPT").length,
      pickedUp: steps.filter((s) => s.status === "PICKED_UP").length,
      pickupsLeft: stops.filter((s) => s.atPickup).length,
      left,
      cashCollected: payments.filter((p) => (CASH_METHODS as readonly string[]).includes(p.method)).reduce((a, p) => a + p.amount, 0),
      cashHeld: plan?.cashHeld ?? 0,
      codToCollect: plan?.codToCollect ?? 0,
    },
    nowPos: isToday ? dayLinePos(new Date(), day) : null,
  };
}
