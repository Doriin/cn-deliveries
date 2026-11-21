import { db } from "./db";
import { zoneName } from "./zones";
import type { ShipmentFormData } from "@/app/(office)/shipments/ShipmentForm";

export async function loadShipmentFormData(locale: string): Promise<Omit<ShipmentFormData, "initial">> {
  const [clients, zones, localities, couriers] = await Promise.all([
    db.client.findMany({ where: { active: true }, orderBy: { name: "asc" }, include: { prices: true } }),
    db.zone.findMany({ orderBy: { sortOrder: "asc" } }),
    db.locality.findMany({ orderBy: { name: "asc" } }),
    db.user.findMany({ where: { role: "COURIER", active: true }, orderBy: { name: "asc" } }),
  ]);
  return {
    clients: clients.map((c) => ({ id: c.id, name: c.name, feeMode: c.feeMode, prices: Object.fromEntries(c.prices.map((p) => [p.zoneId, p.price])) })),
    zones: zones.map((z) => ({ id: z.id, name: zoneName(z, locale), basePrice: z.basePrice, includedKg: z.includedKg, extraPerKg: z.extraPerKg })),
    localities: localities.map((l) => ({ name: l.name, key: l.key, zoneId: l.zoneId })),
    couriers: couriers.map((c) => ({ id: c.id, name: c.name })),
  };
}
