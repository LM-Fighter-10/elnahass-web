/**
 * Seed-derived expectations for Playwright / API contracts.
 * Source of truth: ../migration-artifacts/mongo-seed.json (relative to elnahass-web).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PROJECTS_PER_PAGE } from "../../lib/animations";

type SeedImage = { thumbnail?: boolean; url?: string };
type SeedProject = {
  projectId: number;
  name: string;
  sector: string;
  isHome?: boolean;
  images?: SeedImage[];
};
type SeedFile = {
  clients: unknown[];
  projects: SeedProject[];
  customers?: unknown[];
};

function resolveSeedPath(): string {
  const fromCwd = resolve(process.cwd(), "../migration-artifacts/mongo-seed.json");
  try {
    readFileSync(fromCwd);
    return fromCwd;
  } catch {
    return resolve(process.cwd(), "migration-artifacts/mongo-seed.json");
  }
}

const seed = JSON.parse(readFileSync(resolveSeedPath(), "utf8")) as SeedFile;

const projects = seed.projects;
const homeProjects = projects
  .filter((p) => p.isHome)
  .sort((a, b) => a.projectId - b.projectId);

/** Projects whose sector string mentions landscape (filter checkbox). */
export const LANDSCAPE_PROJECT_COUNT = projects.filter((p) =>
  (p.sector || "").toLowerCase().includes("landscape"),
).length;

export const PROJECT_COUNT = projects.length;
export const CLIENT_COUNT = seed.clients.length;
export const CUSTOMER_COUNT = (seed.customers ?? []).length;
export const IMAGE_COUNT = projects.reduce(
  (n, p) => n + (p.images?.length ?? 0),
  0,
);

export const PROJECTS_WITH_IMAGES = projects.filter(
  (p) => (p.images?.length ?? 0) > 0,
).length;
export const PROJECTS_WITHOUT_IMAGES = PROJECT_COUNT - PROJECTS_WITH_IMAGES;

export const HOME_PROJECT_IDS = homeProjects.map((p) => p.projectId);
export const HOME_PROJECT_NAMES = homeProjects.map((p) => p.name);
export const HOME_PROJECT_COUNT = homeProjects.length;

/** Carousel indicators = home projects that have a thumbnail image. */
export const HOME_CAROUSEL_INDICATORS = homeProjects.filter((p) =>
  (p.images ?? []).some((img) => img.thumbnail),
).length;

export const MAX_PROJECT_ID = Math.max(...projects.map((p) => p.projectId));
export const PAGINATION_PAGE_COUNT = Math.ceil(
  PROJECT_COUNT / PROJECTS_PER_PAGE,
);

/** Project ids in list order (id asc) — matches API / projects grid. */
export const PROJECT_IDS_ORDERED = projects
  .map((p) => p.projectId)
  .sort((a, b) => a - b);

export const PAGE1_PROJECT_IDS = PROJECT_IDS_ORDERED.slice(0, PROJECTS_PER_PAGE);
export const PAGE2_PROJECT_IDS = PROJECT_IDS_ORDERED.slice(
  PROJECTS_PER_PAGE,
  PROJECTS_PER_PAGE * 2,
);
export const PAGE3_FIRST_PROJECT_ID =
  PROJECT_IDS_ORDERED[PROJECTS_PER_PAGE * 2] ?? null;

export const seedMeta = {
  PROJECT_COUNT,
  CLIENT_COUNT,
  CUSTOMER_COUNT,
  IMAGE_COUNT,
  LANDSCAPE_PROJECT_COUNT,
  PROJECTS_WITH_IMAGES,
  PROJECTS_WITHOUT_IMAGES,
  HOME_PROJECT_IDS,
  HOME_PROJECT_NAMES,
  HOME_PROJECT_COUNT,
  HOME_CAROUSEL_INDICATORS,
  MAX_PROJECT_ID,
  PAGINATION_PAGE_COUNT,
  PROJECT_IDS_ORDERED,
  PAGE1_PROJECT_IDS,
  PAGE2_PROJECT_IDS,
  PAGE3_FIRST_PROJECT_ID,
} as const;
