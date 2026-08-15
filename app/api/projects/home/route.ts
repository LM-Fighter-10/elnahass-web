import { NextResponse } from "next/server";
import { fetchHomeProjects } from "@/lib/mongo";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const projects = await fetchHomeProjects();
    return NextResponse.json(projects);
  } catch (err) {
    console.error("[GET /api/projects/home]", err);
    return NextResponse.json(
      { error: "Failed to load home projects" },
      { status: 500 },
    );
  }
}
