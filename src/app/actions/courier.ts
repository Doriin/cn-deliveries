"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PaymentMethod, ShipmentStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser, COURIER_APP_ROLES, OFFICE_ROLES } from "@/lib/auth";
import { date, str } from "@/lib/form";
import { parseMDL } from "@/lib/money";
import { courierNextStatuses, validateProof, CASH_METHODS } from "@/lib/courier";
import { FINAL_STATUSES } from "@/lib/status";
import { recordCodAndChangeStatus } from "@/lib/shipments";
import { saveDataUrl, saveImageFile } from "@/lib/uploads";
import type { FormState } from "@/components/ActionForm";

const METHODS: PaymentMethod[] = ["CASH_RECEIPT", "CASH_NO_RECEIPT", "CARD", "TRANSFER"];
/** After these the courier goes back to the list; otherwise they stay on the parcel. */
const BACK_TO_LIST: ShipmentStatus[] = ["DELIVERED", "FAILED_ATTEMPT", "POSTPONED", "REFUSED", "RETURNED"];

export async function courierUpdate(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser(COURIER_APP_ROLES);
  const id = str(form, "id")!;
  const to = str(form, "to") as ShipmentStatus;
  const s = await db.shipment.findUnique({ where: { id }, include: { codPayments: true } });
  if (!s) return { error: "notFound" };
  if (s.courierId !== user.id) return { error: "notYourParcel" };
  if (!courierNextStatuses(s.status).includes(to)) return { error: "invalidTransition" };

  const receivedBy = str(form, "receivedBy");
  const photo = form.get("photo");
  const signature = form.get("signature");
  const hasPhoto = !!photo && typeof photo !== "string" && photo.size > 0;
  const hasSignature = typeof signature === "string" && signature.startsWith("data:");
  const proofErr = validateProof({ to, receivedBy, hasPhoto, hasSignature });
  if (proofErr) return { error: proofErr };

  // COD is collected together with the delivery.
  let cod = null;
  const codLeft = s.codAmount - s.codPayments.reduce((a, p) => a + p.amount, 0);
  if (to === "DELIVERED" && codLeft > 0) {
    const amount = parseMDL(str(form, "codAmount") ?? "");
    const method = str(form, "codMethod") as PaymentMethod;
    if (amount === null || amount <= 0) return { error: "invalidAmount" };
    if (!METHODS.includes(method)) return { error: "methodRequired" };
    cod = { shipmentId: id, amount, method, receiptNo: str(form, "receiptNo"), courierId: user.id, userId: user.id };
  }

  let photoPath: string | null = null;
  let signaturePath: string | null = null;
  try {
    photoPath = await saveImageFile(photo, s.trackingNo);
    signaturePath = await saveDataUrl(signature, `${s.trackingNo}-sign`);
  } catch {
    return { error: "invalidFile" };
  }

  const err = await recordCodAndChangeStatus(cod, {
    shipmentId: id,
    to,
    reason: str(form, "reason"),
    note: str(form, "note"),
    newDate: date(form, "newDate"),
    userId: user.id,
    receivedBy,
    photoPath,
    signaturePath,
  });
  if (err) return { error: err };
  revalidatePath("/courier");
  if (BACK_TO_LIST.includes(to)) redirect(`/courier?done=${s.trackingNo}`);
  revalidatePath(`/courier/s/${id}`);
  return { ok: true };
}

/** Courier takes a parcel (e.g. scanned at pickup) that isn't assigned to them. */
export async function claimShipment(form: FormData) {
  const user = await requireUser(COURIER_APP_ROLES);
  const id = str(form, "id")!;
  const s = await db.shipment.findUnique({ where: { id } });
  if (s && !FINAL_STATUSES.includes(s.status)) {
    await db.shipment.update({ where: { id }, data: { courierId: user.id } });
  }
  revalidatePath(`/courier/s/${id}`);
  revalidatePath("/courier");
}

/** Office confirms it received all cash the courier is holding. */
export async function confirmHandover(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser(OFFICE_ROLES);
  const courierId = str(form, "courierId")!;
  const expected = parseMDL(str(form, "expected") ?? "");
  const payments = await db.codPayment.findMany({ where: { courierId, handoverId: null, method: { in: [...CASH_METHODS] } } });
  const amount = payments.reduce((a, p) => a + p.amount, 0);
  if (payments.length === 0) return { error: "nothingToHandOver" };
  // Guards against confirming while the courier recorded a new payment after the page loaded.
  if (expected !== null && expected !== amount) return { error: "handoverChanged" };
  await db.$transaction(async (tx) => {
    const h = await tx.cashHandover.create({ data: { courierId, receivedById: user.id, amount, note: str(form, "note") } });
    await tx.codPayment.updateMany({ where: { id: { in: payments.map((p) => p.id) } }, data: { handoverId: h.id } });
  });
  revalidatePath("/cod");
  revalidatePath("/");
  return { ok: true };
}
