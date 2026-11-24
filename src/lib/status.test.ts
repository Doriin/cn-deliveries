import { describe, expect, it } from "vitest";
import { codDue, validateTransition } from "./status";

describe("codDue", () => {
  it("is what is left to collect on a parcel still on its way", () => {
    expect(codDue("OUT_FOR_DELIVERY", 134900, 0)).toBe(134900);
    expect(codDue("AT_WAREHOUSE", 134900, 34900)).toBe(100000);
    expect(codDue("DELIVERED", 134900, 134900)).toBe(0);
  });
  it("is nothing when the delivery failed, is blocked, or the parcel goes back", () => {
    for (const s of ["FAILED_ATTEMPT", "ON_HOLD", "REFUSED", "RETURNING", "RETURNED", "CANCELLED"] as const) expect(codDue(s, 134900, 0)).toBe(0);
  });
});

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
  it("lets a parcel go straight back to the sender once it could not be delivered", () => {
    for (const from of ["FAILED_ATTEMPT", "REFUSED", "AT_WAREHOUSE", "ON_HOLD", "POSTPONED", "RETURNING"] as const) {
      expect(validateTransition({ ...base, from, to: "RETURNED" })).toBeNull();
    }
    for (const from of ["NEW", "CONFIRMED", "PICKED_UP", "OUT_FOR_DELIVERY"] as const) {
      expect(validateTransition({ ...base, from, to: "RETURNED" })).toBe("invalidTransition");
    }
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
