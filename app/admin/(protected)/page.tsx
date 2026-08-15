"use client";

import Link from "next/link";
import { useAdminBase } from "@/components/admin/AdminBaseContext";
import { adminHref } from "@/lib/admin-path";

export default function AdminDashboardPage() {
  const base = useAdminBase();

  return (
    <div className="admin-card">
      <h1>Dashboard</h1>
      <p className="admin-muted">
        Manage projects, clients, contact leads, and site copy.
      </p>
      <ul className="admin-dash-list">
        <li>
          <Link href={adminHref(base, "/projects")}>Projects</Link> — CRUD,
          home flag, images
        </li>
        <li>
          <Link href={adminHref(base, "/clients")}>Clients</Link>
        </li>
        <li>
          <Link href={adminHref(base, "/customers")}>Customers inbox</Link>{" "}
          (read-only)
        </li>
        <li>
          <Link href={adminHref(base, "/settings")}>Site settings</Link>
        </li>
      </ul>
    </div>
  );
}
