/**
 * Google Sheet column mapping. Columns are matched by header name (row 1), so clients can reorder them.
 * `columnMap` on Client stores only overrides of these default headers.
 */
export const INPUT_FIELDS = [
  "orderRef",
  "recipientName",
  "recipientPhone",
  "recipientAddress",
  "recipientLocality",
  "weightKg",
  "pieces",
  "codAmount",
  "type",
  "contents",
  "desiredDate",
  "notes",
] as const;

export const OUTPUT_FIELDS = ["trackingNo", "status", "statusDate", "fee", "tmsNote"] as const;

export type SheetField = (typeof INPUT_FIELDS)[number] | (typeof OUTPUT_FIELDS)[number];

export const REQUIRED_FIELDS: SheetField[] = ["recipientName", "recipientPhone", "recipientAddress"];

export const DEFAULT_HEADERS: Record<SheetField, string> = {
  orderRef: "Nr. comandă",
  recipientName: "Destinatar",
  recipientPhone: "Telefon",
  recipientAddress: "Adresa",
  recipientLocality: "Localitate",
  weightKg: "Greutate (kg)",
  pieces: "Colete",
  codAmount: "Ramburs (MDL)",
  type: "Tip",
  contents: "Conținut",
  desiredDate: "Data livrării",
  notes: "Note",
  trackingNo: "CN Nr. urmărire",
  status: "CN Status",
  statusDate: "CN Data status",
  fee: "CN Tarif (MDL)",
  tmsNote: "CN Notă",
};

export function headersFor(columnMap: unknown): Record<SheetField, string> {
  const overrides = (columnMap && typeof columnMap === "object" ? columnMap : {}) as Partial<Record<SheetField, string>>;
  const out = { ...DEFAULT_HEADERS };
  for (const k of Object.keys(out) as SheetField[]) {
    const v = overrides[k];
    if (typeof v === "string" && v.trim()) out[k] = v.trim();
  }
  return out;
}
