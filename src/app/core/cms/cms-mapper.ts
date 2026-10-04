import type {
  TourFeature,
  TourFormat,
  TourLanguage,
  TourPage,
  TourStop,
  TourVideo,
} from '../catalog/tour-pages';
import type { CatalogDestination, CatalogTour } from '../catalog/tours';
import { LOCALES, type AppLocale } from '../i18n/catalogs';
import {
  PALETTE_TOKENS,
  type BlogPost,
  type BookingSettings,
  type CmsNavLink,
  type CmsNavigation,
  type CmsPage,
  type CmsSnapshot,
  type FormSettings,
  type LocalizedFields,
  type MediaSlot,
  type PaletteToken,
  type Product,
  type SiteSettings,
  type ThemePalette,
  type ThemeSettings,
} from './cms-models';

export type RawEntry = Record<string, unknown>;
export type RawByLocale = Readonly<Record<AppLocale, readonly RawEntry[]>>;
export type RawSingleByLocale = Readonly<Record<AppLocale, RawEntry | null>>;

/** Raw Strapi payloads. A missing collection (`undefined`) means "keep the static default". */
export type CmsRaw = {
  destinations?: RawByLocale;
  tours?: RawByLocale;
  translations?: RawByLocale;
  mediaSlots?: RawByLocale;
  pages?: RawByLocale;
  posts?: RawByLocale;
  products?: RawByLocale;
  site?: RawEntry | null;
  theme?: RawEntry | null;
  forms?: RawEntry | null;
  booking?: RawSingleByLocale;
  navigation?: RawSingleByLocale;
};

export type MapOptions = {
  /** Prefix for relative media URLs (`/uploads/...`). */
  mediaBase: string | null;
  /** Used when a CMS destination or tour has no image. */
  fallbackImage: (kind: 'destination' | 'tour', slug: string) => string;
};

const DEFAULT_LOCALE_ORDER: readonly AppLocale[] = ['en', 'es'];
const FORMATS: readonly TourFormat[] = ['shared', 'private', 'both'];

export const tourKey = (slug: string, field: string): string => `cms.tours.${slug}.${field}`;
export const destinationKey = (slug: string, field: string): string =>
  `cms.destinations.${slug}.${field}`;
export const mediaAltKey = (slot: string): string => `cms.media.${slot}.alt`;

export function mapCms(raw: CmsRaw, options: MapOptions): CmsSnapshot {
  const messages: Record<AppLocale, Record<string, string>> = { en: {}, es: {} };
  const media = (value: unknown) => mediaUrl(value, options.mediaBase);

  for (const locale of LOCALES) {
    for (const entry of raw.translations?.[locale] ?? []) {
      const key = text(entry['key']);
      const value = text(entry['value']);
      if (key && value) {
        messages[locale][key] = value;
      }
    }
  }

  const tourEntries = groupBySlug(raw.tours);
  const tourPages: Record<string, TourPage> = {};
  const toursByDestination = new Map<string, CatalogTour[]>();

  for (const [slug, byLocale] of tourEntries) {
    const base = byLocale.en ?? byLocale.es;
    if (!base) {
      continue;
    }

    const image =
      media(base['image']) ?? text(base['imageUrl']) ?? options.fallbackImage('tour', slug);
    const destinationSlug = text(asRecord(base['destination'])?.['slug']);
    if (!destinationSlug) {
      continue;
    }

    for (const locale of LOCALES) {
      const entry = byLocale[locale];
      if (!entry) {
        continue;
      }

      const target = messages[locale];
      assign(target, tourKey(slug, 'title'), text(entry['title']));
      assign(target, tourKey(slug, 'description'), text(entry['description']));
      assign(target, tourKey(slug, 'lead'), text(entry['lead']) ?? text(entry['description']));
      assign(target, tourKey(slug, 'termsSummary'), text(entry['termsSummary']));
      assign(target, tourKey(slug, 'seoTitle'), text(entry['seoTitle']));
      assign(target, tourKey(slug, 'seoDescription'), text(entry['seoDescription']));
      assign(target, tourKey(slug, 'meeting'), text(entry['meeting']));
    }

    const tour: CatalogTour = {
      id: slug,
      destination: destinationSlug,
      titleKey: tourKey(slug, 'title'),
      descriptionKey: tourKey(slug, 'description'),
      durationHours: num(base['durationHours']) ?? 0,
      priceFrom: num(base['priceFrom']) ?? 0,
      image,
      featured: base['featured'] === true,
    };
    toursByDestination.set(destinationSlug, [
      ...(toursByDestination.get(destinationSlug) ?? []),
      { ...tour, ...{ order: num(base['order']) ?? 0 } } as CatalogTour,
    ]);

    const gallery = mediaList(base['gallery'], options.mediaBase, stringList(base['galleryUrls']));
    const tourAssurances = features(`cms.tours.${slug}`, 'assurances', byLocale, messages);
    tourPages[slug] = {
      gallery: gallery.length ? gallery : [image, image, image],
      leadKey: tourKey(slug, 'lead'),
      descriptionKeys: items(slug, 'paragraphs', byLocale, messages),
      expandedDescriptionKeys: items(slug, 'expandedParagraphs', byLocale, messages),
      meetingKey: tourKey(slug, 'meeting'),
      languages: languages(base['languages']),
      format: format(base['format']),
      practices: features(`cms.tours.${slug}`, 'practices', byLocale, messages),
      itinerary: stops(slug, byLocale, messages, options.mediaBase, image),
      videos: videos(base['videos'], options.mediaBase),
      includedKeys: items(slug, 'included', byLocale, messages),
      excludedKeys: items(slug, 'excluded', byLocale, messages),
      packKeys: items(slug, 'pack', byLocale, messages),
      notesKeys: items(slug, 'notes', byLocale, messages),
      termsSummaryKey:
        byLocale.en?.['termsSummary'] || byLocale.es?.['termsSummary']
          ? tourKey(slug, 'termsSummary')
          : undefined,
      itineraryFile: media(base['itineraryFile']) ?? text(base['itineraryFileUrl']),
      assurances: tourAssurances.length ? tourAssurances : undefined,
      seoTitleKey: hasText(byLocale, 'seoTitle') ? tourKey(slug, 'seoTitle') : undefined,
      seoDescriptionKey: hasText(byLocale, 'seoDescription')
        ? tourKey(slug, 'seoDescription')
        : undefined,
    };
  }

  const destinations: CatalogDestination[] = [];
  for (const [slug, byLocale] of groupBySlug(raw.destinations)) {
    const base = byLocale.en ?? byLocale.es;
    if (!base) {
      continue;
    }

    for (const locale of LOCALES) {
      const entry = byLocale[locale];
      if (entry) {
        assign(messages[locale], destinationKey(slug, 'title'), text(entry['title']));
        assign(messages[locale], destinationKey(slug, 'lead'), text(entry['lead']));
        assign(messages[locale], destinationKey(slug, 'allLabel'), text(entry['allLabel']));
      }
    }

    const tours = (toursByDestination.get(slug) ?? [])
      .sort((a, b) => orderOf(a) - orderOf(b))
      .map(stripOrder);
    destinations.push({
      id: slug,
      titleKey: destinationKey(slug, 'title'),
      allLabelKey: destinationKey(slug, 'allLabel'),
      hubPath: `/${slug}`,
      leadKey: destinationKey(slug, 'lead'),
      image:
        media(base['image']) ??
        text(base['imageUrl']) ??
        options.fallbackImage('destination', slug),
      tours,
      footerOrder: num(base['footerOrder']),
      showInFooter: base['showInFooter'] !== false,
      ...{ order: num(base['order']) ?? 0 },
    } as CatalogDestination);
  }
  destinations.sort((a, b) => orderOf(a) - orderOf(b));

  const mediaSlots: Record<string, MediaSlot> = {};
  for (const [slot, byLocale] of groupBy(raw.mediaSlots, 'key')) {
    const base = byLocale.en ?? byLocale.es;
    if (!base) {
      continue;
    }

    mediaSlots[slot] = compact({
      image: media(base['image']) ?? text(base['imageUrl']),
      video: media(base['video']) ?? text(base['videoUrl']),
      videoWebm: text(base['videoWebmUrl']),
      poster: media(base['poster']) ?? text(base['posterUrl']),
    });
    for (const locale of LOCALES) {
      assign(messages[locale], mediaAltKey(slot), text(byLocale[locale]?.['alt']));
    }
  }

  const pages: Record<string, CmsPage> = {};
  for (const [slug, byLocale] of groupBySlug(raw.pages)) {
    const base = byLocale.en ?? byLocale.es;
    pages[slug] = {
      slug,
      heroImage: media(base?.['heroImage']) ?? text(base?.['heroImageUrl']),
      i18n: localized(byLocale, (entry) => ({
        title: text(entry['title']) ?? '',
        lead: text(entry['lead']) ?? '',
        body: text(entry['body']) ?? '',
        seoTitle: text(entry['seoTitle']) ?? '',
        seoDescription: text(entry['seoDescription']) ?? '',
      })),
    };
  }

  const posts: BlogPost[] = [...groupBySlug(raw.posts)].map(([slug, byLocale]) => {
    const base = byLocale.en ?? byLocale.es ?? {};
    return {
      slug,
      publishedDate: text(base['publishedDate']) ?? '',
      cover: media(base['cover']) ?? text(base['coverUrl']),
      featured: base['featured'] === true,
      i18n: localized(byLocale, (entry) => ({
        title: text(entry['title']) ?? '',
        category: text(entry['category']) ?? '',
        excerpt: text(entry['excerpt']) ?? '',
        content: text(entry['content']) ?? '',
        seoDescription: text(entry['seoDescription']) ?? '',
      })),
    };
  });
  posts.sort((a, b) => b.publishedDate.localeCompare(a.publishedDate));

  const products: Product[] = [...groupBySlug(raw.products)]
    .map(([slug, byLocale]) => {
      const base = byLocale.en ?? byLocale.es ?? {};
      return {
        slug,
        order: num(base['order']) ?? 0,
        price: num(base['price']) ?? undefined,
        featured: base['featured'] === true,
        image: media(base['image']) ?? text(base['imageUrl']),
        gallery: mediaList(base['gallery'], options.mediaBase, []),
        i18n: localized(byLocale, (entry) => ({
          title: text(entry['title']) ?? '',
          description: text(entry['description']) ?? '',
          details: text(entry['details']) ?? '',
        })),
      };
    })
    .sort((a, b) => a.order - b.order);

  return {
    destinations,
    tourPages,
    site: raw.site ? mapSite(raw.site, options.mediaBase) : null,
    theme: raw.theme ? mapTheme(raw.theme) : null,
    booking: mapBooking(raw.booking, messages),
    forms: raw.forms ? mapForms(raw.forms) : null,
    navigation: mapNavigation(raw.navigation, messages),
    messages,
    media: mediaSlots,
    pages,
    posts,
    products,
  };
}

export function mapSite(entry: RawEntry, mediaBase: string | null = null): SiteSettings {
  const field = (name: keyof SiteSettings): string => text(entry[name]) ?? '';
  return {
    brandName: field('brandName'),
    legalYear: num(entry['legalYear']) ?? 0,
    shareImage: mediaUrl(entry['shareImage'], mediaBase) ?? text(entry['shareImageUrl']) ?? '',
    email: field('email'),
    phone: field('phone'),
    whatsapp: field('whatsapp').replace(/\D/g, ''),
    instagram: field('instagram'),
    facebook: field('facebook'),
    tiktok: field('tiktok'),
    youtube: field('youtube'),
    linkedin: field('linkedin'),
    google: field('google'),
    tripadvisor: field('tripadvisor'),
    legalName: field('legalName'),
    ruc: field('ruc'),
  };
}

function palette(value: unknown): ThemePalette {
  const entry = asRecord(value) ?? {};
  const result: ThemePalette = {};
  for (const token of Object.keys(PALETTE_TOKENS) as PaletteToken[]) {
    const color = text(entry[token]);
    if (color) {
      result[token] = color;
    }
  }

  return result;
}

export function mapTheme(entry: RawEntry): ThemeSettings {
  return {
    light: palette(entry['light']),
    dark: palette(entry['dark']),
    radius: text(entry['radius']),
    fontSans: text(entry['fontSans']),
    fontHeading: text(entry['fontHeading']),
    headerSize: text(entry['headerSize']),
    intro: compact({
      enabled: typeof entry['introEnabled'] === 'boolean' ? entry['introEnabled'] : undefined,
      accent: text(entry['introAccent']),
      restScale: num(entry['introRestScale']),
      failsafeMs: num(entry['introFailsafeMs']),
    }),
  };
}

export function mapForms(entry: RawEntry): FormSettings {
  return {
    nameMin: num(entry['nameMin']) ?? 0,
    nameMax: num(entry['nameMax']) ?? 0,
    emailMax: num(entry['emailMax']) ?? 0,
    messageMax: num(entry['messageMax']) ?? 0,
  };
}

function mapBooking(
  raw: RawSingleByLocale | undefined,
  messages: Record<AppLocale, Record<string, string>>,
): BookingSettings | null {
  const base = raw?.en ?? raw?.es;
  if (!raw || !base) {
    return null;
  }

  const byLocale: Grouped = {};
  for (const locale of LOCALES) {
    const entry = raw[locale];
    if (entry) {
      byLocale[locale] = entry;
    }
  }

  return {
    depositRate: num(base['depositRate']) ?? 0,
    adultsMin: num(base['adultsMin']) ?? 0,
    adultsDefault: num(base['adultsDefault']) ?? 0,
    childrenMin: num(base['childrenMin']) ?? 0,
    childrenDefault: num(base['childrenDefault']) ?? 0,
    peopleMax: num(base['peopleMax']) ?? 0,
    currencyCode: text(base['currencyCode']) ?? '',
    assurances: features('cms.booking', 'assurances', byLocale, messages),
  };
}

const NAV_LISTS = {
  headerLinks: 'header',
  footerBrandLinks: 'footerBrand',
  footerLegalLinks: 'footerLegal',
} as const;

function mapNavigation(
  raw: RawSingleByLocale | undefined,
  messages: Record<AppLocale, Record<string, string>>,
): CmsNavigation | null {
  const base = raw?.en ?? raw?.es;
  if (!raw || !base) {
    return null;
  }

  const links = (field: keyof typeof NAV_LISTS): CmsNavLink[] => {
    const list = asList(base[field]) ?? [];
    return list.map((item, index) => {
      const key = `cms.nav.${NAV_LISTS[field]}.${index}.label`;
      for (const locale of LOCALES) {
        assign(messages[locale], key, text(asList(raw[locale]?.[field])?.[index]?.['label']));
      }

      return {
        labelKey: key,
        path: text(item['path']) ?? '/',
        fragment: text(item['fragment']),
        kind: item['kind'] === 'tours-menu' ? 'tours-menu' : 'link',
      };
    });
  };

  for (const locale of LOCALES) {
    assign(messages[locale], 'cms.nav.planTrip.label', text(raw[locale]?.['planTripLabel']));
  }

  return {
    headerLinks: links('headerLinks'),
    footerBrandLinks: links('footerBrandLinks'),
    footerLegalLinks: links('footerLegalLinks'),
    planTrip: {
      labelKey: 'cms.nav.planTrip.label',
      path: text(base['planTripPath']) ?? '/tours',
    },
  };
}

function hasText(byLocale: Grouped, field: string): boolean {
  return LOCALES.some((locale) => !!text(byLocale[locale]?.[field]));
}

type Grouped = Partial<Record<AppLocale, RawEntry>>;

function groupBySlug(source: RawByLocale | undefined): Map<string, Grouped> {
  return groupBy(source, 'slug');
}

function groupBy(source: RawByLocale | undefined, field: string): Map<string, Grouped> {
  const grouped = new Map<string, Grouped>();
  if (!source) {
    return grouped;
  }

  for (const locale of DEFAULT_LOCALE_ORDER) {
    for (const entry of source[locale] ?? []) {
      const key = text(entry[field]);
      if (key) {
        grouped.set(key, { ...grouped.get(key), [locale]: entry });
      }
    }
  }

  return grouped;
}

function localized<T>(byLocale: Grouped, map: (entry: RawEntry) => T): LocalizedFields<T> {
  const result: LocalizedFields<T> = {};
  for (const locale of LOCALES) {
    const entry = byLocale[locale];
    if (entry) {
      result[locale] = map(entry);
    }
  }

  return result;
}

function features(
  prefixBase: string,
  field: 'practices' | 'assurances',
  byLocale: Grouped,
  messages: Record<AppLocale, Record<string, string>>,
): TourFeature[] {
  const base = asList(byLocale.en?.[field]) ?? asList(byLocale.es?.[field]) ?? [];
  return base.map((item, index) => {
    const prefix = `${prefixBase}.${field}.${index}`;
    for (const locale of LOCALES) {
      const entry = asList(byLocale[locale]?.[field])?.[index];
      assign(messages[locale], `${prefix}.title`, text(entry?.['title']));
      assign(messages[locale], `${prefix}.body`, text(entry?.['body']));
    }

    return {
      icon: text(item['icon']) ?? '',
      titleKey: `${prefix}.title`,
      bodyKey: `${prefix}.body`,
    };
  });
}

function stops(
  slug: string,
  byLocale: Grouped,
  messages: Record<AppLocale, Record<string, string>>,
  mediaBase: string | null,
  fallbackImage: string,
): TourStop[] {
  const base = asList(byLocale.en?.['itinerary']) ?? asList(byLocale.es?.['itinerary']) ?? [];
  return base.map((item, index) => {
    const prefix = `cms.tours.${slug}.itinerary.${index}`;
    let expanded = false;
    for (const locale of LOCALES) {
      const entry = asList(byLocale[locale]?.['itinerary'])?.[index];
      assign(messages[locale], `${prefix}.title`, text(entry?.['title']));
      assign(messages[locale], `${prefix}.body`, text(entry?.['body']));
      const expandedBody = text(entry?.['expandedBody']);
      assign(messages[locale], `${prefix}.expanded`, expandedBody);
      expanded ||= !!expandedBody;
    }

    return {
      image: mediaUrl(item['image'], mediaBase) ?? text(item['imageUrl']) ?? fallbackImage,
      titleKey: `${prefix}.title`,
      bodyKey: `${prefix}.body`,
      expandedBodyKey: expanded ? `${prefix}.expanded` : undefined,
    };
  });
}

function videos(value: unknown, mediaBase: string | null): TourVideo[] {
  return (asList(value) ?? []).flatMap((item): TourVideo[] => {
    const poster = mediaUrl(item['poster'], mediaBase) ?? text(item['posterUrl']);
    if (!poster) {
      return [];
    }

    return [
      compact({
        poster,
        webm: mediaUrl(item['webm'], mediaBase) ?? text(item['webmUrl']),
        mp4: mediaUrl(item['mp4'], mediaBase) ?? text(item['mp4Url']),
      }),
    ];
  });
}

function items(
  slug: string,
  field: 'paragraphs' | 'expandedParagraphs' | 'included' | 'excluded' | 'pack' | 'notes',
  byLocale: Grouped,
  messages: Record<AppLocale, Record<string, string>>,
): string[] {
  const base = asList(byLocale.en?.[field]) ?? asList(byLocale.es?.[field]) ?? [];
  return base.map((_, index) => {
    const key = `cms.tours.${slug}.${field}.${index}`;
    for (const locale of LOCALES) {
      const entry = asList(byLocale[locale]?.[field])?.[index];
      assign(messages[locale], key, text(entry?.['text']));
    }

    return key;
  });
}

function assign(target: Record<string, string>, key: string, value: string | undefined): void {
  if (value) {
    target[key] = value;
  }
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function num(value: unknown): number | undefined {
  const parsed = typeof value === 'string' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : undefined;
}

function asRecord(value: unknown): RawEntry | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as RawEntry)
    : undefined;
}

function asList(value: unknown): RawEntry[] | undefined {
  return Array.isArray(value)
    ? value.filter((item): item is RawEntry => !!asRecord(item))
    : undefined;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function languages(value: unknown): readonly TourLanguage[] {
  const list = stringList(value).filter(
    (item): item is TourLanguage => item === 'es' || item === 'en',
  );
  return list.length ? list : ['es', 'en'];
}

function format(value: unknown): TourFormat {
  return FORMATS.find((item) => item === value) ?? 'both';
}

function orderOf(value: unknown): number {
  return (value as { order?: number }).order ?? 0;
}

function stripOrder<T extends object>(value: T): T {
  const { order: _order, ...rest } = value as T & { order?: number };
  return rest as T;
}

function compact<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}

export function mediaUrl(value: unknown, base: string | null): string | undefined {
  const url = text(asRecord(value)?.['url']);
  if (!url) {
    return undefined;
  }

  return /^https?:\/\//i.test(url) || !base
    ? url
    : `${base}${url.startsWith('/') ? '' : '/'}${url}`;
}

function mediaList(value: unknown, base: string | null, urls: readonly string[]): string[] {
  const uploaded = (asList(value) ?? [])
    .map((item) => mediaUrl(item, base))
    .filter((item): item is string => !!item);
  return uploaded.length ? uploaded : [...urls];
}
