/** The designs the owner is choosing between. One is kept in the end; the rest get deleted with this switch. */
export const DESIGNS = ["insula", "radar", "triaj", "val", "dispecerat", "kraft", "semnal", "verde", "tactil", "aer", "expres"] as const;
export type Design = (typeof DESIGNS)[number];
export const DEFAULT_DESIGN: Design = "dispecerat";
export const DESIGN_COOKIE = "design";
/** Request header the middleware sets from `?__design=` so Settings → Design can show a live preview of a design without switching to it. */
export const DESIGN_PREVIEW_HEADER = "x-design-preview";

/** The newest designs, shown first and large in Settings → Design. */
export const NEW_DESIGNS: readonly Design[] = ["insula", "radar", "triaj", "val"];

export function isDesign(v: unknown): v is Design {
  return typeof v === "string" && (DESIGNS as readonly string[]).includes(v);
}

/** How the office menu is laid out. */
export type Shell = "topbar" | "sidebar" | "capsule" | "rail" | "island" | "dock" | "inbox" | "navrail";
/** Which icon family the menus draw with. */
export type IconSet = "lucide" | "phosphor" | "remix" | "tabler" | "material";

export const DESIGN_META: Record<Design, { shell: Shell; icons: IconSet; draft?: string; statusBar: string; no?: number }> = {
  insula: { shell: "island", icons: "phosphor", statusBar: "#f3f5f7" },
  radar: { shell: "dock", icons: "tabler", statusBar: "#f3f5f7" },
  triaj: { shell: "inbox", icons: "remix", statusBar: "#ffffff" },
  val: { shell: "navrail", icons: "material", statusBar: "#ecf1f9" },
  dispecerat: { shell: "topbar", icons: "lucide", draft: "4-dispecerat", statusBar: "#1b4f98", no: 4 },
  kraft: { shell: "sidebar", icons: "lucide", draft: "8-kraft", statusBar: "#f3f5f7", no: 8 },
  semnal: { shell: "topbar", icons: "lucide", draft: "9-semnal", statusBar: "#186adc", no: 9 },
  verde: { shell: "topbar", icons: "lucide", draft: "10-verde", statusBar: "#ffffff", no: 10 },
  tactil: { shell: "sidebar", icons: "lucide", draft: "11-tactil", statusBar: "#f3f5f7", no: 11 },
  aer: { shell: "capsule", icons: "lucide", draft: "12-aer", statusBar: "#edf1f6", no: 12 },
  expres: { shell: "rail", icons: "lucide", draft: "13-expres", statusBar: "#e2e9f1", no: 13 },
};
