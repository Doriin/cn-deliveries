import { notFound } from "next/navigation";
import { isDay, todayMD } from "@/lib/dates";
import { loadCourierRoute } from "@/lib/courierRoute";
import { AutoRefresh } from "@/components/AutoRefresh";
import { CourierDay } from "@/components/home/CourierDay";

/** One courier's day: what was done, where they are, what is still ahead. `?d=YYYY-MM-DD` shows an earlier day. */
export default async function CourierPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ d?: string }> }) {
  const [{ id }, { d }] = await Promise.all([params, searchParams]);
  const today = todayMD();
  const day = isDay(d) && d < today ? d : today;
  const route = await loadCourierRoute(id, day);
  if (!route) notFound();
  return (
    <div className="hm hm-route">
      {route.isToday && <AutoRefresh seconds={30} />}
      <CourierDay route={route} />
    </div>
  );
}
