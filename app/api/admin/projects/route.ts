import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  createAdminProject,
  listAdminProjects,
  serializeId,
} from "@/lib/admin-data";
import { ObjectId } from "@/lib/mongo";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const projects = await listAdminProjects();
    return NextResponse.json(
      projects.map((p) => ({
        ...serializeId(p),
        clientId: p.clientId
          ? p.clientId instanceof ObjectId
            ? p.clientId.toHexString()
            : String(p.clientId)
          : null,
        imageIds: (p.imageIds || []).map((id) =>
          id instanceof ObjectId ? id.toHexString() : String(id),
        ),
      })),
    );
  } catch (err) {
    console.error("[GET /api/admin/projects]", err);
    return NextResponse.json(
      { error: "Failed to list projects" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as {
      name?: string;
      year?: number;
      sector?: string;
      location?: string;
      shortDesc?: string;
      description?: string;
      clientName?: string;
      clientId?: string | null;
      isHome?: boolean;
    };

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const year = Number(body.year);
    if (!Number.isFinite(year)) {
      return NextResponse.json({ error: "year is required" }, { status: 400 });
    }

    const project = await createAdminProject({
      name: body.name.trim(),
      year,
      sector: body.sector?.trim() || "Construction",
      location: body.location?.trim() || "",
      shortDesc: body.shortDesc ?? "",
      description: body.description ?? "",
      clientName: body.clientName ?? "",
      clientId: body.clientId ?? null,
      isHome: Boolean(body.isHome),
    });

    return NextResponse.json(
      {
        ...serializeId(project),
        clientId: project.clientId
          ? project.clientId instanceof ObjectId
            ? project.clientId.toHexString()
            : String(project.clientId)
          : null,
        imageIds: [],
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("[POST /api/admin/projects]", err);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 },
    );
  }
}
