import { describe, expect, it } from "vitest";
import type { ShipmentStatus } from "@prisma/client";
import { nextStop, orderStops, runMarks } from "./courierDay";

const stop = (status: ShipmentStatus, locality: string | null = null, trackingNo = "CN-261117-0001") => ({ status, locality, trackingNo });

describe("courier day", () => {
  it("orders stops: out for delivery, retries, pickups, then the rest", () => {
    const ordered = orderStops([stop("AT_WAREHOUSE"), stop("ON_HOLD"), stop("NEW"), stop("FAILED_ATTEMPT"), stop("CONFIRMED"), stop("PICKED_UP"), stop("OUT_FOR_DELIVERY")]);
    expect(ordered.map((s) => s.status)).toEqual(["OUT_FOR_DELIVERY", "FAILED_ATTEMPT", "CONFIRMED", "NEW", "PICKED_UP", "AT_WAREHOUSE", "ON_HOLD"]);
  });
  it("keeps one locality together, then sorts by tracking number", () => {
    const ordered = orderStops([stop("OUT_FOR_DELIVERY", "Durlești", "CN-261117-0003"), stop("OUT_FOR_DELIVERY", "Ciocana", "CN-261117-0009"), stop("OUT_FOR_DELIVERY", "Ciocana", "CN-261117-0002")]);
    expect(ordered.map((s) => s.trackingNo)).toEqual(["CN-261117-0002", "CN-261117-0009", "CN-261117-0003"]);
  });
  it("does not change the list it was given", () => {
    const stops = [stop("NEW"), stop("OUT_FOR_DELIVERY")];
    orderStops(stops);
    expect(stops[0].status).toBe("NEW");
  });
  it("picks the next stop", () => {
    expect(nextStop([stop("NEW"), stop("FAILED_ATTEMPT"), stop("OUT_FOR_DELIVERY")])?.status).toBe("OUT_FOR_DELIVERY");
    expect(nextStop([stop("NEW"), stop("FAILED_ATTEMPT")])?.status).toBe("FAILED_ATTEMPT");
    expect(nextStop([])).toBeNull();
  });
  it("draws the progress strip: delivered, retries, next, ahead", () => {
    const ordered = orderStops([stop("NEW"), stop("FAILED_ATTEMPT"), stop("OUT_FOR_DELIVERY")]);
    expect(runMarks(4, ordered)).toEqual(["d", "d", "d", "d", "f", "n", ""]);
    expect(runMarks(2, [])).toEqual(["d", "d"]);
    expect(runMarks(0, [stop("FAILED_ATTEMPT")])).toEqual(["n"]);
  });
});
