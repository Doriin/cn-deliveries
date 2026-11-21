import { getTranslations } from "next-intl/server";
import { currentUser, OFFICE_ROLES } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDateTime } from "@/lib/dates";
import { shipmentWhere, type ShipmentFilters } from "@/lib/shipmentFilters";

const cell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const num = (bani: number) => (bani / 100).toFixed(2).replace(".", ",");

/** CSV for Excel (semicolon separated, UTF-8 BOM, decimal comma), filtered like the shipments list. */
export async function GET(req: Request) {
  const user = await currentUser();
  if (!user || !OFFICE_ROLES.includes(user.role)) return new Response("Forbidden", { status: 403 });
  const f = Object.fromEntries(new URL(req.url).searchParams) as ShipmentFilters;
  const t = await getTranslations("export");
  const ts = await getTranslations("status");
  const tr = await getTranslations("reason");
  const tc = await getTranslations("common");
  const rows = await db.shipment.findMany({
    where: shipmentWhere(f),
    orderBy: { createdAt: "asc" },
    include: { client: { select: { name: true } }, courier: { select: { name: true } }, zone: { select: { nameRo: true } }, codPayments: { select: { amount: true } } },
  });
  const head = ["tracking", "created", "client", "recipient", "phone", "locality", "address", "zone", "weight", "pieces", "cod", "codCollected", "fee", "feeMode", "status", "reason", "courier", "deliveredAt"].map((k) => t(k));
  const lines = rows.map((s) =>
    [
      s.trackingNo, fmtDateTime(s.createdAt), s.client.name, s.recipientName, s.recipientPhone, s.recipientLocality, s.recipientAddress,
      s.zone?.nameRo, (s.weightGrams / 1000).toString().replace(".", ","), s.pieces, num(s.codAmount),
      num(s.codPayments.reduce((a, p) => a + p.amount, 0)), num(s.deliveryFee), tc(`feeMode.${s.feeMode}`), ts(s.status),
      s.statusReason ? tr(s.statusReason) : "", s.courier?.name, s.deliveredAt ? fmtDateTime(s.deliveredAt) : "",
    ].map(cell).join(";"),
  );
  const body = "﻿" + [head.map(cell).join(";"), ...lines].join("\r\n");
  const name = `cn-expedieri-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(body, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"` } });
}
