import { describe, expect, it } from "vitest";
import { DEFAULT_HEADERS, headersFor } from "@/lib/sheetColumns";
import { buildHeaderIndex, colLetter, parseRow, parseSheetDate } from "./map";

const header = ["Nr. comandă", "Destinatar", "Telefon", "Adresa", "Localitate", "Greutate (kg)", "Ramburs (MDL)", "CN Nr. urmărire", "CN Status"];

describe("sheet mapping", () => {
  it("matches headers ignoring case and diacritics", () => {
    const idx = buildHeaderIndex(header.map((h) => h.toUpperCase().replace("ă", "a")), DEFAULT_HEADERS);
    expect(idx.orderRef).toBe(0);
    expect(idx.recipientPhone).toBe(2);
    expect(idx.trackingNo).toBe(7);
    expect(idx.fee).toBeUndefined();
  });
  it("supports per-client header overrides", () => {
    const idx = buildHeaderIndex(["Client", "Tel"], headersFor({ recipientName: "Client", recipientPhone: "Tel" }));
    expect(idx).toMatchObject({ recipientName: 0, recipientPhone: 1 });
  });
  it("parses a valid row", () => {
    const idx = buildHeaderIndex(header, DEFAULT_HEADERS);
    const r = parseRow(["A-17", "Ion Popescu", "069123456", "str. Ștefan cel Mare 1", "Chișinău", "7,5", "350", "", ""], idx, 2);
    expect(r.kind).toBe("ok");
    if (r.kind !== "ok") return;
    expect(r.row.rowKey).toBe("ref:A-17");
    expect(r.row.input).toMatchObject({ weightGrams: 7500, codAmount: 35000, pieces: 1, type: "PARCEL", recipientLocality: "Chișinău" });
  });
  it("reports missing required fields and skips empty rows", () => {
    const idx = buildHeaderIndex(header, DEFAULT_HEADERS);
    expect(parseRow(["", "", "", "", "", "", "", "", ""], idx, 3)).toEqual({ kind: "empty" });
    expect(parseRow(["", "Ion", "", "addr", "", "", "", "", ""], idx, 3)).toEqual({ kind: "error", error: "missing_recipientPhone" });
    expect(parseRow(["", "Ion", "1", "addr", "", "abc", "", "", ""], idx, 3)).toEqual({ kind: "error", error: "invalid_weight" });
  });
  it("parses dates and column letters", () => {
    expect(parseSheetDate("17.11.2026")?.toISOString().slice(0, 10)).toBe("2026-11-17");
    expect(parseSheetDate("2026-11-17")?.toISOString().slice(0, 10)).toBe("2026-11-17");
    expect(parseSheetDate("tomorrow")).toBeNull();
    expect([colLetter(0), colLetter(25), colLetter(26), colLetter(27)]).toEqual(["A", "Z", "AA", "AB"]);
  });
});
