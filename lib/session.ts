import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export type AdminSessionData = {
  isLoggedIn: boolean;
  email?: string;
};

const DEFAULT_SECRET =
  "dev-only-change-me-elnahass-admin-session-secret-32chars";

export function getSessionOptions(): SessionOptions {
  const password =
    process.env.SESSION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    DEFAULT_SECRET;

  if (password.length < 32) {
    throw new Error(
      "SESSION_SECRET (or NEXTAUTH_SECRET) must be at least 32 characters",
    );
  }

  return {
    password,
    cookieName: "elnahass_admin_session",
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    },
  };
}

export async function getAdminSession() {
  return getIronSession<AdminSessionData>(
    await cookies(),
    getSessionOptions(),
  );
}
