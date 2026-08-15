import { headers } from "next/headers";
import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { ADMIN_BASE_HEADER } from "@/lib/admin-path";
import { getAdminSession } from "@/lib/session";

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();
  const headerStore = await headers();
  const adminBase = headerStore.get(ADMIN_BASE_HEADER) || "/admin";

  if (!session.isLoggedIn) {
    redirect(`${adminBase}/login`);
  }

  return <AdminShell email={session.email}>{children}</AdminShell>;
}
