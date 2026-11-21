/** Lowercase, strip diacritics and common Moldovan locality prefixes, collapse spaces. */
export function normalizeLocality(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/^(mun\.?|or\.?|s\.?|sat(ul)?|com\.?|comuna|oras(ul)?|municipiul|г\.?|с\.?)\s+/u, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Moldovan numbers in one format: "+373 69 123 456". Accepts 069123456, 69123456, +37369123456, 373 69 123 456.
 * Anything else (foreign numbers, extensions) is kept as typed.
 */
export function normalizePhone(input: string): string {
  const raw = input.trim().replace(/\s+/g, " ");
  const digits = raw.replace(/\D/g, "");
  let local: string | null = null;
  if (digits.length === 11 && digits.startsWith("373")) local = digits.slice(3);
  else if (digits.length === 9 && digits.startsWith("0")) local = digits.slice(1);
  else if (digits.length === 8 && !raw.startsWith("+")) local = digits;
  if (!local) return raw;
  return `+373 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5)}`;
}
