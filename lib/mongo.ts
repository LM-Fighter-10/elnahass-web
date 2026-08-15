import { MongoClient, Db, ObjectId } from "mongodb";
import type {
  Client,
  Customer,
  ImageDoc,
  Project,
  ProjectDetail,
  ProjectListItem,
  SiteSettings,
} from "@/lib/types";

const NO_IMAGE = "NoImageSelected/";

export type ClientDoc = Omit<Client, "_id"> & {
  _id?: ObjectId;
  legacyId?: number;
};

export type ImageDocument = Omit<ImageDoc, "_id"> & {
  _id?: ObjectId;
  legacyId?: number;
  storagePath?: string;
};

export type ProjectDoc = Omit<
  Project,
  "_id" | "clientId" | "imageIds" | "createdAt" | "updatedAt"
> & {
  _id?: ObjectId;
  clientId?: ObjectId | null;
  clientLegacyId?: number | null;
  imageIds: ObjectId[];
  createdAt?: Date;
  updatedAt?: Date;
};

export type CustomerDoc = Omit<Customer, "_id" | "createdAt"> & {
  _id?: ObjectId;
  createdAt: Date;
};

export type SiteSettingsDoc = SiteSettings & {
  _id?: ObjectId;
  key: "default";
};

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function requireUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set");
  }
  return uri;
}

export function getDbName(): string {
  return process.env.MONGODB_DB || "elnahass";
}

export async function getMongoClient(): Promise<MongoClient> {
  if (!global._mongoClientPromise) {
    const client = new MongoClient(requireUri());
    global._mongoClientPromise = client.connect();
  }
  return global._mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(getDbName());
}

export async function getCollections() {
  const db = await getDb();
  return {
    clients: db.collection<ClientDoc>("clients"),
    images: db.collection<ImageDocument>("images"),
    projects: db.collection<ProjectDoc>("projects"),
    customers: db.collection<CustomerDoc>("customers"),
    siteSettings: db.collection<SiteSettingsDoc>("siteSettings"),
  };
}

/** Create indexes (idempotent). Call from seed and optionally on cold start. */
export async function ensureIndexes(db?: Db): Promise<void> {
  const database = db ?? (await getDb());
  await Promise.all([
    database.collection("clients").createIndex({ legacyId: 1 }, { unique: true, sparse: true }),
    database.collection("clients").createIndex({ name: 1 }),
    database.collection("images").createIndex({ legacyId: 1 }, { unique: true, sparse: true }),
    database.collection("images").createIndex({ projectId: 1, thumbnail: 1 }),
    database.collection("projects").createIndex({ projectId: 1 }, { unique: true }),
    database.collection("projects").createIndex({ isHome: 1, year: -1 }),
    database.collection("siteSettings").createIndex({ key: 1 }, { unique: true }),
  ]);

  // Contact leads may be submitted more than once with the same fields/email.
  // Drop the legacy unique compound index if it still exists (idempotent).
  try {
    await database
      .collection("customers")
      .dropIndex("name_1_email_1_phone_1_outlineDesc_1");
  } catch {
    // Index already absent
  }
  await database
    .collection("customers")
    .createIndex({ email: 1, createdAt: -1 });
}

export function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

/** Django quirk: if ≥2 images, move first to index 1. */
export function reorderGalleryUrls(urls: string[]): string[] {
  if (urls.length < 2) return [...urls];
  const next = [...urls];
  const first = next.shift()!;
  next.splice(1, 0, first);
  return next;
}

export function toListItem(
  project: ProjectDoc,
  thumbnailUrl?: string | null,
): ProjectListItem {
  return {
    id: project.projectId,
    name: project.name,
    type: project.sector,
    img: thumbnailUrl && thumbnailUrl.length > 0 ? thumbnailUrl : NO_IMAGE,
    desc: project.shortDesc ?? "",
    year: project.year,
  };
}

export async function fetchProjectsList(): Promise<ProjectListItem[]> {
  const { projects, images } = await getCollections();
  const all = await projects.find({}).sort({ projectId: 1 }).toArray();
  const thumbs = await images
    .find({ thumbnail: true })
    .project({ projectId: 1, url: 1 })
    .toArray();
  const thumbByProject = new Map(thumbs.map((t) => [t.projectId, t.url]));
  return all.map((p) => toListItem(p, thumbByProject.get(p.projectId)));
}

export async function fetchHomeProjects(): Promise<ProjectListItem[]> {
  const { projects, images } = await getCollections();
  const home = await projects
    .find({ isHome: true })
    .sort({ year: -1 })
    .limit(4)
    .toArray();
  const shuffled = shuffleInPlace([...home]);
  const ids = shuffled.map((p) => p.projectId);
  const thumbs = await images
    .find({ projectId: { $in: ids }, thumbnail: true })
    .project({ projectId: 1, url: 1 })
    .toArray();
  const thumbByProject = new Map(thumbs.map((t) => [t.projectId, t.url]));
  return shuffled.map((p) => toListItem(p, thumbByProject.get(p.projectId)));
}

export async function fetchProjectDetail(
  projectId: number,
): Promise<ProjectDetail | null> {
  const { projects, images } = await getCollections();
  const project = await projects.findOne({ projectId });
  if (!project) return null;

  let imageDocs: ImageDocument[] = [];
  if (project.imageIds?.length) {
    const byId = await images
      .find({ _id: { $in: project.imageIds } })
      .toArray();
    const map = new Map(byId.map((img) => [img._id!.toHexString(), img]));
    imageDocs = project.imageIds
      .map((id) => map.get(id.toHexString()))
      .filter((img): img is NonNullable<typeof img> => Boolean(img));
  } else {
    imageDocs = await images.find({ projectId }).toArray();
  }

  const galleryRaw = imageDocs.map((img) => img.url);
  const cover =
    imageDocs.find((img) => img.thumbnail)?.url ??
    (galleryRaw[0] || NO_IMAGE);
  const gallery = reorderGalleryUrls(galleryRaw);
  const list = toListItem(project, cover === NO_IMAGE ? null : cover);

  return {
    ...list,
    location: project.location,
    clientName: project.clientName,
    description: project.description,
    cover,
    gallery,
  };
}

export async function fetchSiteSettings(): Promise<SiteSettingsDoc | null> {
  const { siteSettings } = await getCollections();
  return siteSettings.findOne({ key: "default" });
}

/** @deprecated Duplicate blocking removed — always returns false for API compat. */
export async function findCustomerDuplicate(_params: {
  name: string;
  email: string;
  phone: string;
  outlineDesc: string;
}): Promise<boolean> {
  return false;
}

/** Drop legacy unique compound index so the same email/fields can submit again. */
let contactLeadIndexesReady: Promise<void> | null = null;

async function ensureContactLeadAllowsRepeats(): Promise<void> {
  if (!contactLeadIndexesReady) {
    contactLeadIndexesReady = (async () => {
      const { customers } = await getCollections();
      try {
        await customers.dropIndex("name_1_email_1_phone_1_outlineDesc_1");
      } catch {
        // Index already absent
      }
      await customers.createIndex({ email: 1, createdAt: -1 });
    })();
  }
  await contactLeadIndexesReady;
}

export async function insertCustomer(params: {
  name: string;
  email: string;
  phone: string;
  outlineDesc: string;
}): Promise<{ inserted: boolean; duplicated: boolean }> {
  await ensureContactLeadAllowsRepeats();
  const { customers } = await getCollections();
  await customers.insertOne({
    name: params.name,
    email: params.email,
    phone: params.phone,
    outlineDesc: params.outlineDesc,
    createdAt: new Date(),
  });
  return { inserted: true, duplicated: false };
}

export { ObjectId, NO_IMAGE };
