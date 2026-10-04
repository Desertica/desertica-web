import type {
  TourFeature,
  TourFormat,
  TourLanguage,
  TourPage,
  TourStop,
} from '../catalog/tour-pages';
import type { CatalogDestination, CatalogTour } from '../catalog/tours';
import { LOCALES, type AppLocale } from '../i18n/catalogs';
import type {
  BlogPost,
  CmsPage,
  CmsSnapshot,
  LocalizedFields,
  MediaSlot,
  Product,
  SiteSettings,
} from './cms-models';

export type RawEntry = Record<string, unknown>;
export type RawByLocale = Readonly<Record<AppLocale, readonly RawEntry[]>>;

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
      assign(target, tourKey(slug, 'lead2'), text(entry['lead2']));
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
    tourPages[slug] = {
      gallery: gallery.length ? gallery : [image, image, image],
      portraits: mediaList(base['portraits'], options.mediaBase, stringList(base['portraitUrls'])),
      leadKey: tourKey(slug, 'lead'),
      lead2Key:
        byLocale.en?.['lead2'] || byLocale.es?.['lead2'] ? tourKey(slug, 'lead2') : undefined,
      meetingKey: tourKey(slug, 'meeting'),
      languages: languages(base['languages']),
      format: format(base['format']),
      highlights: features(slug, 'highlights', byLocale, messages),
      practices: features(slug, 'practices', byLocale, messages),
      itinerary: stops(slug, byLocale, messages),
      includedKeys: items(slug, 'included', byLocale, messages),
      excludedKeys: items(slug, 'excluded', byLocale, messages),
      packKeys: items(slug, 'pack', byLocale, messages),
      notesKeys: items(slug, 'notes', byLocale, messages),
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
    site: raw.site ? mapSite(raw.site) : null,
    messages,
    media: mediaSlots,
    pages,
    posts,
    products,
  };
}

export function mapSite(entry: RawEntry): SiteSettings {
  const field = (name: keyof SiteSettings): string => text(entry[name]) ?? '';
  return {
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
  slug: string,
  field: 'highlights' | 'practices',
  byLocale: Grouped,
  messages: Record<AppLocale, Record<string, string>>,
): TourFeature[] {
  const base = asList(byLocale.en?.[field]) ?? asList(byLocale.es?.[field]) ?? [];
  return base.map((item, index) => {
    const prefix = `cms.tours.${slug}.${field}.${index}`;
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
): TourStop[] {
  const base = asList(byLocale.en?.['itinerary']) ?? asList(byLocale.es?.['itinerary']) ?? [];
  return base.map((item, index) => {
    const prefix = `cms.tours.${slug}.itinerary.${index}`;
    for (const locale of LOCALES) {
      const entry = asList(byLocale[locale]?.['itinerary'])?.[index];
      assign(messages[locale], `${prefix}.title`, text(entry?.['title']));
      assign(messages[locale], `${prefix}.body`, text(entry?.['body']));
    }

    return {
      time: text(item['time']) ?? '',
      titleKey: `${prefix}.title`,
      bodyKey: `${prefix}.body`,
    };
  });
}

function items(
  slug: string,
  field: 'included' | 'excluded' | 'pack' | 'notes',
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
