import express from 'express';
import { tourDestinations } from './app/core/catalog/tours';
import { DEFAULT_LOCALE, LOCALES, LOCALE_QUERY } from './app/core/i18n/catalogs';

/** Slugs the sitemap lists, with the CMS `updatedAt` when there is one. */
export type SeoEntry = { slug: string; updatedAt?: string };
export type SeoCatalog = {
  tours: readonly SeoEntry[];
  posts: readonly SeoEntry[];
  products: readonly SeoEntry[];
};

export type SeoOptions = {
  /** Strapi base URL; `null` serves the bundled catalog only. */
  strapiUrl: string | null;
  token?: string | null;
  /** Public origin (`SITE_URL`); the request host is used when it is not set. */
  siteUrl?: string | null;
  /** Staging: ask crawlers to stay out entirely. */
  disallowAll?: boolean;
  cacheTtlMs?: number;
  timeoutMs?: number;
};

/** Routes that exist in `app.routes.ts` and belong in search results. */
const STATIC_PATHS: readonly string[] = [
  '/',
  '/tours',
  '/products',
  '/about',
  '/contact',
  '/blog',
  '/terms',
  '/privacy',
  '/complaints',
  '/conduct',
  '/legal/mincetur',
];

/** Utility and transactional pages that must never be indexed. */
export const DISALLOWED_PATHS: readonly string[] = ['/api/', '/checkout', '/booking', '/pay/', '/waiver/', '/payment/'];

const PAGE_SIZE = 100;
const MAX_PAGES = 20;

export function staticCatalog(): SeoCatalog {
  return {
    tours: tourDestinations.flatMap((destination) =>
      destination.tours.map((tour) => ({ slug: tour.id })),
    ),
    posts: [],
    products: [],
  };
}

export function sitePaths(catalog: SeoCatalog): readonly { path: string; lastmod?: string }[] {
  return [
    ...STATIC_PATHS.map((path) => ({ path })),
    ...tourDestinations.map((destination) => ({ path: destination.hubPath })),
    ...catalog.tours.map((tour) => ({ path: `/tours/${tour.slug}`, lastmod: tour.updatedAt })),
    ...catalog.posts.map((post) => ({ path: `/blog/${post.slug}`, lastmod: post.updatedAt })),
    ...catalog.products.map((item) => ({
      path: `/products/${item.slug}`,
      lastmod: item.updatedAt,
    })),
  ];
}

function urlFor(origin: string, path: string, locale: string): string {
  return `${origin}${path}${locale === DEFAULT_LOCALE ? '' : `?${LOCALE_QUERY}=${locale}`}`;
}

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** One `<url>` per language, each listing every alternate (itself included), as Google expects. */
export function sitemapXml(origin: string, catalog: SeoCatalog): string {
  const entries = sitePaths(catalog).flatMap(({ path, lastmod }) =>
    LOCALES.map((locale) => {
      const alternates = [
        ...LOCALES.map(
          (alt) =>
            `    <xhtml:link rel="alternate" hreflang="${alt}" href="${escapeXml(urlFor(origin, path, alt))}"/>`,
        ),
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(urlFor(origin, path, DEFAULT_LOCALE))}"/>`,
      ].join('\n');
      return [
        '  <url>',
        `    <loc>${escapeXml(urlFor(origin, path, locale))}</loc>`,
        ...(lastmod ? [`    <lastmod>${escapeXml(lastmod)}</lastmod>`] : []),
        alternates,
        '  </url>',
      ].join('\n');
    }),
  );

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...entries,
    '</urlset>',
    '',
  ].join('\n');
}

export function robotsTxt(origin: string, disallowAll = false): string {
  const rules = disallowAll
    ? ['Disallow: /']
    : [...DISALLOWED_PATHS.map((path) => `Disallow: ${path}`), 'Allow: /'];
  return ['User-agent: *', ...rules, '', `Sitemap: ${origin}/sitemap.xml`, ''].join('\n');
}

/** `/experiences/:slug` was a stub; its URLs now redirect permanently to `/tours/:slug`. */
export function legacyRedirects(): express.Router {
  const router = express.Router();
  router.get(['/experiences', '/experiences/:slug'], (req, res) => {
    const slug = req.params['slug'];
    const queryAt = req.originalUrl.indexOf('?');
    const query = queryAt === -1 ? '' : req.originalUrl.slice(queryAt);
    res.redirect(301, `/tours${typeof slug === 'string' ? `/${encodeURIComponent(slug)}` : ''}${query}`);
  });
  return router;
}

type Cached = { at: number; catalog: SeoCatalog };

/**
 * Serves `/sitemap.xml` and `/robots.txt` from the live catalog. Slugs come from Strapi (cached),
 * falling back to the last good copy and then to the bundled catalog, so neither file ever fails.
 */
export function seoRouter(options: SeoOptions): express.Router {
  const router = express.Router();
  const ttl = options.cacheTtlMs ?? 10 * 60 * 1000;
  let cached: Cached | null = null;
  let inflight: Promise<SeoCatalog> | null = null;

  const catalog = async (): Promise<SeoCatalog> => {
    if (cached && Date.now() - cached.at < ttl) {
      return cached.catalog;
    }

    inflight ??= loadCatalog(options)
      .then((fresh) => {
        cached = { at: Date.now(), catalog: fresh };
        return fresh;
      })
      .catch(() => cached?.catalog ?? staticCatalog())
      .finally(() => {
        inflight = null;
      });
    return inflight;
  };

  const origin = (req: express.Request): string =>
    options.siteUrl ?? `${req.protocol}://${req.get('host') ?? 'localhost'}`;

  router.get('/robots.txt', (req, res) => {
    res
      .type('text/plain')
      .set('Cache-Control', 'public, max-age=3600')
      .send(robotsTxt(origin(req), options.disallowAll));
  });

  router.get('/sitemap.xml', async (req, res) => {
    if (options.disallowAll) {
      res.status(404).end();
      return;
    }

    res
      .type('application/xml')
      .set('Cache-Control', 'public, max-age=3600')
      .send(sitemapXml(origin(req), await catalog()));
  });

  return router;
}

async function loadCatalog(options: SeoOptions): Promise<SeoCatalog> {
  const base = options.strapiUrl;
  if (!base) {
    return staticCatalog();
  }

  const [tours, posts, products] = await Promise.all([
    fetchEntries(base, 'tours', options),
    fetchEntries(base, 'blog-posts', options),
    fetchEntries(base, 'products', options),
  ]);
  return {
    // The app falls back to the bundled tours only when the CMS has none, and so does the sitemap.
    tours: tours?.length ? tours : staticCatalog().tours,
    posts: posts ?? [],
    products: products ?? [],
  };
}

async function fetchEntries(
  base: string,
  path: string,
  options: SeoOptions,
): Promise<SeoEntry[] | null> {
  const entries: SeoEntry[] = [];
  try {
    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const query = new URLSearchParams({
        locale: DEFAULT_LOCALE,
        'fields[0]': 'slug',
        'fields[1]': 'updatedAt',
        'pagination[page]': String(page),
        'pagination[pageSize]': String(PAGE_SIZE),
      });
      const response = await fetch(`${base}/api/${path}?${query}`, {
        headers: options.token ? { Authorization: `Bearer ${options.token}` } : {},
        signal: AbortSignal.timeout(options.timeoutMs ?? 5000),
      });
      if (!response.ok) {
        return null;
      }

      const body = (await response.json()) as {
        data?: { slug?: unknown; updatedAt?: unknown }[];
        meta?: { pagination?: { pageCount?: number } };
      };
      for (const item of body.data ?? []) {
        if (typeof item.slug === 'string' && /^[a-z0-9-]+$/.test(item.slug)) {
          entries.push({
            slug: item.slug,
            ...(typeof item.updatedAt === 'string' ? { updatedAt: item.updatedAt } : {}),
          });
        }
      }

      if (page >= (body.meta?.pagination?.pageCount ?? 1)) {
        break;
      }
    }
  } catch {
    return null;
  }

  return entries;
}
