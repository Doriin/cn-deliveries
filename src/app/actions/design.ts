"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { DESIGN_COOKIE, isDesign } from "@/lib/design";

/** Stored per browser, like the language, so the owner can compare designs on a desk and a phone independently. */
export async function setDesign(form: FormData) {
  const design = form.get("design");
  if (!isDesign(design)) return;
  (await cookies()).set(DESIGN_COOKIE, design, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  revalidatePath("/", "layout");
}

/** Stores the choice without re-rendering: Settings → Design refreshes the page itself, inside its view transition. */
export async function saveDesign(design: string) {
  if (!isDesign(design)) return;
  (await cookies()).set(DESIGN_COOKIE, design, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}
