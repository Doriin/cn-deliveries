import type { ShipmentStatus } from "@prisma/client";
import { TRANSITIONS } from "./status";

/** Statuses a courier may set from the app (office-only: CONFIRMED, CANCELLED). */
const COURIER_ALLOWED: ShipmentStatus[] = [
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
];

export function courierNextStatuses(from: ShipmentStatus): ShipmentStatus[] {
  return TRANSITIONS[from].filter((s) => COURIER_ALLOWED.includes(s));
}

/** Order of the courier's daily list: what to deliver now first. */
export const COURIER_ORDER: ShipmentStatus[] = [
  "OUT_FOR_DELIVERY",
  "FAILED_ATTEMPT",
  "PICKED_UP",
  "AT_WAREHOUSE",
  "CONFIRMED",
  "NEW",
  "POSTPONED",
  "REFUSED",
  "RETURNING",
  "ON_HOLD",
];

export type ProofInput = { to: ShipmentStatus; receivedBy?: string | null; hasPhoto: boolean; hasSignature: boolean };

/** Delivery needs the receiver's name plus a photo or a signature. Returns an error key or null. */
export function validateProof(p: ProofInput): string | null {
  if (p.to !== "DELIVERED") return null;
  if (!p.receivedBy?.trim()) return "receivedByRequired";
  if (!p.hasPhoto && !p.hasSignature) return "proofRequired";
  return null;
}

export const CASH_METHODS = ["CASH_RECEIPT", "CASH_NO_RECEIPT"] as const;

/** Pulls a CN tracking number out of a scanned barcode/QR text (QR holds the tracking URL). */
export function extractTracking(text: string): string | null {
  const m = text.toUpperCase().match(/CN-\d{6}-\d{4,}/);
  return m ? m[0] : null;
}

export function mapsUrl(parts: (string | null | undefined)[]): string {
  const q = [...parts.filter(Boolean), "Moldova"].join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

/** Preference order for the one big button on a parcel: move it forward before anything else. */
const PRIMARY_ORDER: ShipmentStatus[] = ["DELIVERED", "OUT_FOR_DELIVERY", "PICKED_UP", "RETURNED", "RETURNING", "AT_WAREHOUSE"];

/** The step a courier most likely takes next, or null when the parcel is closed. */
export function courierPrimaryStatus(from: ShipmentStatus): ShipmentStatus | null {
  const next = courierNextStatuses(from);
  return PRIMARY_ORDER.find((s) => next.includes(s)) ?? next[0] ?? null;
}

export const COURIER_SECTIONS = ["deliver", "pickup", "withMe", "other"] as const;
export type CourierSection = (typeof COURIER_SECTIONS)[number];

/** Which part of the daily list a parcel belongs to. */
export function courierSection(status: ShipmentStatus): CourierSection {
  if (status === "OUT_FOR_DELIVERY" || status === "FAILED_ATTEMPT") return "deliver";
  if (status === "NEW" || status === "CONFIRMED") return "pickup";
  if (status === "PICKED_UP" || status === "AT_WAREHOUSE") return "withMe";
  return "other";
}
