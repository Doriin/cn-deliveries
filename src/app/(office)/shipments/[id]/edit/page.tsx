import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { dateInput } from "@/lib/form";
import { loadShipmentFormData } from "@/lib/shipmentFormData";
import { ShipmentForm } from "../../ShipmentForm";

export default async function EditShipmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations("shipments");
  const s = await db.shipment.findUnique({ where: { id } });
  if (!s) notFound();
  const data = await loadShipmentFormData(await getLocale());
  const initial: Record<string, string> = {
    id: s.id,
    clientId: s.clientId,
    feeMode: s.feeMode,
    senderName: s.senderName ?? "",
    senderPhone: s.senderPhone ?? "",
    senderAddress: s.senderAddress ?? "",
    recipientName: s.recipientName,
    recipientPhone: s.recipientPhone,
    recipientAddress: s.recipientAddress,
    recipientLocality: s.recipientLocality ?? "",
    zoneId: s.zoneId ?? "",
    type: s.type,
    weightKg: s.weightGrams ? String(s.weightGrams / 1000) : "",
    pieces: String(s.pieces),
    contents: s.contents ?? "",
    codAmount: s.codAmount ? String(s.codAmount / 100) : "",
    feeOverride: s.feeOverridden ? String(s.deliveryFee / 100) : "",
    desiredDate: dateInput(s.desiredDate),
    courierId: s.courierId ?? "",
    notes: s.notes ?? "",
  };
  return (
    <>
      <PageHeader title={`${t("edit")} ${s.trackingNo}`} />
      <ShipmentForm {...data} initial={initial} />
    </>
  );
}
