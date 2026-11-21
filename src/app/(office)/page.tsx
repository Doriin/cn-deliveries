import type { ComponentType } from "react";
import { getDesign } from "@/lib/design.server";
import type { Design } from "@/lib/design";
import { DAY_GROUPS, loadDay, type DayGroup } from "@/lib/day";
import { AutoRefresh } from "@/components/AutoRefresh";
import type { DayViewProps } from "@/components/day/shared";
import { DayDispecerat } from "@/components/day/Dispecerat";
import { DayKraft } from "@/components/day/Kraft";
import { DaySemnal } from "@/components/day/Semnal";
import { DayVerde } from "@/components/day/Verde";
import { DayTactil } from "@/components/day/Tactil";
import { DayAer } from "@/components/day/Aer";
import { DayExpres } from "@/components/day/Expres";
import { DayInsula } from "@/components/day/Insula";
import { DayRadar } from "@/components/day/Radar";
import { DayTriaj } from "@/components/day/Triaj";
import { DayVal } from "@/components/day/Val";

/** One screen per design, all drawn from the same day of data. */
const VIEWS: Record<Design, ComponentType<DayViewProps>> = {
  insula: DayInsula, radar: DayRadar, triaj: DayTriaj, val: DayVal,
  dispecerat: DayDispecerat, kraft: DayKraft, semnal: DaySemnal, verde: DayVerde, tactil: DayTactil, aer: DayAer, expres: DayExpres,
};

export default async function TodayPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const [design, day, sp] = await Promise.all([getDesign(), loadDay(), searchParams]);
  const filter = (DAY_GROUPS as readonly string[]).includes(sp.g ?? "") ? (sp.g as DayGroup) : "all";
  const View = VIEWS[design];
  return (
    <>
      <AutoRefresh seconds={30} />
      <View day={day} filter={filter} params={sp} />
    </>
  );
}
