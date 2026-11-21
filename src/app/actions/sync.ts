"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser, OFFICE_ROLES } from "@/lib/auth";
import { str } from "@/lib/form";
import { sheetsConfigured, syncClientLogged } from "@/worker/sheets/sync";
import type { FormState } from "@/components/ActionForm";

export async function syncNow(_: FormState, form: FormData): Promise<FormState> {
  await requireUser(OFFICE_ROLES);
  if (!sheetsConfigured()) return { error: "sheetsNotConfigured" };
  const id = str(form, "clientId");
  const clients = await db.client.findMany({ where: { sheetId: { not: null }, ...(id ? { id } : { sheetSyncEnabled: true, active: true }) } });
  let imported = 0, updated = 0, errors = 0;
  for (const c of clients) {
    const r = await syncClientLogged(c);
    imported += r.imported;
    updated += r.updated;
    errors += r.errors;
  }
  revalidatePath("/sync");
  revalidatePath("/shipments");
  return { ok: true, message: `+${imported} / ${updated} / ${errors}` };
}
