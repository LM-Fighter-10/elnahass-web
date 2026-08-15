import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ADMIN_BASE_HEADER,
  DJANGO_ADMIN_PATH,
  isDjangoAdminPath,
} from "@/lib/admin-path";

/**
 * Rewrite the obscure Django admin path → internal `/admin/*` so special
 * characters (`$ ( ) !`) never need a filesystem route or next.config rewrite
 * (path-to-regexp treats `$` specially).
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isDjangoAdminPath(pathname)) {
    const rest = pathname.slice(DJANGO_ADMIN_PATH.length);
    const url = request.nextUrl.clone();
    url.pathname = rest ? `/admin${rest}` : "/admin";

    const headers = new Headers(request.headers);
    headers.set(ADMIN_BASE_HEADER, DJANGO_ADMIN_PATH);
    return NextResponse.rewrite(url, { request: { headers } });
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const headers = new Headers(request.headers);
    headers.set(ADMIN_BASE_HEADER, "/admin");
    return NextResponse.next({ request: { headers } });
  }

  return NextResponse.next();
}

export const config = {
  // Broad matcher — do not put `$` literals in matcher patterns.
  // Exclude static assets / API (admin APIs stay on /api/admin).
  matcher: [
    "/admin",
    "/admin/:path*",
    "/((?!_next/static|_next/image|favicon.ico|Media/|database/|api/).*)",
  ],
};
