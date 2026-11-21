import {
  Banknote, Building2, ClipboardList, LayoutDashboard, MapPinned, Package, PackagePlus, Palette, ScanLine, Sheet, Users, type LucideIcon,
} from "lucide-react";

/** Kept outside the client menu component so server components can read it too. */
export const NAV_ICONS = {
  dashboard: LayoutDashboard, shipments: Package, newShipment: PackagePlus, scan: ScanLine, manifest: ClipboardList,
  cod: Banknote, clients: Building2, sync: Sheet, users: Users, zones: MapPinned, design: Palette,
} satisfies Record<string, LucideIcon>;

export type NavItem = { href: string; label: string; short?: string; icon: keyof typeof NAV_ICONS; badge?: number; group?: number };
