export function str(form: FormData, name: string): string | null {
  const v = form.get(name);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

export function bool(form: FormData, name: string): boolean {
  const v = form.get(name);
  return v === "on" || v === "true" || v === "1";
}

export function date(form: FormData, name: string): Date | null {
  const v = str(form, name);
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  return new Date(`${v}T00:00:00Z`);
}

export function int(form: FormData, name: string, fallback = 0): number {
  const v = str(form, name);
  const n = v === null ? NaN : parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

/** Date → "YYYY-MM-DD" for <input type="date">. */
export function dateInput(d: Date | null | undefined): string {
  return d ? d.toISOString().slice(0, 10) : "";
}
