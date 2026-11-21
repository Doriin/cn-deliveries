import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { WarehouseScanner } from "./Scanner";

export default async function ScanPage() {
  const t = await getTranslations("scan");
  const couriers = await db.user.findMany({ where: { role: "COURIER", active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <WarehouseScanner couriers={couriers} />
    </div>
  );
}
