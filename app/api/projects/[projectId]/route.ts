import { NextResponse } from "next/server";
import { fetchProjectDetail } from "@/lib/mongo";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { projectId: raw } = await params;
    const projectId = Number(raw);
    if (!Number.isFinite(projectId) || projectId <= 0) {
      return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
    }
    const project = await fetchProjectDetail(projectId);
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(project);
  } catch (err) {
    console.error("[GET /api/projects/[projectId]]", err);
    return NextResponse.json(
      { error: "Failed to load project" },
      { status: 500 },
    );
  }
}
