/**
 * Production Django admin URL path (exact parity).
 * Served via middleware rewrite → internal `/admin/*`.
 */
export const DJANGO_ADMIN_PATH =
  "/django-insecure-65i(0n)pi-g_y$ah!ybbnripso8$7m1rbivq!zypwe$lf98)n";

export const ADMIN_BASE_HEADER = "x-elnahass-admin-base";

export function isDjangoAdminPath(pathname: string): boolean {
  return (
    pathname === DJANGO_ADMIN_PATH ||
    pathname.startsWith(`${DJANGO_ADMIN_PATH}/`)
  );
}

export function isAdminUiPath(pathname: string): boolean {
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    isDjangoAdminPath(pathname)
  );
}

/** Public URL prefix for admin UI links (secret path or `/admin`). */
export function getAdminBaseFromPathname(pathname: string | null): string {
  if (pathname && isDjangoAdminPath(pathname)) {
    return DJANGO_ADMIN_PATH;
  }
  return "/admin";
}

/** Build an admin UI href under the current base. path e.g. "", "/login", "/projects/1". */
export function adminHref(base: string, path = ""): string {
  if (!path || path === "/") return base;
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}
