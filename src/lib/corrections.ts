import type { PaymentMethod, ShipmentStatus } from "@prisma/client";

/** Rules for fixing what was entered by mistake: payments, order details and the last status step. */

export type PaymentValues = { amount: number; method: PaymentMethod; receiptNo: string | null };

/**
 * Whether a recorded payment may change to `next` (null = deleted). Returns an error key (under `errors.`) or null.
 * Cash the office already received keeps its amount and method; a delivered order keeps enough COD to cover it.
 */
export function checkPaymentChange(i: {
  current: PaymentValues;
  next: PaymentValues | null;
  handedOver: boolean;
  status: ShipmentStatus;
  /** bani */
  codAmount: number;
  /** bani paid by the order's other payments */
  paidOthers: number;
}): string | null {
  const { current, next } = i;
  if (next) {
    if (next.amount <= 0) return "invalidAmount";
    if (next.method === "CASH_RECEIPT" && !next.receiptNo) return "receiptRequired";
  }
  if (i.handedOver && (!next || next.amount !== current.amount || next.method !== current.method)) return "handedOver";
  if (i.status === "DELIVERED" && i.paidOthers + (next?.amount ?? 0) < i.codAmount) return "deliveredNeedsCod";
  return null;
}

/** A delivered order cannot ask for more COD than was collected. */
export function checkDetailsChange(i: { status: ShipmentStatus; codAmount: number; paid: number }): string | null {
  return i.status === "DELIVERED" && i.codAmount > i.paid ? "deliveredNeedsCod" : null;
}

const norm = (v: unknown): string | number | null => {
  if (v === undefined || v === null || v === "") return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return v as string | number;
};

/** The fields that differ between two versions of an order, as { field: [before, after] }. */
export function diffDetails(before: Record<string, unknown>, after: Record<string, unknown>, fields: readonly string[]): Record<string, [string | number | null, string | number | null]> {
  const out: Record<string, [string | number | null, string | number | null]> = {};
  for (const f of fields) {
    const a = norm(before[f]);
    const b = norm(after[f]);
    if (a !== b) out[f] = [a, b];
  }
  return out;
}

/** Order fields that are written into the history when they change. */
export const DETAIL_FIELDS = [
  "clientId", "senderName", "senderPhone", "senderAddress", "recipientName", "recipientPhone", "recipientAddress", "recipientLocality",
  "zoneId", "weightGrams", "pieces", "type", "contents", "codAmount", "deliveryFee", "feeMode", "desiredDate", "notes", "courierId",
] as const;

type UndoEvent = { id: string; toStatus: ShipmentStatus; reason: string | null; createdAt: Date; undoneAt: Date | null };

/**
 * The step that "undo" removes: the latest step still in force, as long as it is not the order's first and it matches
 * the order's status. The order goes back to the step before it, with that step's reason.
 */
export function undoTarget<E extends UndoEvent>(events: E[], status: ShipmentStatus): { event: E; back: ShipmentStatus; reason: string | null } | null {
  const active = events.filter((e) => !e.undoneAt).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  if (active.length < 2) return null;
  const last = active[active.length - 1]!;
  if (last.toStatus !== status) return null;
  const prev = active[active.length - 2]!;
  return { event: last, back: prev.toStatus, reason: prev.reason };
}
