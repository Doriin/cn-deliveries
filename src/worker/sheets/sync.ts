import fs from "node:fs";
import { google, type sheets_v4 } from "googleapis";
import type { Client } from "@prisma/client";
import { db } from "@/lib/db";
import { createShipment } from "@/lib/shipments";
import { headersFor, OUTPUT_FIELDS, type SheetField } from "@/lib/sheetColumns";
import ro from "../../../messages/ro.json";
import { buildHeaderIndex, colLetter, parseRow } from "./map";

export type SyncResult = { imported: number; updated: number; errors: number; message?: string };

let cached: sheets_v4.Sheets | null = null;

export function sheetsConfigured(): boolean {
  const p = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  return !!p && fs.existsSync(p);
}

export function serviceAccountEmail(): string | null {
  try {
    return JSON.parse(fs.readFileSync(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!, "utf8")).client_email ?? null;
  } catch {
    return null;
  }
}

function sheetsApi(): sheets_v4.Sheets {
  if (cached) return cached;
  if (!sheetsConfigured()) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not set or the file does not exist");
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  cached = google.sheets({ version: "v4", auth });
  return cached;
}

const STATUS_RO = ro.status as Record<string, string>;
const REASON_RO = ro.reason as Record<string, string>;
const SHEET_ERR_RO = ro.sheetErrors as Record<string, string>;

const q = (tab: string) => `'${tab.replace(/'/g, "''")}'`;

function fmtDate(d: Date) {
  return d.toLocaleString("ro-MD", { timeZone: "Europe/Chisinau", dateStyle: "short", timeStyle: "short" });
}

/** Imports new rows from the client's sheet and writes tracking no./status/fee back. */
export async function syncClient(client: Client): Promise<SyncResult> {
  const api = sheetsApi();
  const spreadsheetId = client.sheetId!;
  let tab = client.sheetTab;
  if (!tab) {
    const meta = await api.spreadsheets.get({ spreadsheetId, fields: "sheets.properties.title" });
    tab = meta.data.sheets?.[0]?.properties?.title ?? "Sheet1";
  }
  const res = await api.spreadsheets.values.get({ spreadsheetId, range: q(tab), valueRenderOption: "FORMATTED_VALUE" });
  const values = (res.data.values ?? []) as string[][];
  if (values.length === 0) return { imported: 0, updated: 0, errors: 0, message: "empty sheet" };

  const headers = headersFor(client.columnMap);
  const headerRow = [...values[0]];
  let idx = buildHeaderIndex(headerRow, headers);
  const writes: sheets_v4.Schema$ValueRange[] = [];

  // Add any missing CN output columns at the end of the header row.
  const missing = OUTPUT_FIELDS.filter((f) => idx[f] === undefined);
  if (missing.length) {
    for (const f of missing) headerRow.push(headers[f]);
    writes.push({ range: `${q(tab)}!A1:${colLetter(headerRow.length - 1)}1`, values: [headerRow] });
    idx = buildHeaderIndex(headerRow, headers);
  }
  const cell = (f: SheetField, rowNumber: number) => `${q(tab)}!${colLetter(idx[f]!)}${rowNumber}`;
  const put = (f: SheetField, rowNumber: number, v: string, current?: string) => {
    if ((current ?? "") !== v) writes.push({ range: cell(f, rowNumber), values: [[v]] });
  };

  let imported = 0;
  let errors = 0;
  const rowByTracking = new Map<string, { rowNumber: number; row: string[] }>();

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const rowNumber = i + 1;
    const existing = String(row[idx.trackingNo!] ?? "").trim();
    if (existing) {
      rowByTracking.set(existing, { rowNumber, row });
      continue;
    }
    const r = parseRow(row, idx, rowNumber);
    const note = String(row[idx.tmsNote!] ?? "");
    if (r.kind === "empty") continue;
    if (r.kind === "error") {
      errors++;
      put("tmsNote", rowNumber, SHEET_ERR_RO[r.error] ?? r.error, note);
      continue;
    }
    // The unique (clientId, sheetRowKey) protects against duplicates if a previous write-back failed.
    let s = await db.shipment.findUnique({ where: { clientId_sheetRowKey: { clientId: client.id, sheetRowKey: r.row.rowKey } } });
    if (!s) {
      s = await createShipment({ ...r.row.input, clientId: client.id }, { source: "SHEET", sheetRowKey: r.row.rowKey });
      imported++;
    }
    put("trackingNo", rowNumber, s.trackingNo);
    put("tmsNote", rowNumber, "", note);
    rowByTracking.set(s.trackingNo, { rowNumber, row: [] });
    await db.shipment.update({ where: { id: s.id }, data: { sheetNeedsSync: true } });
  }

  // Write back status/fee for shipments that changed.
  const pending = await db.shipment.findMany({ where: { clientId: client.id, source: "SHEET", sheetNeedsSync: true } });
  let updated = 0;
  const synced: string[] = [];
  for (const s of pending) {
    const loc = rowByTracking.get(s.trackingNo);
    if (!loc) continue;
    const status = STATUS_RO[s.status] + (s.statusReason ? ` (${REASON_RO[s.statusReason] ?? s.statusReason})` : "");
    put("status", loc.rowNumber, status, loc.row[idx.status!]);
    put("statusDate", loc.rowNumber, fmtDate(s.updatedAt), loc.row[idx.statusDate!]);
    put("fee", loc.rowNumber, String(s.deliveryFee / 100), loc.row[idx.fee!]);
    synced.push(s.id);
    updated++;
  }

  if (writes.length) {
    await api.spreadsheets.values.batchUpdate({ spreadsheetId, requestBody: { valueInputOption: "RAW", data: writes } });
  }
  if (synced.length) await db.shipment.updateMany({ where: { id: { in: synced } }, data: { sheetNeedsSync: false } });
  return { imported, updated, errors };
}

export async function syncClientLogged(client: Client): Promise<SyncResult> {
  const log = await db.sheetSyncLog.create({ data: { clientId: client.id } });
  try {
    const r = await syncClient(client);
    await db.sheetSyncLog.update({ where: { id: log.id }, data: { ...r, finishedAt: new Date() } });
    await db.client.update({ where: { id: client.id }, data: { lastSyncedAt: new Date() } });
    return r;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await db.sheetSyncLog.update({ where: { id: log.id }, data: { errors: 1, message: message.slice(0, 500), finishedAt: new Date() } });
    return { imported: 0, updated: 0, errors: 1, message };
  }
}

export async function syncAll(): Promise<void> {
  const clients = await db.client.findMany({ where: { active: true, sheetSyncEnabled: true, sheetId: { not: null } } });
  for (const c of clients) {
    const r = await syncClientLogged(c);
    console.log(`[sheets] ${c.name}: +${r.imported} imported, ${r.updated} updated, ${r.errors} errors${r.message ? ` — ${r.message}` : ""}`);
  }
}
