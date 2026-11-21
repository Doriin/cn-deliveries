const TZ = "Europe/Chisinau";

function tzOffsetMs(date: Date): number {
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(date);
  const g = (t: string) => Number(p.find((x) => x.type === t)!.value);
  return Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second")) - Math.floor(date.getTime() / 1000) * 1000;
}

/** Today as YYYY-MM-DD in Moldova time. */
export function todayMD(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** [start, end) of a Moldova calendar day (YYYY-MM-DD) as UTC instants. */
export function dayBounds(day: string): { start: Date; end: Date } {
  const guess = new Date(`${day}T00:00:00Z`);
  const start = new Date(guess.getTime() - tzOffsetMs(guess));
  const next = new Date(guess.getTime() + 86400000);
  const end = new Date(next.getTime() - tzOffsetMs(next));
  return { start, end };
}

export function isDay(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

const intlLocale = (l?: string) => (l === "en" ? "en-GB" : l === "ru" ? "ru-RU" : "ro-MD");

/** Date in Moldova time, e.g. 17.11.2026 */
export function fmtDate(d: Date, locale?: string): string {
  return d.toLocaleDateString(intlLocale(locale), { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Date + time in Moldova time, e.g. 17.11.2026, 02:23 */
export function fmtDateTime(d: Date, locale?: string): string {
  return d.toLocaleString(intlLocale(locale), { timeZone: TZ, dateStyle: "short", timeStyle: "short" });
}

/** Weekday and day in Moldova time, e.g. "marți, 17 noiembrie". */
export function fmtDayLong(d: Date, locale?: string): string {
  return d.toLocaleDateString(intlLocale(locale), { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });
}

/** A stored calendar date (UTC midnight), e.g. "17 nov." */
export function fmtDayShort(d: Date, locale?: string): string {
  return d.toLocaleDateString(intlLocale(locale), { timeZone: "UTC", day: "numeric", month: "short" });
}
