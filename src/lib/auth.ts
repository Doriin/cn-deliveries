import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { db } from "./db";
import { SESSION_COOKIE, verifySession } from "./session";

export const OFFICE_ROLES: Role[] = ["ADMIN", "DISPATCHER"];
/** Admins can open the courier app too (to test or help). */
export const COURIER_APP_ROLES: Role[] = ["COURIER", "ADMIN"];

export async function currentUser() {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = await db.user.findUnique({ where: { id: session.uid } });
  if (!user || !user.active) return null;
  return user;
}

export async function requireUser(roles?: Role[]) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (roles && !roles.includes(user.role)) {
    if (user.role === "COURIER") redirect("/courier");
    if (user.role === "CLIENT") redirect("/portal");
    redirect("/forbidden");
  }
  return user;
}
