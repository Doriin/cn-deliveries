import { getLocale, getTranslations } from "next-intl/server";
import { Alert, PageHeader } from "@/components/ui";
import { loadShipmentFormData } from "@/lib/shipmentFormData";
import { ShipmentForm } from "../ShipmentForm";

export default async function NewShipmentPage({ searchParams }: { searchParams: Promise<{ client?: string; created?: string }> }) {
  const sp = await searchParams;
  const t = await getTranslations("shipments");
  const data = await loadShipmentFormData(await getLocale());
  return (
    <>
      <PageHeader title={t("new")} />
      {sp.created && <div className="mb-5"><Alert kind="success">{t("created", { tracking: sp.created })}</Alert></div>}
      <ShipmentForm key={sp.created ?? "form"} {...data} initial={{ clientId: sp.client ?? "" }} />
    </>
  );
}
