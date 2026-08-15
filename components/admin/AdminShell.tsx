"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAdminBase } from "@/components/admin/AdminBaseContext";
import { adminHref } from "@/lib/admin-path";

const NAV = [
  { path: "", label: "Dashboard", exact: true },
  { path: "/projects", label: "Projects" },
  { path: "/clients", label: "Clients" },
  { path: "/customers", label: "Customers" },
  { path: "/settings", label: "Site settings" },
];

export default function AdminShell({
  children,
  email,
}: {
  children: React.ReactNode;
  email?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const base = useAdminBase();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push(adminHref(base, "/login"));
    router.refresh();
  }

  return (
    <div className="admin-root">
      <div className="admin-shell">
        <aside className="admin-nav">
          <div className="brand">
            <Image
              src="/Media/logo.png"
              alt=""
              width={40}
              height={40}
              className="admin-nav-logo"
            />
            <div className="brand-text">
              <span className="brand-name">Elnahass</span>
              <span className="brand-sub">Admin</span>
            </div>
          </div>
          <nav className="admin-nav-list" aria-label="Admin">
            {NAV.map((link) => {
              const href = adminHref(base, link.path);
              // pathname may be internal (/admin/…) after rewrite — normalize
              const internalPath =
                pathname?.startsWith("/admin")
                  ? pathname
                  : pathname?.startsWith(base)
                    ? `/admin${pathname.slice(base.length)}`
                    : pathname || "";
              const linkInternal = `/admin${link.path}`;
              const active = link.exact
                ? internalPath === "/admin" || internalPath === "/admin/"
                : internalPath === linkInternal ||
                  internalPath.startsWith(`${linkInternal}/`);
              return (
                <Link
                  key={link.path || "dashboard"}
                  href={href}
                  className={active ? "active" : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <div className="admin-nav-footer">
            {email ? (
              <p className="admin-muted admin-nav-user">{email}</p>
            ) : null}
            <button
              type="button"
              className="admin-btn secondary"
              onClick={logout}
            >
              Log out
            </button>
          </div>
        </aside>
        <main className="admin-main">{children}</main>
      </div>
    </div>
  );
}
