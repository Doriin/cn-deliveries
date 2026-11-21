import type { PrismaClient, Prisma } from "@prisma/client";

const TZ = "Europe/Chisinau";

/** YYMMDD in Moldova time. */
export function dayKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, year: "2-digit", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get("year")}${get("month")}${get("day")}`;
}

export function formatTrackingNo(date: Date, seq: number): string {
  return `CN-${dayKey(date)}-${String(seq).padStart(4, "0")}`;
}

/** Atomically allocates the next tracking number for today. */
export async function nextTrackingNo(db: PrismaClient | Prisma.TransactionClient, now = new Date()): Promise<string> {
  const key = `tracking:${dayKey(now)}`;
  const counter = await db.counter.upsert({
    where: { key },
    create: { key, value: 1 },
    update: { value: { increment: 1 } },
  });
  return formatTrackingNo(now, counter.value);
}
