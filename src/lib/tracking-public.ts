import type { ShipmentStatus } from "@prisma/client";

/** The four steps a recipient understands, and which step each internal status belongs to. */
export const PUBLIC_STEPS = ["received", "pickedUp", "onTheWay", "delivered"] as const;
export type PublicStep = (typeof PUBLIC_STEPS)[number];

export function publicStep(s: ShipmentStatus): number {
  switch (s) {
    case "NEW":
    case "CONFIRMED":
      return 0;
    case "PICKED_UP":
    case "AT_WAREHOUSE":
    case "ON_HOLD":
    case "POSTPONED":
      return 1;
    case "OUT_FOR_DELIVERY":
    case "FAILED_ATTEMPT":
      return 2;
    case "DELIVERED":
      return 3;
    default:
      return -1; // refused / returning / returned / cancelled: shown as an exception, not a step
  }
}
