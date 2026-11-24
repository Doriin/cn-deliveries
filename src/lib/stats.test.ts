import { describe, expect, it } from "vitest";
import { dayBounds } from "./dates";
import { change, computeStats, hourly, lastDays, moment, parsePeriod, type StatEvent, type StatPayment, type StatShipment } from "./stats";

/** A moment given in Moldova time. */
const at = (day: string, hour: number) => new Date(dayBounds(day).start.getTime() + hour * 3600000);

const ship = (s: Partial<StatShipment> & Pick<StatShipment, "createdAt" | "status">): StatShipment => ({
  deliveredAt: null, deliveryFee: 0, codAmount: 0, zone: null, clientId: "c1", client: "Shop", courierId: null, failed: 0, ...s,
});

describe("periods", () => {
  it("accepts 7, 30 and 90 days, otherwise 30", () => {
    expect(parsePeriod("7")).toBe(7);
    expect(parsePeriod("90")).toBe(90);
    expect(parsePeriod(undefined)).toBe(30);
    expect(parsePeriod("15")).toBe(30);
  });
  it("lists the last days, oldest first, across month ends", () => {
    expect(lastDays("2026-11-21", 3)).toEqual(["2026-11-19", "2026-11-20", "2026-11-21"]);
    expect(lastDays("2026-03-01", 2)).toEqual(["2026-02-28", "2026-03-01"]);
  });
});

describe("moment", () => {
  it("reads day, hour and weekday in Moldova time (Monday = 0)", () => {
    expect(moment(new Date("2026-11-21T08:30:00Z"))).toEqual({ day: "2026-11-21", hour: 10, weekday: 5 });
    expect(moment(new Date("2026-07-01T21:30:00Z"))).toEqual({ day: "2026-07-02", hour: 0, weekday: 3 });
  });
});

describe("change", () => {
  it("is the relative change, or null when there is nothing to compare with", () => {
    expect(change(110, 100)).toBeCloseTo(0.1);
    expect(change(5, 0)).toBeNull();
    expect(change(null, 3)).toBeNull();
    expect(change(4, null)).toBeNull();
  });
});

describe("computeStats", () => {
  const today = "2026-11-21";
  const shipments: StatShipment[] = [
    // this period (15–21 Nov)
    ship({ createdAt: at("2026-11-20", 10), deliveredAt: at("2026-11-21", 11), status: "DELIVERED", deliveryFee: 6000, codAmount: 50000, zone: "CHISINAU", courierId: "k1" }),
    ship({ createdAt: at("2026-11-20", 12), deliveredAt: at("2026-11-21", 15), status: "DELIVERED", deliveryFee: 7000, zone: "SUBURBS", courierId: "k1", failed: 1 }),
    ship({ createdAt: at("2026-11-19", 9), status: "RETURNED", deliveryFee: 9000, codAmount: 20000, zone: "MOLDOVA", clientId: "c2", client: "Books", courierId: "k2", failed: 2 }),
    ship({ createdAt: at("2026-11-21", 9), status: "NEW", clientId: "c2", client: "Books" }),
    ship({ createdAt: at("2026-11-18", 9), status: "CANCELLED", zone: "CHISINAU" }),
    // the period before (8–14 Nov)
    ship({ createdAt: at("2026-11-10", 10), deliveredAt: at("2026-11-11", 10), status: "DELIVERED", deliveryFee: 6000, courierId: "k1" }),
    ship({ createdAt: at("2026-11-12", 10), status: "RETURNED", failed: 1 }),
    // too old to count
    ship({ createdAt: at("2026-11-01", 10), deliveredAt: at("2026-11-02", 10), status: "DELIVERED", deliveryFee: 99999 }),
  ];
  const payments: StatPayment[] = [
    { amount: 50000, method: "CASH_RECEIPT", collectedAt: at("2026-11-21", 11), courierId: "k1" },
    { amount: 30000, method: "CARD", collectedAt: at("2026-11-11", 10), courierId: "k1" },
  ];
  const events: StatEvent[] = [
    { toStatus: "FAILED_ATTEMPT", reason: "NO_ANSWER", createdAt: at("2026-11-20", 16), userId: "k1" },
    { toStatus: "FAILED_ATTEMPT", reason: "ABSENT", createdAt: at("2026-11-19", 15), userId: "k2" },
    { toStatus: "FAILED_ATTEMPT", reason: "NO_ANSWER", createdAt: at("2026-11-20", 13), userId: "k2" },
    { toStatus: "FAILED_ATTEMPT", reason: "ABSENT", createdAt: at("2026-11-12", 13), userId: "k2" },
  ];
  const s = computeStats({ today, period: 7, shipments, payments, events });

  it("covers the chosen days", () => {
    expect(s.days).toEqual(lastDays(today, 7));
  });
  it("counts shipments and deliveries against the period before", () => {
    expect(s.kpis.shipments).toMatchObject({ value: 5, prev: 2 });
    expect(s.kpis.shipments.series).toEqual([0, 0, 0, 1, 1, 2, 1]);
    expect(s.kpis.delivered).toMatchObject({ value: 2, prev: 1 });
    expect(s.volume.delivered).toEqual([0, 0, 0, 0, 0, 0, 2]);
  });
  it("measures success (delivered of finished) and first-try deliveries", () => {
    expect(s.kpis.successRate.value).toBeCloseTo(2 / 3);
    expect(s.kpis.successRate.prev).toBeCloseTo(1 / 2);
    expect(s.kpis.firstTry.value).toBeCloseTo(1 / 2);
    expect(s.kpis.firstTry.prev).toBe(1);
  });
  it("averages the hours from order to delivery", () => {
    expect(s.kpis.avgHours.value).toBeCloseTo(26);
    expect(s.kpis.avgHours.prev).toBeCloseTo(24);
  });
  it("sums fees of delivered parcels and COD by the day it was collected", () => {
    expect(s.kpis.fees).toMatchObject({ value: 13000, prev: 6000 });
    expect(s.kpis.cod).toMatchObject({ value: 50000, prev: 30000 });
    expect(s.codByMethod.CASH_RECEIPT.at(-1)).toBe(50000);
    expect(s.codByMethod.CARD.every((v) => v === 0)).toBe(true);
  });
  it("sorts every shipment of the period into one outcome", () => {
    expect(s.outcomes).toEqual({ firstTry: 1, retry: 1, returned: 1, cancelled: 1, open: 1 });
  });
  it("ranks why deliveries failed", () => {
    expect(s.reasons).toEqual([
      { status: "FAILED_ATTEMPT", reason: "NO_ANSWER", count: 2 },
      { status: "FAILED_ATTEMPT", reason: "ABSENT", count: 1 },
    ]);
  });
  it("splits by zone and by client", () => {
    expect(s.zones[0]).toEqual({ zone: "CHISINAU", count: 2, delivered: 1 });
    expect(s.zones.find((z) => z.zone === null)?.count).toBe(1);
    expect(s.clients).toEqual([
      { id: "c1", name: "Shop", count: 3, cod: 50000 },
      { id: "c2", name: "Books", count: 2, cod: 0 },
    ]);
  });
  it("adds up each courier", () => {
    expect(s.couriers.find((c) => c.id === "k1")).toEqual({ id: "k1", delivered: 2, firstTry: 1, activeDays: 1, cod: 50000, failed: 1 });
    expect(s.couriers.find((c) => c.id === "k2")).toEqual({ id: "k2", delivered: 0, firstTry: 0, activeDays: 0, cod: 0, failed: 2 });
  });
  it("places deliveries on a weekday × hour grid", () => {
    expect(s.heat[5][11]).toBe(1);
    expect(s.heat[5][15]).toBe(1);
    expect(s.heat.flat().reduce((a, b) => a + b, 0)).toBe(2);
  });
});

describe("hourly", () => {
  it("counts today's deliveries per hour next to the usual same weekday", () => {
    const d = [at("2026-11-21", 10.2), at("2026-11-21", 10.7), at("2026-11-21", 14.1),
      ...[1, 2, 3, 4].map((h) => at("2026-11-14", 10 + h / 10)), at("2026-11-07", 10.5), at("2026-11-07", 10.6), at("2026-11-20", 10.5)];
    const h = hourly(d, "2026-11-21");
    expect(h.today[10]).toBe(2);
    expect(h.today[14]).toBe(1);
    expect(h.typical[10]).toBeCloseTo(1.5);
    expect(h.typical[14]).toBe(0);
  });
});
