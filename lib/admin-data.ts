import {
  getCollections,
  ObjectId,
  type ClientDoc,
  type ImageDocument,
  type ProjectDoc,
  type SiteSettingsDoc,
} from "@/lib/mongo";
import type { SiteSettings } from "@/lib/types";

export async function nextProjectId(): Promise<number> {
  const { projects } = await getCollections();
  const last = await projects
    .find({})
    .sort({ projectId: -1 })
    .limit(1)
    .project({ projectId: 1 })
    .toArray();
  return (last[0]?.projectId ?? 0) + 1;
}

export type AdminProjectPayload = {
  name: string;
  year: number;
  sector: string;
  location: string;
  shortDesc?: string;
  description?: string;
  clientName?: string;
  clientId?: string | null;
  isHome?: boolean;
};

export async function listAdminProjects(): Promise<ProjectDoc[]> {
  const { projects } = await getCollections();
  return projects.find({}).sort({ projectId: 1 }).toArray();
}

export async function getAdminProject(
  projectId: number,
): Promise<(ProjectDoc & { images: ImageDocument[] }) | null> {
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

  return { ...project, images: imageDocs };
}

export async function createAdminProject(
  payload: AdminProjectPayload,
): Promise<ProjectDoc> {
  const { projects } = await getCollections();
  const projectId = await nextProjectId();
  const now = new Date();
  const doc: ProjectDoc = {
    projectId,
    name: payload.name,
    year: payload.year,
    sector: payload.sector,
    location: payload.location,
    shortDesc: payload.shortDesc ?? "",
    description: payload.description ?? "",
    clientName: payload.clientName ?? "",
    clientId: payload.clientId ? new ObjectId(payload.clientId) : null,
    clientLegacyId: null,
    isHome: Boolean(payload.isHome),
    imageIds: [],
    createdAt: now,
    updatedAt: now,
  };
  const result = await projects.insertOne(doc);
  return { ...doc, _id: result.insertedId };
}

export async function updateAdminProject(
  projectId: number,
  payload: Partial<AdminProjectPayload> & { imageIds?: string[] },
): Promise<ProjectDoc | null> {
  const { projects } = await getCollections();
  const $set: Record<string, unknown> = { updatedAt: new Date() };

  if (payload.name !== undefined) $set.name = payload.name;
  if (payload.year !== undefined) $set.year = payload.year;
  if (payload.sector !== undefined) $set.sector = payload.sector;
  if (payload.location !== undefined) $set.location = payload.location;
  if (payload.shortDesc !== undefined) $set.shortDesc = payload.shortDesc;
  if (payload.description !== undefined) $set.description = payload.description;
  if (payload.clientName !== undefined) $set.clientName = payload.clientName;
  if (payload.isHome !== undefined) $set.isHome = payload.isHome;
  if (payload.clientId !== undefined) {
    $set.clientId = payload.clientId ? new ObjectId(payload.clientId) : null;
  }
  if (payload.imageIds !== undefined) {
    $set.imageIds = payload.imageIds.map((id) => new ObjectId(id));
  }

  const result = await projects.findOneAndUpdate(
    { projectId },
    { $set },
    { returnDocument: "after" },
  );
  return result ?? null;
}

export async function deleteAdminProject(projectId: number): Promise<boolean> {
  const { projects, images } = await getCollections();
  const project = await projects.findOne({ projectId });
  if (!project) return false;
  if (project.imageIds?.length) {
    await images.deleteMany({ _id: { $in: project.imageIds } });
  }
  await images.deleteMany({ projectId });
  await projects.deleteOne({ projectId });
  return true;
}

export async function addProjectImage(params: {
  projectId: number;
  url: string;
  storagePath?: string;
  thumbnail?: boolean;
  alt?: string;
}): Promise<ImageDocument> {
  const { projects, images } = await getCollections();
  const project = await projects.findOne({ projectId: params.projectId });
  if (!project) throw new Error("Project not found");

  if (params.thumbnail) {
    await images.updateMany(
      { projectId: params.projectId },
      { $set: { thumbnail: false } },
    );
  }

  const doc: ImageDocument = {
    url: params.url,
    thumbnail: Boolean(params.thumbnail),
    projectId: params.projectId,
    alt: params.alt,
    storagePath: params.storagePath,
  };
  const result = await images.insertOne(doc);
  const id = result.insertedId;
  await projects.updateOne(
    { projectId: params.projectId },
    {
      $push: { imageIds: id },
      $set: { updatedAt: new Date() },
    } as Parameters<typeof projects.updateOne>[1],
  );
  return { ...doc, _id: id };
}

export async function setThumbnail(
  projectId: number,
  imageId: string,
): Promise<void> {
  const { images } = await getCollections();
  const oid = new ObjectId(imageId);
  await images.updateMany({ projectId }, { $set: { thumbnail: false } });
  const updated = await images.updateOne(
    { _id: oid, projectId },
    { $set: { thumbnail: true } },
  );
  if (updated.matchedCount === 0) {
    throw new Error("Image not found for project");
  }
}

export async function reorderProjectImages(
  projectId: number,
  imageIds: string[],
): Promise<void> {
  const { projects } = await getCollections();
  const oids = imageIds.map((id) => new ObjectId(id));
  const result = await projects.updateOne(
    { projectId },
    { $set: { imageIds: oids, updatedAt: new Date() } },
  );
  if (result.matchedCount === 0) throw new Error("Project not found");
}

export async function deleteProjectImage(
  projectId: number,
  imageId: string,
): Promise<void> {
  const { projects, images } = await getCollections();
  const oid = new ObjectId(imageId);
  const existing = await images.findOne({ _id: oid, projectId });
  if (!existing) throw new Error("Image not found for project");

  await images.deleteOne({ _id: oid });
  await projects.updateOne(
    { projectId },
    {
      $pull: { imageIds: oid },
      $set: { updatedAt: new Date() },
    } as Parameters<typeof projects.updateOne>[1],
  );

  // If we removed the cover, promote the first remaining image
  if (existing.thumbnail) {
    const project = await projects.findOne({ projectId });
    const nextId = project?.imageIds?.[0];
    if (nextId) {
      await images.updateOne(
        { _id: nextId, projectId },
        { $set: { thumbnail: true } },
      );
    }
  }
}

export async function listClients(): Promise<ClientDoc[]> {
  const { clients } = await getCollections();
  return clients.find({}).sort({ name: 1 }).toArray();
}

export async function createClient(name: string): Promise<ClientDoc> {
  const { clients } = await getCollections();
  const doc: ClientDoc = { name: name.trim() };
  const result = await clients.insertOne(doc);
  return { ...doc, _id: result.insertedId };
}

export async function updateClient(
  id: string,
  name: string,
): Promise<ClientDoc | null> {
  const { clients } = await getCollections();
  const result = await clients.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { name: name.trim() } },
    { returnDocument: "after" },
  );
  return result ?? null;
}

export async function deleteClient(id: string): Promise<boolean> {
  const { clients } = await getCollections();
  const result = await clients.deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount === 1;
}

export async function listCustomers() {
  const { customers } = await getCollections();
  return customers.find({}).sort({ createdAt: -1 }).toArray();
}

export async function updateSiteSettings(
  payload: SiteSettings,
): Promise<SiteSettingsDoc> {
  const { siteSettings } = await getCollections();
  const { _id: _omit, key: _key, ...rest } = payload as SiteSettings & {
    _id?: unknown;
    key?: unknown;
  };
  const result = await siteSettings.findOneAndUpdate(
    { key: "default" },
    { $set: { ...rest, key: "default" } },
    { upsert: true, returnDocument: "after" },
  );
  if (!result) throw new Error("Failed to save site settings");
  return result;
}

export function serializeId<T extends { _id?: ObjectId | string }>(
  doc: T,
): Omit<T, "_id"> & { _id: string } {
  const id =
    typeof doc._id === "string"
      ? doc._id
      : doc._id
        ? doc._id.toHexString()
        : "";
  const { _id: _omit, ...rest } = doc;
  return { ...rest, _id: id } as Omit<T, "_id"> & { _id: string };
}
