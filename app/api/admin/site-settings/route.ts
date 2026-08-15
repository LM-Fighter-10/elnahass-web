import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { updateSiteSettings } from "@/lib/admin-data";
import { fetchSiteSettings } from "@/lib/mongo";
import type { SiteSettings } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const settings = await fetchSiteSettings();
    if (!settings) {
      return NextResponse.json({});
    }
    const { _id: _omit, key: _key, ...payload } = settings;
    return NextResponse.json(payload);
  } catch (err) {
    console.error("[GET /api/admin/site-settings]", err);
    return NextResponse.json(
      { error: "Failed to load settings" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as SiteSettings;
    const saved = await updateSiteSettings(body);
    const { _id: _omit, key: _key, ...payload } = saved;
    return NextResponse.json(payload);
  } catch (err) {
    console.error("[PUT /api/admin/site-settings]", err);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 },
    );
  }
}
