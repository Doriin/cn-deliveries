import { describe, expect, it } from "vitest";
import { dayBounds } from "./dates";
import { dayLinePos, routeState, routeTone, TIMELINE } from "./courierRoute";

const at = (day: string, hour: number) => new Date(dayBounds(day).start.getTime() + hour * 3600000);

describe("courier route", () => {
  it("places a moment on the 08–20 line of its day", () => {
    const day = "2026-11-21";
    expect(dayLinePos(at(day, 8), day)).toBe(0);
    expect(dayLinePos(at(day, 14), day)).toBe(50);
    expect(dayLinePos(at(day, 20), day)).toBe(100);
    expect(dayLinePos(at(day, 22), day)).toBe(100);
    expect(dayLinePos(at(day, 6), day)).toBe(0);
  });
  it("lists what the courier did, not loading the van or office steps", () => {
    expect(TIMELINE).toContain("DELIVERED");
    expect(TIMELINE).toContain("PICKED_UP");
    expect(TIMELINE).toContain("FAILED_ATTEMPT");
    expect(TIMELINE).not.toContain("OUT_FOR_DELIVERY");
    expect(TIMELINE).not.toContain("CONFIRMED");
  });
  it("gives each step a tone", () => {
    expect(routeTone("DELIVERED")).toBe("ok");
    expect(routeTone("FAILED_ATTEMPT")).toBe("bad");
    expect(routeTone("REFUSED")).toBe("bad");
    expect(routeTone("PICKED_UP")).toBe("pick");
    expect(routeTone("POSTPONED")).toBe("other");
  });
  it("tells whether the courier has started, is on the road or is done", () => {
    expect(routeState({ isToday: true, started: false, left: 5 })).toBe("idle");
    expect(routeState({ isToday: true, started: true, left: 3 })).toBe("onRoute");
    expect(routeState({ isToday: true, started: true, left: 0 })).toBe("finished");
    expect(routeState({ isToday: false, started: true, left: 0 })).toBe("finished");
    expect(routeState({ isToday: false, started: false, left: 0 })).toBe("idle");
  });
});
