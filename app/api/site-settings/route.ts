import { NextResponse } from "next/server";
import { fetchSiteSettings } from "@/lib/mongo";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await fetchSiteSettings();
    if (!settings) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const { _id: _omit, key: _key, ...payload } = settings;
    return NextResponse.json(payload);
  } catch (err) {
    console.error("[GET /api/site-settings]", err);
    return NextResponse.json(
      { error: "Failed to load site settings" },
      { status: 500 },
    );
  }
}
