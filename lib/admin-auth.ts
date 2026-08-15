import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";

export function getAdminCredentials(): {
  email: string;
  username: string;
  password: string;
} {
  const email =
    process.env.ADMIN_EMAIL ||
    process.env.NEXTAUTH_ADMIN_EMAIL ||
    "admin@elnahass.local";
  const username = process.env.ADMIN_USERNAME || "Fighter-10";
  const password =
    process.env.ADMIN_PASSWORD ||
    process.env.NEXTAUTH_ADMIN_PASSWORD ||
    "admin123";
  return { email, username, password };
}

/**
 * Accept Django-style username or legacy email login.
 */
export function verifyAdminCredentials(
  identifier: string,
  password: string,
): boolean {
  const expected = getAdminCredentials();
  const id = identifier.trim();
  if (!id || password !== expected.password) return false;

  const idLower = id.toLowerCase();
  const emailOk = idLower === expected.email.trim().toLowerCase();
  const userOk = idLower === expected.username.trim().toLowerCase();
  return emailOk || userOk;
}

export async function requireAdmin(): Promise<
  | { ok: true; email: string }
  | { ok: false; response: NextResponse }
> {
  const session = await getAdminSession();
  if (!session.isLoggedIn || !session.email) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true, email: session.email };
}
