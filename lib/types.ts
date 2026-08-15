/** Shared domain types for the Elnahass clone (Mongo-backed). */

export type ProjectSector =
  | "Construction"
  | "Landscape"
  | "Construction & Landscape"
  | "Repair"
  | string;

export interface Client {
  _id?: string;
  name: string;
}

export interface ImageDoc {
  _id?: string;
  url: string;
  thumbnail: boolean;
  projectId: number;
  alt?: string;
}

export interface Project {
  _id?: string;
  projectId: number;
  name: string;
  year: number;
  sector: ProjectSector;
  location: string;
  shortDesc: string;
  description: string;
  clientId?: string | null;
  clientName: string;
  isHome: boolean;
  imageIds?: string[];
  createdAt?: string;
  updatedAt?: string;
}

/** List/card shape returned by GET /api/projects and home feed. */
export interface ProjectListItem {
  id: number;
  name: string;
  type: string;
  img: string;
  desc: string;
  year: number;
}

export interface ProjectDetail extends ProjectListItem {
  location: string;
  clientName: string;
  description: string;
  cover: string;
  gallery: string[];
}

export interface Customer {
  _id?: string;
  name: string;
  email: string;
  phone: string;
  outlineDesc: string;
  createdAt?: string;
}

export interface FetchCustomerResponse {
  customers: Array<{ duplicated: boolean }>;
}

export interface SiteSettings {
  home?: {
    brand?: string;
    tagline1?: string;
    tagline2?: string;
    joinTitle?: string;
    joinBody?: string;
  };
  about?: {
    pageTitle?: string;
    section1Title?: string;
    section1Body?: string;
    section2Title?: string;
    section2Subtitle?: string;
    section2Body?: string;
    clientsTarget?: number;
    projectsTarget?: number;
  };
  contact?: {
    pageTitle?: string;
    sectionTitle?: string;
    findUsTitle?: string;
    address?: string;
    tel?: string;
    fax?: string;
    email?: string;
    mapEmbedUrl?: string;
    mapsLink?: string;
    whatsapp?: string;
  };
  footer?: {
    about?: string;
    phone?: string;
    email?: string;
  };
  brand?: Record<string, string>;
  animation?: Record<string, number>;
  clientsTarget?: number;
  projectsTarget?: number;
}
