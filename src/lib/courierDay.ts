import type { ShipmentStatus } from "@prisma/client";
import { dayBounds, todayMD } from "./dates";
import { codDue, FINAL_STATUSES } from "./status";
import { CASH_METHODS, COURIER_ORDER, COURIER_SECTIONS, courierNextStatuses, courierPrimaryStatus, courierSection, type CourierSection } from "./courier";

/**
 * The courier's day as the home screen shows it: one next stop, what comes after it, what is already delivered.
 * Loaded once and shaped the same way for every design.
 */

export type CourierStop = {
  id: string;
  trackingNo: string;
  status: ShipmentStatus;
  section: CourierSection;
  reason: string | null;
  /** The parcel is still at the sender: the stop is where it gets collected. */
  atPickup: boolean;
  /** Where to go. Null when a pickup has no address on file. */
  address: string | null;
  locality: string | null;
  /** Who is met there. */
  name: string;
  phone: string | null;
  recipientName: string;
  recipientLocality: string | null;
  client: string;
  /** bani still to collect at delivery */
  codLeft: number;
  notes: string | null;
  pieces: number;
  weightGrams: number;
  next: ShipmentStatus[];
  primary: ShipmentStatus | null;
};

export type CourierDelivered = { id: string; trackingNo: string; address: string; locality: string | null; name: string };

/** One mark of the progress strip: delivered, failed and waiting for a retry, the stop being worked on, or still ahead. */
export type RunMark = "d" | "f" | "n" | "";

export type CourierDay = {
  next: CourierStop | null;
  /** Stops after the next one, in working order. */
  rest: CourierStop[];
  delivered: CourierDelivered[];
  /** Delivered today plus everything still open. */
  total: number;
  left: number;
  marks: RunMark[];
  /** Cash collected and not yet handed to the office, bani. */
  cashHeld: number;
  /** COD still to collect on the open deliveries, bani. */
  codToCollect: number;
};

/** Working order: out for delivery, failed attempts to retry, pickups, then whatever else is on the courier. */
export function stopRank(status: ShipmentStatus): number {
  return COURIER_SECTIONS.indexOf(courierSection(status)) * 100 + COURIER_ORDER.indexOf(status);
}

export function orderStops<T extends { status: ShipmentStatus; locality: string | null; trackingNo: string }>(stops: T[]): T[] {
  return [...stops].sort(
    (a, b) => stopRank(a.status) - stopRank(b.status) || (a.locality ?? "").localeCompare(b.locality ?? "") || a.trackingNo.localeCompare(b.trackingNo),
  );
}

/** The stop the courier is on: the first one in working order. */
export function nextStop<T extends { status: ShipmentStatus; locality: string | null; trackingNo: string }>(stops: T[]): T | null {
  return orderStops(stops)[0] ?? null;
}

/** Progress strip: what is delivered, failed attempts waiting for a retry, the next stop, then the stops ahead. */
export function runMarks(delivered: number, ordered: { status: ShipmentStatus }[]): RunMark[] {
  const failed = ordered.slice(1).filter((s) => s.status === "FAILED_ATTEMPT").length;
  const ahead = Math.max(0, ordered.length - 1 - failed);
  return [
    ...Array<RunMark>(delivered).fill("d"),
    ...Array<RunMark>(failed).fill("f"),
    ...(ordered.length > 0 ? (["n"] as RunMark[]) : []),
    ...Array<RunMark>(ahead).fill(""),
  ];
}

export async function loadCourierDay(courierId: string): Promise<CourierDay> {
  const { db } = await import("./db");
  const { start, end } = dayBounds(todayMD());
  const [rows, done, cash] = await Promise.all([
    db.shipment.findMany({
      where: { courierId, status: { notIn: FINAL_STATUSES }, OR: [{ desiredDate: null }, { desiredDate: { lt: end } }] },
      include: { client: { select: { name: true, address: true, phone: true } }, codPayments: { select: { amount: true } } },
    }),
    db.shipment.findMany({
      where: { courierId, deliveredAt: { gte: start, lt: end } },
      orderBy: { deliveredAt: "desc" },
      select: { id: true, trackingNo: true, recipientAddress: true, recipientLocality: true, recipientName: true },
    }),
    db.codPayment.aggregate({ where: { courierId, handoverId: null, method: { in: [...CASH_METHODS] } }, _sum: { amount: true } }),
  ]);

  const stops = orderStops(
    rows.map((s): CourierStop => {
      const section = courierSection(s.status);
      const atPickup = section === "pickup";
      return {
        id: s.id,
        trackingNo: s.trackingNo,
        status: s.status,
        section,
        reason: s.statusReason,
        atPickup,
        address: atPickup ? s.senderAddress ?? s.client.address : s.recipientAddress,
        locality: atPickup ? null : s.recipientLocality,
        name: atPickup ? s.senderName ?? s.client.name : s.recipientName,
        phone: atPickup ? s.senderPhone ?? s.client.phone : s.recipientPhone,
        recipientName: s.recipientName,
        recipientLocality: s.recipientLocality,
        client: s.client.name,
        codLeft: codDue(s.status, s.codAmount, s.codPayments.reduce((a, p) => a + p.amount, 0)),
        notes: s.notes,
        pieces: s.pieces,
        weightGrams: s.weightGrams,
        next: courierNextStatuses(s.status),
        primary: courierPrimaryStatus(s.status),
      };
    }),
  );

  return {
    next: stops[0] ?? null,
    rest: stops.slice(1),
    delivered: done.map((s) => ({ id: s.id, trackingNo: s.trackingNo, address: s.recipientAddress, locality: s.recipientLocality, name: s.recipientName })),
    total: stops.length + done.length,
    left: stops.length,
    marks: runMarks(done.length, stops),
    cashHeld: cash._sum.amount ?? 0,
    codToCollect: stops.reduce((a, s) => a + s.codLeft, 0),
  };
}
