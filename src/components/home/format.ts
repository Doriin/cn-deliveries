import type { ShipmentStatus } from "@prisma/client";
import type { DayGroup } from "@/lib/day";

/** Number formats shared by the homepage and the courier day. */
export function formats(locale: string) {
  const intl = locale === "en" ? "en-GB" : locale === "ru" ? "ru-RU" : "ro-MD";
  const int = new Intl.NumberFormat(intl, { maximumFractionDigits: 0 });
  const one = new Intl.NumberFormat(intl, { maximumFractionDigits: 1 });
  const pct = new Intl.NumberFormat(intl, { style: "percent", maximumFractionDigits: 1 });
  const compact = new Intl.NumberFormat(intl, { notation: "compact", maximumFractionDigits: 1 });
  const weekday = new Intl.DateTimeFormat(intl, { timeZone: "UTC", weekday: "short" });
  const dm = new Intl.DateTimeFormat(intl, { timeZone: "UTC", day: "numeric", month: "short" });
  const clock = new Intl.DateTimeFormat(intl, { timeZone: "Europe/Chisinau", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const dayDate = (d: string) => new Date(`${d}T00:00:00Z`);
  return {
    int: (v: number) => int.format(v),
    one: (v: number) => one.format(v),
    pct: (v: number | null) => (v === null ? "–" : pct.format(v)),
    /** bani → "1.290 MDL" */
    mdl: (bani: number) => `${int.format(Math.round(bani / 100))} MDL`,
    /** bani → "12 mii" for axes */
    mdlShort: (bani: number) => compact.format(bani / 100),
    weekday: (d: string) => weekday.format(dayDate(d)),
    dayMonth: (d: string) => dm.format(dayDate(d)),
    clock: (d: Date) => clock.format(d),
  };
}
export type Formats = ReturnType<typeof formats>;

/** Where each part of the day bar leads on the shipments list. */
export const GROUP_HREF: Record<DayGroup, string> = {
  bad: "/shipments?status=PROBLEMS",
  road: "/shipments?status=OUT_FOR_DELIVERY",
  pickup: "/shipments?status=NEW",
  depot: "/shipments?status=AT_WAREHOUSE",
  back: "/shipments?status=RETURNING",
  done: "/shipments?status=DONE_TODAY",
};
export const GROUP_ORDER: DayGroup[] = ["bad", "road", "pickup", "depot", "back", "done"];
export const groupColor = (g: DayGroup) => `var(--hm-${g})`;

/** Shown for a parcel's state in lists: the reason when there is one. */
export const reasonOrStatus = (status: ShipmentStatus, reason: string | null, tr: { has: (k: string) => boolean; (k: string): string }, ts: (k: string) => string) =>
  reason && tr.has(reason) ? tr(reason) : ts(status);
