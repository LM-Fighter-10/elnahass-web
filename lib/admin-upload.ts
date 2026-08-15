import { promises as fs } from "fs";
import path from "path";
import { put } from "@vercel/blob";
import { randomBytes } from "crypto";

const PUBLIC_DB_DIR = path.join(process.cwd(), "public", "database");

function safeExt(name: string, mime: string): string {
  const fromName = path.extname(name).toLowerCase();
  if (fromName && fromName.length <= 8) return fromName;
  if (mime.includes("png")) return ".png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return ".jpg";
  if (mime.includes("webp")) return ".webp";
  if (mime.includes("gif")) return ".gif";
  return ".bin";
}

/** Upload image to Vercel Blob (if token set) or public/database/. */
export async function uploadAdminImage(
  file: File,
): Promise<{ url: string; storagePath?: string }> {
  const buf = Buffer.from(await file.arrayBuffer());
  const ext = safeExt(file.name || "upload", file.type || "");
  const fileName = `admin_${Date.now()}_${randomBytes(4).toString("hex")}${ext}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`database/${fileName}`, buf, {
      access: "public",
      contentType: file.type || undefined,
      addRandomSuffix: false,
    });
    return { url: blob.url, storagePath: `blob:${fileName}` };
  }

  await fs.mkdir(PUBLIC_DB_DIR, { recursive: true });
  const dest = path.join(PUBLIC_DB_DIR, fileName);
  await fs.writeFile(dest, buf);
  return { url: `/database/${fileName}`, storagePath: dest };
}
