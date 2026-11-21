import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@prisma/client";

export const SESSION_COOKIE = "cn_session";
const MAX_AGE = 60 * 60 * 24 * 14;

export type SessionPayload = { uid: string; role: Role; name: string };

function key() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters");
  return new TextEncoder().encode(s);
}

export async function signSession(p: SessionPayload): Promise<string> {
  return new SignJWT(p).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(`${MAX_AGE}s`).sign(key());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE,
};
