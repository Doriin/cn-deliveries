import { describe, expect, it } from "vitest";
import { courierNextStatuses, courierPrimaryStatus, courierSection, extractTracking, validateProof } from "./courier";

describe("courier rules", () => {
  it("never offers office-only statuses", () => {
    expect(courierNextStatuses("NEW")).toEqual(["PICKED_UP", "ON_HOLD"]);
    expect(courierNextStatuses("OUT_FOR_DELIVERY")).toContain("DELIVERED");
    expect(courierNextStatuses("ON_HOLD")).not.toContain("CANCELLED");
  });
  it("requires receiver name and photo or signature on delivery", () => {
    expect(validateProof({ to: "DELIVERED", receivedBy: "", hasPhoto: true, hasSignature: false })).toBe("receivedByRequired");
    expect(validateProof({ to: "DELIVERED", receivedBy: "Ana", hasPhoto: false, hasSignature: false })).toBe("proofRequired");
    expect(validateProof({ to: "DELIVERED", receivedBy: "Ana", hasPhoto: false, hasSignature: true })).toBeNull();
    expect(validateProof({ to: "FAILED_ATTEMPT", hasPhoto: false, hasSignature: false })).toBeNull();
  });
  it("extracts tracking numbers from scans", () => {
    expect(extractTracking("https://cn-deliveries.com/track/CN-261117-0001")).toBe("CN-261117-0001");
    expect(extractTracking("cn-261117-0042")).toBe("CN-261117-0042");
    expect(extractTracking("hello")).toBeNull();
  });
  it("picks the forward step as the main button", () => {
    expect(courierPrimaryStatus("NEW")).toBe("PICKED_UP");
    expect(courierPrimaryStatus("PICKED_UP")).toBe("OUT_FOR_DELIVERY");
    expect(courierPrimaryStatus("AT_WAREHOUSE")).toBe("OUT_FOR_DELIVERY");
    expect(courierPrimaryStatus("OUT_FOR_DELIVERY")).toBe("DELIVERED");
    expect(courierPrimaryStatus("FAILED_ATTEMPT")).toBe("OUT_FOR_DELIVERY");
    expect(courierPrimaryStatus("REFUSED")).toBe("RETURNING");
    expect(courierPrimaryStatus("RETURNING")).toBe("RETURNED");
    expect(courierPrimaryStatus("DELIVERED")).toBeNull();
  });
  it("groups the daily list into sections", () => {
    expect(courierSection("OUT_FOR_DELIVERY")).toBe("deliver");
    expect(courierSection("CONFIRMED")).toBe("pickup");
    expect(courierSection("AT_WAREHOUSE")).toBe("withMe");
    expect(courierSection("POSTPONED")).toBe("other");
  });
});
