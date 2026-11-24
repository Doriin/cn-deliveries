"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FeeMode, PaymentMethod, ShipmentStatus, ShipmentType } from "@prisma/client";
import { requireUser, OFFICE_ROLES } from "@/lib/auth";
import { date, int, str } from "@/lib/form";
import { parseKg, parseMDL } from "@/lib/money";
import { ActionError, assignCourier, changeStatus, createShipment, fixPayment, recordCod, undoLastStatus, updateShipment, type ShipmentInput } from "@/lib/shipments";
import { STATUSES } from "@/lib/status";
import { normalizePhone } from "@/lib/text";
import type { FormState } from "@/components/ActionForm";

function parseShipment(form: FormData): ShipmentInput | string {
  const clientId = str(form, "clientId");
  const recipientName = str(form, "recipientName");
  const recipientPhone = str(form, "recipientPhone");
  const recipientAddress = str(form, "recipientAddress");
  if (!clientId || !recipientName || !recipientPhone || !recipientAddress) return "requiredFields";
  const weightGrams = parseKg(str(form, "weightKg") ?? "");
  if (weightGrams === null) return "invalidWeight";
  const codAmount = parseMDL(str(form, "codAmount") ?? "");
  if (codAmount === null) return "invalidAmount";
  const feeRaw = str(form, "feeOverride");
  const feeOverride = feeRaw === null ? null : parseMDL(feeRaw);
  if (feeRaw !== null && feeOverride === null) return "invalidAmount";
  return {
    clientId,
    senderName: str(form, "senderName"),
    senderPhone: str(form, "senderPhone") && normalizePhone(str(form, "senderPhone")!),
    senderAddress: str(form, "senderAddress"),
    recipientName,
    recipientPhone: normalizePhone(recipientPhone),
    recipientAddress,
    recipientLocality: str(form, "recipientLocality"),
    zoneId: str(form, "zoneId"),
    weightGrams,
    pieces: Math.max(1, int(form, "pieces", 1)),
    type: (str(form, "type") ?? "PARCEL") as ShipmentType,
    contents: str(form, "contents"),
    codAmount,
    feeOverride,
    feeMode: str(form, "feeMode") as FeeMode | null,
    desiredDate: date(form, "desiredDate"),
    notes: str(form, "notes"),
    courierId: str(form, "courierId"),
  };
}

export async function saveShipment(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser(OFFICE_ROLES);
  const input = parseShipment(form);
  if (typeof input === "string") return { error: input };
  const id = str(form, "id");
  let s;
  try {
    s = id ? await updateShipment(id, input, user.id) : await createShipment(input, { userId: user.id });
  } catch (e) {
    if (e instanceof ActionError) return { error: e.code };
    throw e;
  }
  revalidatePath("/shipments");
  if (str(form, "next") === "new") redirect(`/shipments/new?client=${input.clientId}&created=${s.trackingNo}`);
  redirect(`/shipments/${s.id}`);
}

export async function changeStatusAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser(OFFICE_ROLES);
  const id = str(form, "id")!;
  const to = str(form, "to") as ShipmentStatus;
  if (!STATUSES.includes(to)) return { error: "invalidTransition" };
  const err = await changeStatus({ shipmentId: id, to, reason: str(form, "reason"), note: str(form, "note"), newDate: date(form, "newDate"), userId: user.id });
  if (err) return { error: err };
  revalidatePath(`/shipments/${id}`);
  revalidatePath("/");
  return { ok: true };
}

export async function recordCodAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser(OFFICE_ROLES);
  const id = str(form, "id")!;
  const amount = parseMDL(str(form, "amount"));
  if (amount === null) return { error: "invalidAmount" };
  const err = await recordCod({
    shipmentId: id,
    amount,
    method: str(form, "method") as PaymentMethod,
    receiptNo: str(form, "receiptNo"),
    userId: user.id,
  });
  if (err) return { error: err };
  revalidatePath(`/shipments/${id}`);
  return { ok: true };
}

export async function assignCourierAction(_: FormState, form: FormData): Promise<FormState> {
  await requireUser(OFFICE_ROLES);
  const id = str(form, "id")!;
  await assignCourier([id], str(form, "courierId"));
  revalidatePath(`/shipments/${id}`);
  revalidatePath("/");
  return { ok: true };
}

export async function bulkAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser(OFFICE_ROLES);
  const ids = form.getAll("ids").map(String);
  if (ids.length === 0) return { error: "nothingSelected" };
  const op = str(form, "op");
  if (op === "courier") {
    await assignCourier(ids, str(form, "courierId"));
    revalidatePath("/shipments");
    return { ok: true };
  }
  if (op === "status") {
    const to = str(form, "to") as ShipmentStatus;
    if (!STATUSES.includes(to)) return { error: "invalidTransition" };
    let failed = 0;
    for (const id of ids) {
      const err = await changeStatus({ shipmentId: id, to, reason: str(form, "reason"), newDate: date(form, "newDate"), userId: user.id });
      if (err) failed++;
    }
    revalidatePath("/shipments");
    if (failed) return { error: failed === ids.length ? "bulkAllFailed" : "bulkSomeFailed" };
    return { ok: true };
  }
  return { error: "invalidTransition" };
}

const METHODS: PaymentMethod[] = ["CASH_RECEIPT", "CASH_NO_RECEIPT", "CARD", "TRANSFER"];

/** Corrects a COD payment (`op=save`) or deletes it (`op=delete`). Office only. */
export async function fixPaymentAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser(OFFICE_ROLES);
  const id = str(form, "id")!;
  let next = null;
  if (str(form, "op") !== "delete") {
    const amount = parseMDL(str(form, "amount") ?? "");
    if (amount === null) return { error: "invalidAmount" };
    const method = str(form, "method") as PaymentMethod;
    if (!METHODS.includes(method)) return { error: "methodRequired" };
    next = { amount, method, receiptNo: str(form, "receiptNo") };
  }
  const err = await fixPayment({ paymentId: str(form, "paymentId")!, next, userId: user.id });
  if (err) return { error: err };
  revalidatePath(`/shipments/${id}`);
  revalidatePath("/");
  revalidatePath("/cod");
  return { ok: true };
}

/** Undoes the order's latest status step, with a reason. Office only. */
export async function undoStatusAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser(OFFICE_ROLES);
  const id = str(form, "id")!;
  const err = await undoLastStatus({ shipmentId: id, reason: str(form, "reason"), userId: user.id });
  if (err) return { error: err };
  revalidatePath(`/shipments/${id}`);
  revalidatePath("/");
  return { ok: true };
}
