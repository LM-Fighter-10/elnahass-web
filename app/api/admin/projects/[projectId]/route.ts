import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  deleteAdminProject,
  getAdminProject,
  serializeId,
  updateAdminProject,
} from "@/lib/admin-data";
import { ObjectId } from "@/lib/mongo";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { projectId: raw } = await params;
    const projectId = Number(raw);
    if (!Number.isFinite(projectId) || projectId <= 0) {
      return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
    }
    const project = await getAdminProject(projectId);
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const { images, ...rest } = project;
    return NextResponse.json({
      ...serializeId(rest),
      clientId: rest.clientId
        ? rest.clientId instanceof ObjectId
          ? rest.clientId.toHexString()
          : String(rest.clientId)
        : null,
      imageIds: (rest.imageIds || []).map((id) =>
        id instanceof ObjectId ? id.toHexString() : String(id),
      ),
      images: images.map((img) => serializeId(img)),
    });
  } catch (err) {
    console.error("[GET /api/admin/projects/[projectId]]", err);
    return NextResponse.json(
      { error: "Failed to load project" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { projectId: raw } = await params;
    const projectId = Number(raw);
    if (!Number.isFinite(projectId) || projectId <= 0) {
      return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
    }
    const body = (await request.json()) as Record<string, unknown>;
    const updated = await updateAdminProject(projectId, {
      name: body.name as string | undefined,
      year: body.year !== undefined ? Number(body.year) : undefined,
      sector: body.sector as string | undefined,
      location: body.location as string | undefined,
      shortDesc: body.shortDesc as string | undefined,
      description: body.description as string | undefined,
      clientName: body.clientName as string | undefined,
      clientId:
        body.clientId === undefined
          ? undefined
          : (body.clientId as string | null),
      isHome: body.isHome as boolean | undefined,
      imageIds: body.imageIds as string[] | undefined,
    });
    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({
      ...serializeId(updated),
      clientId: updated.clientId
        ? updated.clientId instanceof ObjectId
          ? updated.clientId.toHexString()
          : String(updated.clientId)
        : null,
      imageIds: (updated.imageIds || []).map((id) =>
        id instanceof ObjectId ? id.toHexString() : String(id),
      ),
    });
  } catch (err) {
    console.error("[PATCH /api/admin/projects/[projectId]]", err);
    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { projectId: raw } = await params;
    const projectId = Number(raw);
    if (!Number.isFinite(projectId) || projectId <= 0) {
      return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
    }
    const ok = await deleteAdminProject(projectId);
    if (!ok) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/admin/projects/[projectId]]", err);
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 },
    );
  }
}
