import { getLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { loadDay } from "@/lib/day";
import { loadStats, loadTodayFlow, parsePeriod } from "@/lib/stats";
import { zoneName } from "@/lib/zones";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Live } from "@/components/home/Live";
import { Performance } from "@/components/home/Performance";

/** The homepage: today live at the top, how the last 7/30/90 days went below. The same page in every design. */
export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const period = parsePeriod((await searchParams).p);
  const [day, flow, stats, couriers, zones, locale] = await Promise.all([
    loadDay(),
    loadTodayFlow(),
    loadStats(period),
    db.user.findMany({ where: { role: "COURIER" }, select: { id: true, name: true } }),
    db.zone.findMany(),
    getLocale(),
  ]);
  return (
    <div className="hm">
      <AutoRefresh seconds={30} />
      <Live day={day} flow={flow} />
      <Performance
        stats={stats}
        period={period}
        couriers={new Map(couriers.map((c) => [c.id, c.name]))}
        zones={new Map(zones.map((z) => [z.code, zoneName(z, locale)]))}
      />
    </div>
  );
}
