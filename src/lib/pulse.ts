import type { Day } from "./day";

/** The few live figures the Insula design keeps in its Dynamic Island on every office page. */
export type Pulse = {
  done: number;
  total: number;
  road: number;
  bad: number;
  /** bani held by couriers, not yet handed in */
  cashHeld: number;
  couriers: { id: string; name: string; initials: string; done: number; total: number; now: string | null; cash: number }[];
};

export function pulseOf(day: Day): Pulse {
  return {
    done: day.counts.done,
    total: day.counts.all,
    road: day.counts.road,
    bad: day.counts.bad,
    cashHeld: day.sums.cashHeld,
    couriers: day.couriers.map((c) => ({
      id: c.id, name: c.name, initials: c.initials, done: c.done, total: c.total, cash: c.cash,
      now: c.now ? c.now.city ?? c.now.who : null,
    })),
  };
}
