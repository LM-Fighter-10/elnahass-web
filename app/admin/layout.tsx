import { headers } from "next/headers";
import { AdminBaseProvider } from "@/components/admin/AdminBaseContext";
import AdminChromeOff from "@/components/admin/AdminChromeOff";
import { ADMIN_BASE_HEADER } from "@/lib/admin-path";
import "@/styles/admin.css";

/** Shared admin layout: no public site chrome; load admin CSS once. */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerStore = await headers();
  const adminBase = headerStore.get(ADMIN_BASE_HEADER) || "/admin";

  return (
    <AdminBaseProvider base={adminBase}>
      <AdminChromeOff>{children}</AdminChromeOff>
    </AdminBaseProvider>
  );
}
