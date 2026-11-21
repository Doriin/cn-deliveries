import fs from "node:fs/promises";
import { currentUser } from "@/lib/auth";
import { contentType, resolveUpload } from "@/lib/uploads";

export async function GET(_: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const user = await currentUser();
  if (!user || user.role === "CLIENT") return new Response("Forbidden", { status: 403 });
  const rel = (await params).path.join("/");
  const full = resolveUpload(rel);
  if (!full) return new Response("Not found", { status: 404 });
  try {
    const buf = await fs.readFile(full);
    return new Response(buf, { headers: { "Content-Type": contentType(rel), "Cache-Control": "private, max-age=86400" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
