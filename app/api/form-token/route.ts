import { NextResponse } from "next/server";
import { issueFormToken } from "@/lib/spam-guard";

export const dynamic = "force-dynamic";

/** Issues a signed, single-use contact-form token (see lib/spam-guard.ts). */
export async function GET() {
  return NextResponse.json(
    { token: issueFormToken() },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
