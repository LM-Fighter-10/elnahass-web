"use client";

import { useDisableSiteChrome } from "@/components/SiteChrome";

/** Client wrapper: hide public nav/footer on all admin routes. */
export default function AdminChromeOff({
  children,
}: {
  children: React.ReactNode;
}) {
  useDisableSiteChrome();
  return <>{children}</>;
}
