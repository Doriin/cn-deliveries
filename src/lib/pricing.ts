export type FeeInput = {
  /** zone base price or client override, in bani */
  basePrice: number;
  includedKg: number;
  /** bani per extra kg */
  extraPerKg: number;
  weightGrams: number;
};

/** fee = base + ceil(kg above includedKg) × extraPerKg. All amounts in bani. */
export function calculateFee({ basePrice, includedKg, extraPerKg, weightGrams }: FeeInput): number {
  const extraGrams = Math.max(0, weightGrams - includedKg * 1000);
  const extraKg = Math.ceil(extraGrams / 1000);
  return basePrice + extraKg * extraPerKg;
}
