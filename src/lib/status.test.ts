import { describe, expect, it } from "vitest";
import { validateTransition } from "./status";

const base = { codAmount: 0, codPaid: 0 };

describe("validateTransition", () => {
  it("allows the main flow", () => {
    expect(validateTransition({ ...base, from: "NEW", to: "CONFIRMED" })).toBeNull();
    expect(validateTransition({ ...base, from: "CONFIRMED", to: "PICKED_UP" })).toBeNull();
    expect(validateTransition({ ...base, from: "PICKED_UP", to: "AT_WAREHOUSE" })).toBeNull();
    expect(validateTransition({ ...base, from: "AT_WAREHOUSE", to: "OUT_FOR_DELIVERY" })).toBeNull();
    expect(validateTransition({ ...base, from: "OUT_FOR_DELIVERY", to: "DELIVERED" })).toBeNull();
  });
  it("rejects invalid jumps and final states", () => {
    expect(validateTransition({ ...base, from: "NEW", to: "DELIVERED" })).toBe("invalidTransition");
    expect(validateTransition({ ...base, from: "DELIVERED", to: "NEW" })).toBe("invalidTransition");
    expect(validateTransition({ ...base, from: "PICKED_UP", to: "CANCELLED" })).toBe("invalidTransition");
    expect(validateTransition({ ...base, from: "NEW", to: "NEW" })).toBe("sameStatus");
  });
  it("requires a reason for failed attempts and holds", () => {
    expect(validateTransition({ ...base, from: "OUT_FOR_DELIVERY", to: "FAILED_ATTEMPT" })).toBe("reasonRequired");
    expect(validateTransition({ ...base, from: "OUT_FOR_DELIVERY", to: "FAILED_ATTEMPT", reason: "NO_ANSWER" })).toBeNull();
    expect(validateTransition({ ...base, from: "NEW", to: "ON_HOLD", reason: "BOGUS" })).toBe("reasonRequired");
  });
  it("requires a new date when postponing", () => {
    expect(validateTransition({ ...base, from: "AT_WAREHOUSE", to: "POSTPONED" })).toBe("dateRequired");
    expect(validateTransition({ ...base, from: "AT_WAREHOUSE", to: "POSTPONED", newDate: new Date() })).toBeNull();
  });
  it("requires COD to be collected before delivery", () => {
    expect(validateTransition({ from: "OUT_FOR_DELIVERY", to: "DELIVERED", codAmount: 50000, codPaid: 0 })).toBe("codNotCollected");
    expect(validateTransition({ from: "OUT_FOR_DELIVERY", to: "DELIVERED", codAmount: 50000, codPaid: 50000 })).toBeNull();
  });
});
