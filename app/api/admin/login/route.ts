import { NextResponse } from "next/server";
import { verifyAdminCredentials } from "@/lib/admin-auth";
import { getAdminSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      username?: string;
      email?: string;
      password?: string;
    };
    const identifier = (body.username ?? body.email ?? "").trim();
    const password = body.password ?? "";

    if (!verifyAdminCredentials(identifier, password)) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 },
      );
    }

    const session = await getAdminSession();
    session.isLoggedIn = true;
    // Persist login identifier (username or email) for display
    session.email = identifier;
    await session.save();

    return NextResponse.json({ ok: true, email: session.email });
  } catch (err) {
    console.error("[POST /api/admin/login]", err);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
