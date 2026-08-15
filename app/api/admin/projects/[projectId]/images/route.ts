import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  addProjectImage,
  deleteProjectImage,
  reorderProjectImages,
  serializeId,
  setThumbnail,
} from "@/lib/admin-data";
import { uploadAdminImage } from "@/lib/admin-upload";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ projectId: string }> };

export async function POST(request: Request, { params }: Params) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { projectId: raw } = await params;
    const projectId = Number(raw);
    if (!Number.isFinite(projectId) || projectId <= 0) {
      return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
    }

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "file required" }, { status: 400 });
      }
      const thumbnail = form.get("thumbnail") === "true" || form.get("thumbnail") === "1";
      const alt = String(form.get("alt") || "");
      const uploaded = await uploadAdminImage(file);
      const image = await addProjectImage({
        projectId,
        url: uploaded.url,
        storagePath: uploaded.storagePath,
        thumbnail,
        alt: alt || undefined,
      });
      return NextResponse.json(serializeId(image), { status: 201 });
    }

    const body = (await request.json()) as {
      action?: string;
      imageId?: string;
      imageIds?: string[];
      thumbnail?: boolean;
      url?: string;
      alt?: string;
    };

    if (body.action === "setThumbnail" && body.imageId) {
      await setThumbnail(projectId, body.imageId);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "reorder" && Array.isArray(body.imageIds)) {
      await reorderProjectImages(projectId, body.imageIds);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "delete" && body.imageId) {
      await deleteProjectImage(projectId, body.imageId);
      return NextResponse.json({ ok: true });
    }

    if (body.url) {
      const image = await addProjectImage({
        projectId,
        url: body.url,
        thumbnail: Boolean(body.thumbnail),
        alt: body.alt,
      });
      return NextResponse.json(serializeId(image), { status: 201 });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (err) {
    console.error("[POST /api/admin/projects/[projectId]/images]", err);
    const message = err instanceof Error ? err.message : "Upload failed";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
