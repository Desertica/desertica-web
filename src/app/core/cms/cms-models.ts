import type { CatalogDestination } from '../catalog/tours';
import type { TourFeature, TourPage } from '../catalog/tour-pages';
import type { AppLocale, Messages } from '../i18n/catalogs';

export type SiteSettings = {
  brandName: string;
  legalYear: number;
  /** Image used for `og:image`; empty when none is set. */
  shareImage: string;
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

/** CSS custom properties a palette can override, keyed by the CMS field name. */
export const PALETTE_TOKENS = {
  background: '--background',
  foreground: '--foreground',
  card: '--card',
  cardForeground: '--card-foreground',
  popover: '--popover',
  popoverForeground: '--popover-foreground',
  primary: '--primary',
  primaryForeground: '--primary-foreground',
  secondary: '--secondary',
  secondaryForeground: '--secondary-foreground',
  muted: '--muted',
  mutedForeground: '--muted-foreground',
  accent: '--accent',
  accentForeground: '--accent-foreground',
  destructive: '--destructive',
  border: '--border',
  input: '--input',
  ring: '--ring',
  tierra: '--tierra',
  tierraForeground: '--tierra-foreground',
  arena: '--arena',
  arenaForeground: '--arena-foreground',
} as const;

export type PaletteToken = keyof typeof PALETTE_TOKENS;
export type ThemePalette = Partial<Record<PaletteToken, string>>;

export type IntroStyle = {
  enabled: boolean;
  accent: string;
  restScale: number;
  failsafeMs: number;
};

export type ThemeSettings = {
  light: ThemePalette;
  dark: ThemePalette;
  /** Option keys chosen in Strapi; `core/theme/cms-theme.ts` maps them to CSS. */
  radius?: string;
  fontSans?: string;
  fontHeading?: string;
  headerSize?: string;
  intro: Partial<IntroStyle>;
};

export type BookingSettings = {
  depositRate: number;
  adultsMin: number;
  adultsDefault: number;
  childrenMin: number;
  childrenDefault: number;
  peopleMax: number;
  /** How many months of availability the online booking calendar loads. */
  availabilityMonths: number;
  currencyCode: string;
  /** Global assurances shown on every tour page, as i18n keys. */
  assurances: readonly TourFeature[];
};

export type FormSettings = {
  nameMin: number;
  nameMax: number;
  emailMax: number;
  messageMax: number;
};

export type CmsNavLink = {
  labelKey: string;
  path: string;
  fragment?: string;
  /** `tours-menu` marks the header item whose dropdown is built from destinations and tours. */
  kind: 'link' | 'tours-menu';
};

export type CmsNavigation = {
  headerLinks: readonly CmsNavLink[];
  footerBrandLinks: readonly CmsNavLink[];
  footerLegalLinks: readonly CmsNavLink[];
  planTrip: { labelKey: string; path: string };
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
  theme: ThemeSettings | null;
  booking: BookingSettings | null;
  forms: FormSettings | null;
  navigation: CmsNavigation | null;
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
