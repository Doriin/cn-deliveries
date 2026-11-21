import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";
import { DESIGN_PREVIEW_HEADER } from "@/lib/design";

const PUBLIC = ["/login", "/track", "/api/health", "/manifest.webmanifest", "/icons"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"))) return NextResponse.next();
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  // Settings → Design draws each design live in a small frame: `?__design=<id>` renders that design for this one request.
  const preview = req.nextUrl.searchParams.get("__design");
  if (preview) {
    const headers = new Headers(req.headers);
    headers.set(DESIGN_PREVIEW_HEADER, preview);
    return NextResponse.next({ request: { headers } });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)"],
};
