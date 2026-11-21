import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = path.resolve(process.env.UPLOAD_DIR ?? "./uploads");
const MAX_BYTES = 8 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

async function write(buf: Buffer, ext: string, prefix: string): Promise<string> {
  const month = new Date().toISOString().slice(0, 7);
  const rel = path.posix.join(month, `${prefix}-${crypto.randomUUID()}.${ext}`);
  await fs.mkdir(path.join(ROOT, month), { recursive: true });
  await fs.writeFile(path.join(ROOT, rel), buf);
  return rel;
}

/** Saves an uploaded image. Returns the relative path, null when empty, or throws "invalidFile". */
export async function saveImageFile(file: FormDataEntryValue | null, prefix: string): Promise<string | null> {
  if (!file || typeof file === "string" || file.size === 0) return null;
  const ext = TYPES[file.type];
  if (!ext || file.size > MAX_BYTES) throw new Error("invalidFile");
  return write(Buffer.from(await file.arrayBuffer()), ext, prefix);
}

/** Saves a `data:image/png;base64,...` string (signature pad). */
export async function saveDataUrl(dataUrl: FormDataEntryValue | null, prefix: string): Promise<string | null> {
  if (typeof dataUrl !== "string" || !dataUrl) return null;
  const m = dataUrl.match(/^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/=]+)$/);
  if (!m) throw new Error("invalidFile");
  const buf = Buffer.from(m[2], "base64");
  if (buf.length > MAX_BYTES) throw new Error("invalidFile");
  return write(buf, TYPES[m[1]], prefix);
}

/** Resolves a stored relative path safely inside the upload root (null if it escapes). */
export function resolveUpload(rel: string): string | null {
  const full = path.resolve(ROOT, rel);
  return full.startsWith(ROOT + path.sep) ? full : null;
}

export function contentType(rel: string): string {
  const ext = path.extname(rel).slice(1);
  return Object.entries(TYPES).find(([, e]) => e === ext)?.[0] ?? "application/octet-stream";
}
