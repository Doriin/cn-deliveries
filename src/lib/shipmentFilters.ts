import type { Prisma, ShipmentStatus } from "@prisma/client";
import { FINAL_STATUSES, PROBLEM_STATUSES, STATUSES } from "./status";
import { dayBounds, isDay, todayMD } from "./dates";
import { normalizePhone } from "./text";

export type ShipmentFilters = { q?: string; status?: string; client?: string; courier?: string; from?: string; to?: string; page?: string };

/** Quick tabs on the shipments list. `status` param values. */
export const TABS = ["ACTIVE", "NEW", "AT_WAREHOUSE", "OUT_FOR_DELIVERY", "PROBLEMS", "DONE_TODAY", "ALL"] as const;

export function statusWhere(status: string | undefined): Prisma.ShipmentWhereInput {
  switch (status) {
    case undefined:
    case "":
    case "ACTIVE":
      return { status: { notIn: FINAL_STATUSES } };
    case "ALL":
      return {};
    case "NEW":
      return { status: { in: ["NEW", "CONFIRMED"] } };
    case "PROBLEMS":
      return { status: { in: PROBLEM_STATUSES } };
    case "DONE_TODAY": {
      const { start, end } = dayBounds(todayMD());
      return { deliveredAt: { gte: start, lt: end } };
    }
    default:
      return STATUSES.includes(status as ShipmentStatus) ? { status: status as ShipmentStatus } : {};
  }
}

export function shipmentWhere(f: ShipmentFilters): Prisma.ShipmentWhereInput {
  const w: Prisma.ShipmentWhereInput = statusWhere(f.status);
  const q = f.q?.trim();
  if (q) {
    w.OR = [
      { trackingNo: { contains: q, mode: "insensitive" } },
      { recipientName: { contains: q, mode: "insensitive" } },
      { recipientPhone: { contains: q } },
      { recipientPhone: { contains: normalizePhone(q) } },
      { recipientAddress: { contains: q, mode: "insensitive" } },
      { recipientLocality: { contains: q, mode: "insensitive" } },
    ];
  }
  if (f.client) w.clientId = f.client;
  if (f.courier === "none") w.courierId = null;
  else if (f.courier) w.courierId = f.courier;
  if (isDay(f.from) || isDay(f.to)) {
    w.createdAt = {};
    if (isDay(f.from)) w.createdAt.gte = dayBounds(f.from).start;
    if (isDay(f.to)) w.createdAt.lt = dayBounds(f.to).end;
  }
  return w;
}
