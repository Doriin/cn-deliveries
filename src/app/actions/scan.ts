"use server";

import { revalidatePath } from "next/cache";
import type { ShipmentStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser, OFFICE_ROLES } from "@/lib/auth";
import { extractTracking } from "@/lib/courier";
import { changeStatus } from "@/lib/shipments";
import { STATUSES } from "@/lib/status";

export type ScanResult = { ok: boolean; trackingNo: string; id?: string; recipient?: string; error?: string; skipped?: boolean };

/** Warehouse scan: one scanned code → optional courier assignment + status change. */
export async function scanApply(input: { code: string; to: string; courierId: string }): Promise<ScanResult> {
  const user = await requireUser(OFFICE_ROLES);
  const trackingNo = extractTracking(input.code) ?? input.code.trim().toUpperCase();
  const s = await db.shipment.findUnique({ where: { trackingNo } });
  if (!s) return { ok: false, trackingNo, error: "notFound" };
  const to = input.to as ShipmentStatus;
  if (input.courierId && input.courierId !== s.courierId) {
    await db.shipment.update({ where: { id: s.id }, data: { courierId: input.courierId } });
  }
  let error: string | null = null;
  let skipped = false;
  if (STATUSES.includes(to)) {
    if (s.status === to) skipped = true; // scanned twice: not an error
    else error = await changeStatus({ shipmentId: s.id, to, userId: user.id });
  }
  revalidatePath("/shipments");
  return { ok: !error, trackingNo, id: s.id, recipient: s.recipientName, error: error ?? undefined, skipped };
}
