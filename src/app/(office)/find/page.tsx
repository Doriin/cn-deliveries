import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { extractTracking } from "@/lib/courier";

/** Header search: an exact tracking number (typed or scanned) opens the shipment, anything else searches the list. */
export default async function FindPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim();
  const tracking = extractTracking(q);
  if (tracking) {
    const s = await db.shipment.findUnique({ where: { trackingNo: tracking }, select: { id: true } });
    if (s) redirect(`/shipments/${s.id}`);
  }
  redirect(q ? `/shipments?q=${encodeURIComponent(q)}` : "/shipments");
}
