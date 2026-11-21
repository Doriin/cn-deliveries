import { getTranslations } from "next-intl/server";
import { requireUser, OFFICE_ROLES } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDesign } from "@/lib/design.server";
import { DESIGN_META } from "@/lib/design";
import { OfficeShell } from "@/components/shell/OfficeShell";
import type { NavItem } from "@/components/NavLinks";
import { PROBLEM_STATUSES } from "@/lib/status";
import { loadDay } from "@/lib/day";
import { pulseOf } from "@/lib/pulse";
import { formatMDL } from "@/lib/money";

export default async function OfficeLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(OFFICE_ROLES);
  const t = await getTranslations("nav");
  const design = await getDesign();
  const problems = await db.shipment.count({ where: { status: { in: PROBLEM_STATUSES } } });
  const meta = DESIGN_META[design];
  const ts = await getTranslations("shell");
  // Only Insula shows the live day on every page (its Dynamic Island).
  const pulse = meta.shell === "island" ? pulseOf(await loadDay()) : undefined;
  const main: NavItem[] = [
    { href: "/", label: t("dashboard"), icon: "dashboard", group: 0 },
    { href: "/shipments", label: t("shipments"), icon: "shipments", badge: problems, group: 0 },
    { href: "/scan", label: t("scan"), icon: "scan", group: 0 },
    { href: "/manifest", label: t("manifest"), short: t("manifestShort"), icon: "manifest", group: 0 },
    { href: "/cod", label: t("cod"), icon: "cod", group: 1 },
    { href: "/clients", label: t("clients"), icon: "clients", group: 1 },
  ];
  const admin: NavItem[] = [
    { href: "/sync", label: t("sync"), icon: "sync", group: 2 },
    ...(user.role === "ADMIN"
      ? ([
          { href: "/users", label: t("users"), icon: "users", group: 2 },
          { href: "/settings/zones", label: t("zones"), icon: "zones", group: 2 },
        ] as NavItem[])
      : []),
    { href: "/settings/design", label: t("design"), icon: "design", group: 2 },
  ];
  return (
    <OfficeShell
      shell={meta.shell}
      icons={meta.icons}
      pulse={pulse}
      extra={{
        more: ts("more"),
        island: {
          title: ts("island.title"),
          problems: ts("island.problems", { count: pulse?.bad ?? 0 }),
          allGood: ts("island.allGood"),
          at: ts("island.at"),
          idle: ts("island.idle"),
          open: ts("island.open"),
          held: ts("island.held"),
          of: ts("island.of", { done: pulse?.done ?? 0, total: pulse?.total ?? 0, cash: formatMDL(pulse?.cashHeld ?? 0) }),
        },
        palette: {
          trigger: ts("palette.trigger"),
          placeholder: ts("palette.placeholder"),
          go: ts("palette.go"),
          actions: ts("palette.actions"),
          find: ts("palette.find"),
          empty: ts("palette.empty"),
          close: ts("palette.close"),
        },
      }}
      main={main}
      admin={admin}
      user={{ name: user.name, role: t(`role.${user.role}`) }}
      labels={{ menu: t("menu"), search: t("searchPlaceholder"), scan: t("scan"), newShipment: t("newShipment"), logout: t("logout"), settings: t("settings"), language: t("language") }}
    >
      {children}
    </OfficeShell>
  );
}
