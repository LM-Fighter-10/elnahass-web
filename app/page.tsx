import { headers } from "next/headers";
import type { ProjectListItem } from "@/lib/types";
import HomeView from "@/components/HomeView";

export const dynamic = "force-dynamic";

async function fetchHomeProjectsFromApi(): Promise<ProjectListItem[]> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "127.0.0.1:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const res = await fetch(`${proto}://${host}/api/projects/home`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`GET /api/projects/home failed: ${res.status}`);
  }
  return res.json() as Promise<ProjectListItem[]>;
}

export default async function HomePage() {
  const projects = await fetchHomeProjectsFromApi();
  return <HomeView projects={projects} />;
}
