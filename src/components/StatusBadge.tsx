import type { ShipmentStatus } from "@prisma/client";
import { useTranslations } from "next-intl";
import { STATUS_TONE } from "@/lib/status";

/** A status as plain text with a small mark. Colour is kept for the states that need attention. */
export function StatusBadge({ status, size = "sm" }: { status: ShipmentStatus; size?: "sm" | "md" }) {
  const t = useTranslations("status");
  return (
    <span className="ui-status" data-tone={STATUS_TONE[status]} data-size={size}>
      <i aria-hidden />
      {t(status)}
    </span>
  );
}
