"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { bool, int, str } from "@/lib/form";
import { parseMDL } from "@/lib/money";
import { normalizeLocality } from "@/lib/text";
import type { FormState } from "@/components/ActionForm";

export async function saveZone(_: FormState, form: FormData): Promise<FormState> {
  await requireUser(["ADMIN"]);
  const id = str(form, "id");
  const nameRo = str(form, "nameRo");
  const basePrice = parseMDL(str(form, "basePrice"));
  const extraPerKg = parseMDL(str(form, "extraPerKg"));
  if (!nameRo) return { error: "nameRequired" };
  if (basePrice === null || extraPerKg === null) return { error: "invalidAmount" };
  const data = {
    nameRo,
    nameRu: str(form, "nameRu") ?? nameRo,
    nameEn: str(form, "nameEn") ?? nameRo,
    basePrice,
    extraPerKg,
    includedKg: int(form, "includedKg", 5),
    sortOrder: int(form, "sortOrder", 0),
  };
  const zone = id
    ? await db.zone.update({ where: { id }, data })
    : await db.zone.create({ data: { ...data, code: normalizeLocality(nameRo).replace(/\s+/g, "_").toUpperCase() || `ZONE_${Date.now()}` } });

  const names = (str(form, "localities") ?? "")
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  await db.$transaction(async (tx) => {
    await tx.locality.deleteMany({ where: { zoneId: zone.id } });
    for (const name of names) {
      const key = normalizeLocality(name);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      // A locality belongs to one zone: moving it here removes it from any other zone.
      await tx.locality.upsert({ where: { key }, create: { key, name, zoneId: zone.id }, update: { name, zoneId: zone.id } });
    }
  });
  revalidatePath("/settings/zones");
  return { ok: true };
}

export async function saveUser(_: FormState, form: FormData): Promise<FormState> {
  await requireUser(["ADMIN"]);
  const id = str(form, "id");
  const name = str(form, "name");
  const email = str(form, "email")?.toLowerCase();
  const role = str(form, "role") as Role | null;
  const password = str(form, "password");
  if (!name || !email || !role) return { error: "requiredFields" };
  if (!id && (!password || password.length < 6)) return { error: "passwordTooShort" };
  if (password && password.length < 6) return { error: "passwordTooShort" };
  const clash = await db.user.findUnique({ where: { email } });
  if (clash && clash.id !== id) return { error: "emailTaken" };
  const data = {
    name,
    email,
    role,
    phone: str(form, "phone"),
    active: id ? bool(form, "active") : true,
    clientId: role === "CLIENT" ? str(form, "clientId") : null,
    ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
  };
  if (id) await db.user.update({ where: { id }, data });
  else await db.user.create({ data: { ...data, passwordHash: await bcrypt.hash(password!, 10) } });
  revalidatePath("/users");
  return { ok: true };
}
