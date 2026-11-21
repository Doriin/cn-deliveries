import type { FeeMode, PaymentMethod, Prisma, ShipmentSource, ShipmentStatus, ShipmentType } from "@prisma/client";
import { db } from "./db";
import { calculateFee } from "./pricing";
import { validateTransition } from "./status";
import { normalizeLocality } from "./text";
import { nextTrackingNo } from "./tracking";

type Tx = Prisma.TransactionClient;

export type ShipmentInput = {
  clientId: string;
  senderName?: string | null;
  senderPhone?: string | null;
  senderAddress?: string | null;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  recipientLocality?: string | null;
  zoneId?: string | null;
  weightGrams: number;
  pieces: number;
  type: ShipmentType;
  contents?: string | null;
  codAmount: number;
  /** When set, overrides the calculated fee. */
  feeOverride?: number | null;
  feeMode?: FeeMode | null;
  desiredDate?: Date | null;
  notes?: string | null;
  courierId?: string | null;
};

export async function resolveZoneId(locality: string | null | undefined, tx: Tx = db): Promise<string | null> {
  if (!locality) return null;
  const key = normalizeLocality(locality);
  if (!key) return null;
  const hit = await tx.locality.findUnique({ where: { key } });
  return hit?.zoneId ?? null;
}

export async function feeFor(clientId: string, zoneId: string | null, weightGrams: number, tx: Tx = db): Promise<number> {
  if (!zoneId) return 0;
  const zone = await tx.zone.findUnique({ where: { id: zoneId }, include: { clientPrices: { where: { clientId } } } });
  if (!zone) return 0;
  return calculateFee({
    basePrice: zone.clientPrices[0]?.price ?? zone.basePrice,
    includedKg: zone.includedKg,
    extraPerKg: zone.extraPerKg,
    weightGrams,
  });
}

async function buildData(input: ShipmentInput, tx: Tx) {
  const zoneId = input.zoneId || (await resolveZoneId(input.recipientLocality, tx));
  const overridden = input.feeOverride !== null && input.feeOverride !== undefined;
  const deliveryFee = overridden ? input.feeOverride! : await feeFor(input.clientId, zoneId, input.weightGrams, tx);
  const client = await tx.client.findUniqueOrThrow({ where: { id: input.clientId } });
  return {
    clientId: input.clientId,
    senderName: input.senderName || null,
    senderPhone: input.senderPhone || null,
    senderAddress: input.senderAddress || null,
    recipientName: input.recipientName,
    recipientPhone: input.recipientPhone,
    recipientAddress: input.recipientAddress,
    recipientLocality: input.recipientLocality || null,
    zoneId: zoneId || null,
    weightGrams: input.weightGrams,
    pieces: input.pieces,
    type: input.type,
    contents: input.contents || null,
    codAmount: input.codAmount,
    deliveryFee,
    feeOverridden: overridden,
    feeMode: input.feeMode ?? client.feeMode,
    desiredDate: input.desiredDate ?? null,
    notes: input.notes || null,
    courierId: input.courierId || null,
  };
}

export async function createShipment(
  input: ShipmentInput,
  opts: { userId?: string | null; source?: ShipmentSource; sheetRowKey?: string | null } = {},
) {
  return db.$transaction(async (tx) => {
    const data = await buildData(input, tx);
    const trackingNo = await nextTrackingNo(tx);
    return tx.shipment.create({
      data: {
        ...data,
        trackingNo,
        source: opts.source ?? "MANUAL",
        sheetRowKey: opts.sheetRowKey ?? null,
        sheetNeedsSync: opts.source === "SHEET",
        events: { create: { toStatus: "NEW", userId: opts.userId ?? null } },
      },
    });
  });
}

export async function updateShipment(id: string, input: ShipmentInput) {
  return db.$transaction(async (tx) => {
    const current = await tx.shipment.findUniqueOrThrow({ where: { id } });
    const data = await buildData(input, tx);
    return tx.shipment.update({
      where: { id },
      data: { ...data, sheetNeedsSync: current.source === "SHEET" ? true : current.sheetNeedsSync },
    });
  });
}

export type StatusChange = {
  shipmentId: string;
  to: ShipmentStatus;
  reason?: string | null;
  note?: string | null;
  newDate?: Date | null;
  userId?: string | null;
  receivedBy?: string | null;
  photoPath?: string | null;
  signaturePath?: string | null;
};

/** Thrown inside a transaction to roll it back and report an error key (under `errors.`). */
export class ActionError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

async function changeStatusTx(tx: Tx, c: StatusChange): Promise<void> {
  const s = await tx.shipment.findUnique({ where: { id: c.shipmentId }, include: { codPayments: true } });
  if (!s) throw new ActionError("notFound");
  const codPaid = s.codPayments.reduce((a, p) => a + p.amount, 0);
  const err = validateTransition({ from: s.status, to: c.to, reason: c.reason, codAmount: s.codAmount, codPaid, newDate: c.newDate });
  if (err) throw new ActionError(err);
  await tx.shipment.update({
    where: { id: s.id },
    data: {
      status: c.to,
      statusReason: c.reason || null,
      desiredDate: c.to === "POSTPONED" ? c.newDate : undefined,
      deliveredAt: c.to === "DELIVERED" ? new Date() : undefined,
      sheetNeedsSync: s.source === "SHEET" ? true : undefined,
    },
  });
  await tx.statusEvent.create({
    data: {
      shipmentId: s.id,
      fromStatus: s.status,
      toStatus: c.to,
      reason: c.reason || null,
      note: c.note || null,
      userId: c.userId ?? null,
      receivedBy: c.receivedBy || null,
      photoPath: c.photoPath || null,
      signaturePath: c.signaturePath || null,
    },
  });
}

export type CodInput = {
  shipmentId: string;
  amount: number;
  method: PaymentMethod;
  receiptNo?: string | null;
  courierId?: string | null;
  userId?: string | null;
};

async function recordCodTx(tx: Tx, p: CodInput): Promise<void> {
  if (p.amount <= 0) throw new ActionError("invalidAmount");
  if (p.method === "CASH_RECEIPT" && !p.receiptNo) throw new ActionError("receiptRequired");
  const s = await tx.shipment.findUnique({ where: { id: p.shipmentId } });
  if (!s) throw new ActionError("notFound");
  await tx.codPayment.create({
    data: {
      shipmentId: p.shipmentId,
      amount: p.amount,
      method: p.method,
      receiptNo: p.receiptNo || null,
      courierId: p.courierId ?? s.courierId,
      recordedById: p.userId ?? null,
    },
  });
}

async function run(fn: (tx: Tx) => Promise<void>): Promise<string | null> {
  try {
    await db.$transaction(fn);
    return null;
  } catch (e) {
    if (e instanceof ActionError) return e.code;
    throw e;
  }
}

/** The only way to change a shipment status. Returns an error key (under `errors.`) or null. */
export function changeStatus(c: StatusChange): Promise<string | null> {
  return run((tx) => changeStatusTx(tx, c));
}

export function recordCod(p: CodInput): Promise<string | null> {
  return run((tx) => recordCodTx(tx, p));
}

/** Records an optional COD payment and changes the status atomically (used by the courier app). */
export function recordCodAndChangeStatus(cod: CodInput | null, c: StatusChange): Promise<string | null> {
  return run(async (tx) => {
    if (cod) await recordCodTx(tx, cod);
    await changeStatusTx(tx, c);
  });
}

export async function assignCourier(ids: string[], courierId: string | null) {
  await db.shipment.updateMany({ where: { id: { in: ids } }, data: { courierId } });
}
