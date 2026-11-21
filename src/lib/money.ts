/** Parses "12", "12.5", "12,50", "1 200,00" (MDL) into bani. Returns null when invalid. */
export function parseMDL(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  const s = String(input).replace(/\s/g, "").replace(/(mdl|lei|leu)$/i, "").replace(",", ".");
  if (s === "") return 0;
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(parseFloat(s) * 100);
}

export function formatMDL(bani: number): string {
  const v = bani / 100;
  return `${v.toLocaleString("ro-MD", { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 })} MDL`;
}

/** Bani → plain number string for form inputs ("60", "12.5"). */
export function baniToInput(bani: number): string {
  return String(bani / 100);
}

/** Parses kg ("2", "2.5", "2,5") into grams. */
export function parseKg(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  const s = String(input).replace(/\s/g, "").replace(/kg$/i, "").replace(",", ".");
  if (s === "") return 0;
  if (!/^\d+(\.\d{1,3})?$/.test(s)) return null;
  return Math.round(parseFloat(s) * 1000);
}

export function formatKg(grams: number): string {
  return `${(grams / 1000).toLocaleString("ro-MD", { maximumFractionDigits: 3 })} kg`;
}
