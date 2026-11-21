import { getTranslations } from "next-intl/server";
import { CourierTop } from "../CourierTop";
import { Scanner } from "./Scanner";

export default async function ScanPage() {
  const t = await getTranslations("courier");
  return (
    <div className="cr-page">
      <CourierTop title={t("scanTitle")} />
      <Scanner />
    </div>
  );
}
