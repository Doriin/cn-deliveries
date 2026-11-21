import type { ShipmentStatus } from "@prisma/client";

export const STATUSES: ShipmentStatus[] = [
  "NEW",
  "CONFIRMED",
  "PICKED_UP",
  "AT_WAREHOUSE",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "FAILED_ATTEMPT",
  "POSTPONED",
  "ON_HOLD",
  "REFUSED",
  "RETURNING",
  "RETURNED",
  "CANCELLED",
];

export const TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  NEW: ["CONFIRMED", "PICKED_UP", "ON_HOLD", "CANCELLED"],
  CONFIRMED: ["PICKED_UP", "ON_HOLD", "CANCELLED"],
  PICKED_UP: ["AT_WAREHOUSE", "OUT_FOR_DELIVERY", "ON_HOLD"],
  AT_WAREHOUSE: ["OUT_FOR_DELIVERY", "POSTPONED", "ON_HOLD", "RETURNING"],
  OUT_FOR_DELIVERY: ["DELIVERED", "FAILED_ATTEMPT", "POSTPONED", "REFUSED", "AT_WAREHOUSE", "ON_HOLD"],
  FAILED_ATTEMPT: ["OUT_FOR_DELIVERY", "AT_WAREHOUSE", "POSTPONED", "ON_HOLD", "RETURNING"],
  POSTPONED: ["OUT_FOR_DELIVERY", "AT_WAREHOUSE", "ON_HOLD", "RETURNING"],
  ON_HOLD: ["CONFIRMED", "PICKED_UP", "AT_WAREHOUSE", "OUT_FOR_DELIVERY", "RETURNING", "CANCELLED"],
  REFUSED: ["RETURNING", "AT_WAREHOUSE"],
  RETURNING: ["RETURNED", "AT_WAREHOUSE"],
  RETURNED: [],
  DELIVERED: [],
  CANCELLED: [],
};

export const FINAL_STATUSES: ShipmentStatus[] = ["DELIVERED", "RETURNED", "CANCELLED"];

/** Shipments that need an office decision (call the recipient, fix the address, arrange a return...). */
export const PROBLEM_STATUSES: ShipmentStatus[] = ["FAILED_ATTEMPT", "ON_HOLD", "REFUSED"];

export const FAILURE_REASONS = ["NO_ANSWER", "ABSENT", "WRONG_ADDRESS", "NO_MONEY", "OTHER"] as const;
export const HOLD_REASONS = ["DAMAGED", "ADDRESS_UNCLEAR", "UNPAID", "CLIENT_REQUEST", "OTHER"] as const;
export const REFUSAL_REASONS = ["CHANGED_MIND", "DAMAGED", "WRONG_ITEM", "OTHER"] as const;

export function reasonsFor(status: ShipmentStatus): readonly string[] {
  if (status === "FAILED_ATTEMPT") return FAILURE_REASONS;
  if (status === "ON_HOLD") return HOLD_REASONS;
  if (status === "REFUSED") return REFUSAL_REASONS;
  return [];
}

/** Tailwind classes for status badges: a soft tint, with the solid colour kept for the dot. */
export const STATUS_COLORS: Record<ShipmentStatus, string> = {
  NEW: "bg-slate-100 text-slate-700",
  CONFIRMED: "bg-sky-50 text-sky-800",
  PICKED_UP: "bg-brand-50 text-brand-800",
  AT_WAREHOUSE: "bg-indigo-50 text-indigo-800",
  OUT_FOR_DELIVERY: "bg-accent-100 text-amber-900",
  DELIVERED: "bg-emerald-50 text-emerald-800",
  FAILED_ATTEMPT: "bg-orange-50 text-orange-800",
  POSTPONED: "bg-yellow-50 text-yellow-800",
  ON_HOLD: "bg-red-50 text-red-800",
  REFUSED: "bg-rose-50 text-rose-800",
  RETURNING: "bg-purple-50 text-purple-800",
  RETURNED: "bg-stone-100 text-stone-700",
  CANCELLED: "bg-slate-100 text-slate-500 line-through",
};

/** Solid colours: badge dots, the dashboard flow, timelines. */
export const STATUS_DOT: Record<ShipmentStatus, string> = {
  NEW: "bg-slate-400",
  CONFIRMED: "bg-sky-500",
  PICKED_UP: "bg-brand-500",
  AT_WAREHOUSE: "bg-indigo-500",
  OUT_FOR_DELIVERY: "bg-accent-500",
  DELIVERED: "bg-emerald-500",
  FAILED_ATTEMPT: "bg-orange-500",
  POSTPONED: "bg-yellow-500",
  ON_HOLD: "bg-red-500",
  REFUSED: "bg-rose-500",
  RETURNING: "bg-purple-500",
  RETURNED: "bg-stone-400",
  CANCELLED: "bg-slate-300",
};

/** What a status means at a glance; the chosen design decides how each tone is drawn. */
export type StatusTone = "wait" | "hold" | "road" | "bad" | "back" | "done" | "off";
export const STATUS_TONE: Record<ShipmentStatus, StatusTone> = {
  NEW: "wait", CONFIRMED: "wait", PICKED_UP: "road", AT_WAREHOUSE: "hold", OUT_FOR_DELIVERY: "road", DELIVERED: "done",
  FAILED_ATTEMPT: "bad", POSTPONED: "hold", ON_HOLD: "bad", REFUSED: "bad", RETURNING: "back", RETURNED: "back", CANCELLED: "off",
};

/** The normal journey of a parcel, used wherever progress is drawn as a route. */
export const MAIN_FLOW: ShipmentStatus[] = ["NEW", "CONFIRMED", "PICKED_UP", "AT_WAREHOUSE", "OUT_FOR_DELIVERY", "DELIVERED"];

export type TransitionInput = {
  from: ShipmentStatus;
  to: ShipmentStatus;
  reason?: string | null;
  codAmount: number;
  codPaid: number;
  newDate?: Date | null;
};

/** Returns an i18n error key (under `errors.`) or null when the transition is allowed. */
export function validateTransition(i: TransitionInput): string | null {
  if (i.from === i.to) return "sameStatus";
  if (!TRANSITIONS[i.from].includes(i.to)) return "invalidTransition";
  const reasons = reasonsFor(i.to);
  if (reasons.length > 0 && (!i.reason || !reasons.includes(i.reason))) return "reasonRequired";
  if (i.to === "POSTPONED" && !i.newDate) return "dateRequired";
  if (i.to === "DELIVERED" && i.codAmount > 0 && i.codPaid < i.codAmount) return "codNotCollected";
  return null;
}
