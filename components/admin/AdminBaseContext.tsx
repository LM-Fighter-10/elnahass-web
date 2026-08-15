"use client";

import { createContext, useContext, type ReactNode } from "react";

const AdminBaseContext = createContext("/admin");

export function AdminBaseProvider({
  base,
  children,
}: {
  base: string;
  children: ReactNode;
}) {
  return (
    <AdminBaseContext.Provider value={base}>{children}</AdminBaseContext.Provider>
  );
}

export function useAdminBase(): string {
  return useContext(AdminBaseContext);
}
