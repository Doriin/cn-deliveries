import { describe, expect, it } from "vitest";
import { calculateFee } from "./pricing";

const chisinau = { basePrice: 6000, includedKg: 5, extraPerKg: 400 };

describe("calculateFee", () => {
  it("charges base price up to 5 kg", () => {
    expect(calculateFee({ ...chisinau, weightGrams: 0 })).toBe(6000);
    expect(calculateFee({ ...chisinau, weightGrams: 5000 })).toBe(6000);
  });
  it("adds 4 MDL per started kg above 5 kg", () => {
    expect(calculateFee({ ...chisinau, weightGrams: 5001 })).toBe(6400);
    expect(calculateFee({ ...chisinau, weightGrams: 7300 })).toBe(6000 + 3 * 400);
    expect(calculateFee({ ...chisinau, weightGrams: 10000 })).toBe(6000 + 5 * 400);
  });
  it("uses the given base (zone or client override)", () => {
    expect(calculateFee({ basePrice: 9000, includedKg: 5, extraPerKg: 400, weightGrams: 6000 })).toBe(9400);
  });
});
