import { NextResponse } from "next/server";
import { fetchProjectsList } from "@/lib/mongo";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const projects = await fetchProjectsList();
    return NextResponse.json(projects);
  } catch (err) {
    console.error("[GET /api/projects]", err);
    return NextResponse.json(
      { error: "Failed to load projects" },
      { status: 500 },
    );
  }
}
