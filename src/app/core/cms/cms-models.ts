import type { CatalogDestination } from '../catalog/tours';
import type { TourPage } from '../catalog/tour-pages';
import type { AppLocale, Messages } from '../i18n/catalogs';

export type SiteSettings = {
  email: string;
  phone: string;
  /** Digits only, e.g. `519XXXXXXXXX`. */
  whatsapp: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  youtube: string;
  linkedin: string;
  google: string;
  tripadvisor: string;
  legalName: string;
  ruc: string;
};

export type MediaSlot = {
  image?: string;
  video?: string;
  videoWebm?: string;
  poster?: string;
};

export type LocalizedFields<T> = Partial<Record<AppLocale, T>>;

export type CmsPage = {
  slug: string;
  heroImage?: string;
  i18n: LocalizedFields<{
    title: string;
    lead: string;
    body: string;
    seoTitle: string;
    seoDescription: string;
  }>;
};

export type BlogPost = {
  slug: string;
  publishedDate: string;
  cover?: string;
  featured: boolean;
  i18n: LocalizedFields<{
    title: string;
    category: string;
    excerpt: string;
    content: string;
    seoDescription: string;
  }>;
};

export type Product = {
  slug: string;
  order: number;
  price?: number;
  featured: boolean;
  image?: string;
  gallery: readonly string[];
  i18n: LocalizedFields<{ title: string; description: string; details: string }>;
};

/** Everything the app reads from Strapi, already mapped. JSON-safe so it travels in TransferState. */
export type CmsSnapshot = {
  destinations: readonly CatalogDestination[];
  tourPages: Readonly<Record<string, TourPage>>;
  site: SiteSettings | null;
  messages: Readonly<Partial<Record<AppLocale, Messages>>>;
  media: Readonly<Record<string, MediaSlot>>;
  pages: Readonly<Record<string, CmsPage>>;
  posts: readonly BlogPost[];
  products: readonly Product[];
};

export type CmsConfig = {
  /** Base URL the server uses to reach Strapi. `null` disables the CMS (static catalog only). */
  url: string | null;
  /** Base URL used to build media links the browser can open. Defaults to `url`. */
  publicUrl: string | null;
  token: string | null;
  cacheTtlMs: number;
  timeoutMs: number;
};
