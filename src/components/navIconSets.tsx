"use client";

import type { ComponentType } from "react";
import {
  SquaresFourIcon, PackageIcon, BarcodeIcon, ClipboardTextIcon, CoinsIcon, BuildingsIcon, ArrowsClockwiseIcon, UsersThreeIcon, MapTrifoldIcon, PaletteIcon, PlusIcon,
  type IconWeight,
} from "@phosphor-icons/react";
import {
  RiInbox2Line, RiBox3Line, RiBarcodeLine, RiFileList3Line, RiCoinsLine, RiBuilding2Line, RiFileExcel2Line, RiTeamLine, RiMapPin2Line, RiPaletteLine, RiAddLine,
} from "@remixicon/react";
import {
  IconRadar2, IconPackages, IconBarcode, IconRoute, IconCash, IconBuildingSkyscraper, IconTableShare, IconUsersGroup, IconMapPins, IconPalette, IconPlus,
} from "@tabler/icons-react";
import { Icon as Iconify, type IconifyIcon } from "@iconify/react";
import dashO from "@iconify-icons/material-symbols/dashboard-outline-rounded";
import dashF from "@iconify-icons/material-symbols/dashboard-rounded";
import pkgO from "@iconify-icons/material-symbols/package-2-outline-rounded";
import pkgF from "@iconify-icons/material-symbols/package-2-rounded";
import scan from "@iconify-icons/material-symbols/barcode-scanner-rounded";
import listO from "@iconify-icons/material-symbols/list-alt-outline-rounded";
import listF from "@iconify-icons/material-symbols/list-alt-rounded";
import payO from "@iconify-icons/material-symbols/payments-outline-rounded";
import payF from "@iconify-icons/material-symbols/payments-rounded";
import apartment from "@iconify-icons/material-symbols/apartment-rounded";
import sync from "@iconify-icons/material-symbols/table-chart-rounded";
import groupO from "@iconify-icons/material-symbols/group-outline-rounded";
import groupF from "@iconify-icons/material-symbols/group-rounded";
import mapO from "@iconify-icons/material-symbols/map-outline-rounded";
import mapF from "@iconify-icons/material-symbols/map-rounded";
import palO from "@iconify-icons/material-symbols/palette-outline-rounded";
import palF from "@iconify-icons/material-symbols/palette-rounded";
import add from "@iconify-icons/material-symbols/add-rounded";
import { NAV_ICONS } from "./navIcons";
import type { IconSet } from "@/lib/design";

type Key = keyof typeof NAV_ICONS;

const PHOSPHOR: Record<Key, ComponentType<{ weight?: IconWeight }>> = {
  dashboard: SquaresFourIcon, shipments: PackageIcon, newShipment: PlusIcon, scan: BarcodeIcon, manifest: ClipboardTextIcon, cod: CoinsIcon,
  clients: BuildingsIcon, sync: ArrowsClockwiseIcon, users: UsersThreeIcon, zones: MapTrifoldIcon, design: PaletteIcon,
};
const REMIX: Record<Key, ComponentType> = {
  dashboard: RiInbox2Line, shipments: RiBox3Line, newShipment: RiAddLine, scan: RiBarcodeLine, manifest: RiFileList3Line, cod: RiCoinsLine,
  clients: RiBuilding2Line, sync: RiFileExcel2Line, users: RiTeamLine, zones: RiMapPin2Line, design: RiPaletteLine,
};
const TABLER: Record<Key, ComponentType<{ stroke?: number }>> = {
  dashboard: IconRadar2, shipments: IconPackages, newShipment: IconPlus, scan: IconBarcode, manifest: IconRoute, cod: IconCash,
  clients: IconBuildingSkyscraper, sync: IconTableShare, users: IconUsersGroup, zones: IconMapPins, design: IconPalette,
};
/** Material Symbols Rounded: outline when idle, filled on the current page, as Android draws its navigation. */
const MATERIAL: Record<Key, [IconifyIcon, IconifyIcon]> = {
  dashboard: [dashO, dashF], shipments: [pkgO, pkgF], newShipment: [add, add], scan: [scan, scan], manifest: [listO, listF], cod: [payO, payF],
  clients: [apartment, apartment], sync: [sync, sync], users: [groupO, groupF], zones: [mapO, mapF], design: [palO, palF],
};

/**
 * One menu icon in the chosen design's icon family. Phosphor (Insula) and Material (Val) swap outline for fill on the
 * current page; the `key` change replays the small bounce each design draws for it.
 */
export function NavIcon({ set, name, active }: { set: IconSet; name: Key; active?: boolean }) {
  if (set === "phosphor") {
    const I = PHOSPHOR[name];
    return <span className="nv-ico" key={active ? "on" : "off"} data-on={active || undefined}><I weight={active ? "fill" : "regular"} /></span>;
  }
  if (set === "material") {
    const [o, f] = MATERIAL[name];
    return <span className="nv-ico" key={active ? "on" : "off"} data-on={active || undefined}><Iconify icon={active ? f : o} /></span>;
  }
  if (set === "remix") {
    const I = REMIX[name];
    return <I />;
  }
  if (set === "tabler") {
    const I = TABLER[name];
    return <I stroke={1.6} />;
  }
  const I = NAV_ICONS[name];
  return <I aria-hidden />;
}
