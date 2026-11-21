import type { ShipmentType } from "@prisma/client";
import { parseKg, parseMDL } from "@/lib/money";
import { normalizeLocality, normalizePhone } from "@/lib/text";
import { INPUT_FIELDS, OUTPUT_FIELDS, REQUIRED_FIELDS, type SheetField } from "@/lib/sheetColumns";

export type HeaderIndex = Partial<Record<SheetField, number>>;

const norm = (s: string) => normalizeLocality(s).replace(/\s+/g, " ");

export function buildHeaderIndex(headerRow: string[], headers: Record<SheetField, string>): HeaderIndex {
  const idx: HeaderIndex = {};
  const cells = headerRow.map((h) => norm(String(h ?? "")));
  for (const f of [...INPUT_FIELDS, ...OUTPUT_FIELDS]) {
    const i = cells.indexOf(norm(headers[f]));
    if (i >= 0) idx[f] = i;
  }
  return idx;
}

/** 0 → A, 25 → Z, 26 → AA */
export function colLetter(i: number): string {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

export function parseSheetDate(v: string): Date | null {
  const s = v.trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2,4})$/);
  if (m) {
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    return new Date(Date.UTC(y, +m[2] - 1, +m[1]));
  }
  return null;
}

function parseType(v: string): ShipmentType {
  return /^(doc|документ)/i.test(v.trim()) ? "DOCUMENTS" : "PARCEL";
}

export type ParsedRow = {
  rowKey: string;
  input: {
    recipientName: string;
    recipientPhone: string;
    recipientAddress: string;
    recipientLocality: string | null;
    weightGrams: number;
    pieces: number;
    codAmount: number;
    type: ShipmentType;
    contents: string | null;
    desiredDate: Date | null;
    notes: string | null;
  };
};

/** Error keys are under `sheetErrors.` in messages. */
export type RowResult = { kind: "empty" } | { kind: "error"; error: string } | { kind: "ok"; row: ParsedRow };

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** `rowNumber` is 1-based sheet row. */
export function parseRow(row: string[], idx: HeaderIndex, rowNumber: number): RowResult {
  const get = (f: SheetField) => (idx[f] === undefined ? "" : String(row[idx[f]!] ?? "").trim());
  const inputs = INPUT_FIELDS.map(get);
  if (inputs.every((v) => v === "")) return { kind: "empty" };
  for (const f of REQUIRED_FIELDS) if (!get(f)) return { kind: "error", error: `missing_${f}` };
  const weightGrams = parseKg(get("weightKg"));
  if (weightGrams === null) return { kind: "error", error: "invalid_weight" };
  const codAmount = parseMDL(get("codAmount"));
  if (codAmount === null) return { kind: "error", error: "invalid_cod" };
  const dateRaw = get("desiredDate");
  const desiredDate = dateRaw ? parseSheetDate(dateRaw) : null;
  if (dateRaw && !desiredDate) return { kind: "error", error: "invalid_date" };
  const pieces = parseInt(get("pieces"), 10);
  const orderRef = get("orderRef");
  const rowKey = orderRef
    ? `ref:${orderRef}`
    : `row:${rowNumber}:${hash([get("recipientName"), get("recipientPhone"), get("recipientAddress")].join("|"))}`;
  return {
    kind: "ok",
    row: {
      rowKey,
      input: {
        recipientName: get("recipientName"),
        recipientPhone: normalizePhone(get("recipientPhone")),
        recipientAddress: get("recipientAddress"),
        recipientLocality: get("recipientLocality") || null,
        weightGrams,
        pieces: Number.isFinite(pieces) && pieces > 0 ? pieces : 1,
        codAmount,
        type: parseType(get("type")),
        contents: get("contents") || null,
        desiredDate,
        notes: [orderRef && `#${orderRef}`, get("notes")].filter(Boolean).join(" · ") || null,
      },
    },
  };
}
