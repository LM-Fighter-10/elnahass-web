/**
 * Seed MongoDB from migration-artifacts/mongo-seed.json.
 *
 * Image strategy:
 * - If BLOB_READ_WRITE_TOKEN is set → upload to Vercel Blob and store blob URLs.
 * - Else → copy webp into public/database/ and store /database/<file> URLs.
 *
 * Usage:
 *   npm run seed
 *   # or
 *   npx tsx scripts/seed-mongo.ts
 */

import { config } from "dotenv";
import { promises as fs } from "fs";
import path from "path";
import { MongoClient, ObjectId } from "mongodb";
import { put } from "@vercel/blob";
import { ensureIndexes, type ClientDoc, type ImageDocument, type ProjectDoc, type SiteSettingsDoc } from "../lib/mongo";

config({ path: path.resolve(process.cwd(), ".env.local") });
config({ path: path.resolve(process.cwd(), ".env") });

const ROOT = path.resolve(process.cwd(), "..");
const SEED_PATH = path.join(ROOT, "migration-artifacts", "mongo-seed.json");
const SOURCE_DB_DIR = path.join(ROOT, "webApp", "static", "database");
const PUBLIC_DB_DIR = path.join(process.cwd(), "public", "database");

type SeedImage = {
  legacyId: number;
  url: string;
  thumbnail: boolean;
  publicPath?: string;
  projectId?: number;
};

type SeedProject = {
  projectId: number;
  name: string;
  year: number;
  sector: string;
  location: string;
  shortDesc: string;
  description: string;
  clientLegacyId: number | null;
  clientName: string;
  isHome: boolean;
  images: SeedImage[];
};

type SeedFile = {
  clients: Array<{ legacyId: number; name: string }>;
  projects: SeedProject[];
  images: SeedImage[];
  siteSettings: Omit<SiteSettingsDoc, "_id" | "key">;
  meta?: unknown;
};

function basenameFromUrl(url: string): string {
  return path.basename(url.replace(/\\/g, "/"));
}

async function ensureLocalPublicCopies(): Promise<void> {
  await fs.mkdir(PUBLIC_DB_DIR, { recursive: true });
  const entries = await fs.readdir(SOURCE_DB_DIR);
  for (const name of entries) {
    if (!name.toLowerCase().endsWith(".webp")) continue;
    await fs.copyFile(
      path.join(SOURCE_DB_DIR, name),
      path.join(PUBLIC_DB_DIR, name),
    );
  }
}

async function resolveImageUrl(
  relativeUrl: string,
  useBlob: boolean,
): Promise<string> {
  const fileName = basenameFromUrl(relativeUrl);
  const localPath = path.join(SOURCE_DB_DIR, fileName);

  if (useBlob) {
    const buf = await fs.readFile(localPath);
    const blob = await put(`database/${fileName}`, buf, {
      access: "public",
      contentType: "image/webp",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return blob.url;
  }

  return `/database/${fileName}`;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is required (set in .env.local)");
  }
  const dbName = process.env.MONGODB_DB || "elnahass";
  const useBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

  console.log(`Reading seed: ${SEED_PATH}`);
  const raw = await fs.readFile(SEED_PATH, "utf8");
  const seed = JSON.parse(raw) as SeedFile;

  if (!useBlob) {
    console.log("No BLOB_READ_WRITE_TOKEN — copying images to public/database/");
    await ensureLocalPublicCopies();
  } else {
    console.log("BLOB_READ_WRITE_TOKEN set — uploading to Vercel Blob");
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  await ensureIndexes(db);

  const clientsCol = db.collection<ClientDoc>("clients");
  const imagesCol = db.collection<ImageDocument>("images");
  const projectsCol = db.collection<ProjectDoc>("projects");
  const settingsCol = db.collection<SiteSettingsDoc>("siteSettings");

  // Idempotent wipe of seed collections (customers left intact for leads)
  await Promise.all([
    clientsCol.deleteMany({}),
    imagesCol.deleteMany({}),
    projectsCol.deleteMany({}),
    settingsCol.deleteMany({}),
  ]);

  const clientIdByLegacy = new Map<number, ObjectId>();
  if (seed.clients?.length) {
    const docs = seed.clients.map((c) => ({
      legacyId: c.legacyId,
      name: c.name,
    }));
    const result = await clientsCol.insertMany(docs);
    seed.clients.forEach((c, i) => {
      clientIdByLegacy.set(c.legacyId, result.insertedIds[i]);
    });
  }
  console.log(`clients: ${seed.clients.length}`);

  // Map legacy image id → resolved public URL + ObjectId
  const imageIdByLegacy = new Map<number, ObjectId>();
  const urlByLegacy = new Map<number, string>();

  // Prefer nested project.images for projectId association; fall back to top-level list
  const flatImages: Array<SeedImage & { projectId: number }> = [];
  for (const project of seed.projects) {
    for (const img of project.images || []) {
      flatImages.push({ ...img, projectId: project.projectId });
    }
  }
  // Include any top-level images not already nested
  const nestedLegacy = new Set(flatImages.map((i) => i.legacyId));
  for (const img of seed.images || []) {
    if (!nestedLegacy.has(img.legacyId)) {
      // Infer projectId from matching nested absence — skip if unknown
      const match = seed.projects.find((p) =>
        (p.images || []).some((i) => i.legacyId === img.legacyId),
      );
      if (match) {
        flatImages.push({ ...img, projectId: match.projectId });
      }
    }
  }

  for (const img of flatImages) {
    const url = await resolveImageUrl(img.url, useBlob);
    urlByLegacy.set(img.legacyId, url);
    const doc: ImageDocument = {
      legacyId: img.legacyId,
      url,
      thumbnail: img.thumbnail,
      projectId: img.projectId,
      storagePath: img.url,
    };
    const { insertedId } = await imagesCol.insertOne(doc);
    imageIdByLegacy.set(img.legacyId, insertedId);
  }
  console.log(`images: ${flatImages.length} (blob=${useBlob})`);

  const now = new Date();
  const projectDocs: ProjectDoc[] = seed.projects.map((p) => {
    const imageIds = (p.images || [])
      .map((img) => imageIdByLegacy.get(img.legacyId))
      .filter((id): id is ObjectId => Boolean(id));
    return {
      projectId: p.projectId,
      name: p.name,
      year: p.year,
      sector: p.sector,
      location: p.location,
      shortDesc: p.shortDesc ?? "",
      description: p.description ?? "",
      clientLegacyId: p.clientLegacyId ?? null,
      clientId:
        p.clientLegacyId != null
          ? clientIdByLegacy.get(p.clientLegacyId) ?? null
          : null,
      clientName: p.clientName ?? "",
      isHome: Boolean(p.isHome),
      imageIds,
      createdAt: now,
      updatedAt: now,
    };
  });
  if (projectDocs.length) {
    await projectsCol.insertMany(projectDocs);
  }
  console.log(`projects: ${projectDocs.length}`);

  await settingsCol.insertOne({
    key: "default",
    ...seed.siteSettings,
  } as SiteSettingsDoc);
  console.log("siteSettings: 1");

  await client.close();
  console.log(`Seed complete → ${dbName}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
