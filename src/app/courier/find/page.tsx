import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PackageSearch, ScanLine } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser, COURIER_APP_ROLES } from "@/lib/auth";
import { extractTracking } from "@/lib/courier";
import { EmptyState, LinkButton } from "@/components/ui";
import { CourierTop } from "../CourierTop";

export default async function FindPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  await requireUser(COURIER_APP_ROLES);
  const q = (await searchParams).t ?? "";
  const tracking = extractTracking(q) ?? q.trim().toUpperCase();
  const s = tracking ? await db.shipment.findUnique({ where: { trackingNo: tracking }, select: { id: true } }) : null;
  if (s) redirect(`/courier/s/${s.id}`);
  const t = await getTranslations("courier");
  return (
    <div className="cr-page">
      <CourierTop back="/courier/scan" backLabel={t("back")} title={t("scanTitle")} />
      <EmptyState
        className="!pt-16"
        icon={PackageSearch}
        title={t("notFoundTitle")}
        hint={t("notFound", { tracking: tracking || "—" })}
        action={<LinkButton size="lg" className="cr-go" href="/courier/scan"><ScanLine className="h-5 w-5" aria-hidden />{t("scanAgain")}</LinkButton>}
      />
    </div>
  );
}
