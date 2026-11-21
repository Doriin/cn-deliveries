"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { SESSION_COOKIE, cookieOptions, signSession } from "@/lib/session";
import { LOCALE_COOKIE, isLocale } from "@/i18n/config";

export type LoginState = { error?: string };

export async function login(_: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.active || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "invalidCredentials" };
  }
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await signSession({ uid: user.id, role: user.role, name: user.name }), cookieOptions);
  if (isLocale(user.locale)) jar.set(LOCALE_COOKIE, user.locale, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  redirect(user.role === "COURIER" ? "/courier" : user.role === "CLIENT" ? "/portal" : "/");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

export async function setLocale(form: FormData) {
  const locale = form.get("locale");
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  const { currentUser } = await import("@/lib/auth");
  const user = await currentUser();
  if (user) await db.user.update({ where: { id: user.id }, data: { locale } });
}
