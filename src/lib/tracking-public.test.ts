import { describe, expect, it } from "vitest";
import { STATUSES } from "./status";
import { publicStep } from "./tracking-public";

describe("public tracking steps", () => {
  it("maps every status", () => {
    for (const s of STATUSES) expect(publicStep(s)).toBeGreaterThanOrEqual(-1);
    expect(publicStep("NEW")).toBe(0);
    expect(publicStep("OUT_FOR_DELIVERY")).toBe(2);
    expect(publicStep("DELIVERED")).toBe(3);
    expect(publicStep("RETURNED")).toBe(-1);
  });
});
