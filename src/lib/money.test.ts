import { describe, expect, it } from "vitest";
import { parseKg, parseMDL } from "./money";
import { normalizeLocality } from "./text";
import { formatTrackingNo } from "./tracking";

describe("parsing", () => {
  it("parses MDL amounts", () => {
    expect(parseMDL("60")).toBe(6000);
    expect(parseMDL("12,50")).toBe(1250);
    expect(parseMDL("1 200.5 lei")).toBe(120050);
    expect(parseMDL("")).toBe(0);
    expect(parseMDL("abc")).toBeNull();
  });
  it("parses kg", () => {
    expect(parseKg("7,3")).toBe(7300);
    expect(parseKg("2 kg")).toBe(2000);
    expect(parseKg("x")).toBeNull();
  });
  it("normalizes locality names", () => {
    expect(normalizeLocality("mun. Chișinău")).toBe("chisinau");
    expect(normalizeLocality("or. Ialoveni")).toBe("ialoveni");
    expect(normalizeLocality("Stăuceni")).toBe("stauceni");
  });
  it("formats tracking numbers in Moldova time", () => {
    expect(formatTrackingNo(new Date("2026-11-16T23:30:00Z"), 7)).toBe("CN-261117-0007");
  });
});

import { dayBounds, todayMD } from "./dates";
describe("dates", () => {
  it("computes Moldova day bounds", () => {
    const { start, end } = dayBounds("2026-11-16");
    expect(start.toISOString()).toBe("2026-11-15T22:00:00.000Z");
    expect(end.toISOString()).toBe("2026-11-16T22:00:00.000Z");
    expect(dayBounds("2026-07-01").start.toISOString()).toBe("2026-06-30T21:00:00.000Z");
    expect(todayMD(new Date("2026-11-16T23:30:00Z"))).toBe("2026-11-17");
  });
});

import { normalizePhone } from "./text";
describe("phones", () => {
  it("normalizes Moldovan numbers", () => {
    expect(normalizePhone("069123456")).toBe("+373 69 123 456");
    expect(normalizePhone("+373 69 123 456")).toBe("+373 69 123 456");
    expect(normalizePhone("37369123456")).toBe("+373 69 123 456");
    expect(normalizePhone("022 222 333")).toBe("+373 22 222 333");
    expect(normalizePhone("78111222")).toBe("+373 78 111 222");
    expect(normalizePhone("+40 721 000 000")).toBe("+40 721 000 000");
  });
});
