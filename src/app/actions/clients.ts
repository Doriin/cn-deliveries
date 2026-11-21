"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FeeMode } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser, OFFICE_ROLES } from "@/lib/auth";
import { bool, str } from "@/lib/form";
import { parseMDL } from "@/lib/money";
import { DEFAULT_HEADERS, type SheetField } from "@/lib/sheetColumns";
import type { FormState } from "@/components/ActionForm";

/** Accepts a full Google Sheets URL or a bare spreadsheet id. */
function parseSheetId(v: string | null): string | null {
  if (!v) return null;
  const m = v.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : v;
}

export async function saveClient(_: FormState, form: FormData): Promise<FormState> {
  await requireUser(OFFICE_ROLES);
  const id = str(form, "id");
  const name = str(form, "name");
  if (!name) return { error: "nameRequired" };

  const columnMap: Partial<Record<SheetField, string>> = {};
  for (const f of Object.keys(DEFAULT_HEADERS) as SheetField[]) {
    const v = str(form, `col_${f}`);
    if (v && v !== DEFAULT_HEADERS[f]) columnMap[f] = v;
  }

  const zones = await db.zone.findMany();
  const prices: { zoneId: string; price: number | null }[] = [];
  for (const z of zones) {
    const raw = str(form, `price_${z.id}`);
    const price = raw === null ? null : parseMDL(raw);
    if (raw !== null && price === null) return { error: "invalidAmount" };
    prices.push({ zoneId: z.id, price });
  }

  const sheetId = parseSheetId(str(form, "sheetId"));
  const data = {
    name,
    contactName: str(form, "contactName"),
    phone: str(form, "phone"),
    email: str(form, "email"),
    address: str(form, "address"),
    fiscalCode: str(form, "fiscalCode"),
    iban: str(form, "iban"),
    feeMode: (str(form, "feeMode") ?? "INVOICE") as FeeMode,
    notes: str(form, "notes"),
    active: bool(form, "active"),
    sheetId,
    sheetTab: str(form, "sheetTab"),
    sheetSyncEnabled: !!sheetId && bool(form, "sheetSyncEnabled"),
    columnMap,
  };

  const client = id ? await db.client.update({ where: { id }, data }) : await db.client.create({ data });

  for (const p of prices) {
    if (p.price === null) {
      await db.clientZonePrice.deleteMany({ where: { clientId: client.id, zoneId: p.zoneId } });
    } else {
      await db.clientZonePrice.upsert({
        where: { clientId_zoneId: { clientId: client.id, zoneId: p.zoneId } },
        create: { clientId: client.id, zoneId: p.zoneId, price: p.price },
        update: { price: p.price },
      });
    }
  }
  revalidatePath("/clients");
  if (!id) redirect(`/clients/${client.id}`);
  revalidatePath(`/clients/${client.id}`);
  return { ok: true };
}
