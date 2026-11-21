import type { ShipmentStatus } from "@prisma/client";
import { PROBLEM_STATUSES } from "./status";

/** The things a dispatcher sorts today's parcels into. */
export const DAY_GROUPS = ["bad", "pickup", "depot", "road", "back", "done"] as const;
export type DayGroup = (typeof DAY_GROUPS)[number];

export function dayGroup(status: ShipmentStatus): DayGroup | null {
  if (PROBLEM_STATUSES.includes(status)) return "bad";
  switch (status) {
    case "NEW":
    case "CONFIRMED":
      return "pickup";
    case "AT_WAREHOUSE":
    case "POSTPONED":
      return "depot";
    case "PICKED_UP":
    case "OUT_FOR_DELIVERY":
      return "road";
    case "RETURNING":
      return "back";
    case "DELIVERED":
      return "done";
    default:
      return null; // returned or cancelled: no longer part of the day
  }
}
