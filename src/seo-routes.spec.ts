import express from 'express';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { legacyRedirects, robotsTxt, seoRouter, sitemapXml, sitePaths, staticCatalog } from './seo-routes';

const serve = async (app: express.Express): Promise<{ url: string; server: Server }> => {
  const server = await new Promise<Server>((resolve) => {
    const started = app.listen(0, '127.0.0.1', () => resolve(started));
  });
  return { url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, server };
};

describe('sitemap and robots', () => {
  it('lists every public route in both languages with alternates', () => {
    const xml = sitemapXml('https://desertica.pe', staticCatalog());

    expect(xml).toContain('<loc>https://desertica.pe/tours/dune-buggy</loc>');
    expect(xml).toContain('<loc>https://desertica.pe/tours/dune-buggy?lang=es</loc>');
    expect(xml).toContain(
      '<xhtml:link rel="alternate" hreflang="es" href="https://desertica.pe/tours/dune-buggy?lang=es"/>',
    );
    expect(xml).toContain(
      '<xhtml:link rel="alternate" hreflang="x-default" href="https://desertica.pe/tours/dune-buggy"/>',
    );
    expect(xml).toContain('<loc>https://desertica.pe/</loc>');
    expect(xml).toContain('<loc>https://desertica.pe/huacachina</loc>');
    expect(xml).not.toContain('/reservations');
    expect(xml).not.toContain('/experiences');
  });

  it('adds lastmod, escapes XML and includes posts and products', () => {
    const paths = sitePaths({
      tours: [{ slug: 'a-b', updatedAt: '2026-01-02T00:00:00.000Z' }],
      posts: [{ slug: 'first' }],
      products: [{ slug: 'pisco' }],
    });
    expect(paths.map((entry) => entry.path)).toEqual(
      expect.arrayContaining(['/tours/a-b', '/blog/first', '/products/pisco']),
    );
    const xml = sitemapXml('https://x.test', {
      tours: [{ slug: 'a-b', updatedAt: '2026-01-02T00:00:00.000Z' }],
      posts: [],
      products: [],
    });
    expect(xml).toContain('<lastmod>2026-01-02T00:00:00.000Z</lastmod>');
    expect(sitemapXml('https://x.test?a=1&b=2', staticCatalog())).toContain('&amp;');
  });

  it('keeps transactional pages out of robots.txt and points at the sitemap', () => {
    const robots = robotsTxt('https://desertica.pe');
    expect(robots).toContain('Disallow: /checkout');
    expect(robots).toContain('Disallow: /booking');
    expect(robots).toContain('Disallow: /api/');
    expect(robots).toContain('Sitemap: https://desertica.pe/sitemap.xml');
    expect(robotsTxt('https://staging.test', true)).toContain('Disallow: /\n');
  });
});

describe('seoRouter', () => {
  let server: Server | undefined;
  afterEach(() => {
    server?.close();
    vi.unstubAllGlobals();
  });

  it('serves the bundled catalog when there is no CMS, using the request host', async () => {
    const app = express();
    app.use(seoRouter({ strapiUrl: null }));
    const started = await serve(app);
    server = started.server;

    const robots = await fetch(`${started.url}/robots.txt`);
    expect(robots.headers.get('content-type')).toContain('text/plain');
    expect(robots.headers.get('cache-control')).toContain('max-age=3600');
    expect(await robots.text()).toContain(`Sitemap: ${started.url}/sitemap.xml`);

    const sitemap = await fetch(`${started.url}/sitemap.xml`);
    expect(sitemap.headers.get('content-type')).toContain('application/xml');
    expect(await sitemap.text()).toContain(`<loc>${started.url}/tours/dune-buggy</loc>`);
  });

  it('builds the tour list from Strapi and falls back when it is down', async () => {
    const real = globalThis.fetch;
    const strapi = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.startsWith('http://strapi.test/api/tours')) {
        return new Response(
          JSON.stringify({
            data: [{ slug: 'cms-tour', updatedAt: '2026-02-03T00:00:00.000Z' }, { slug: 'Bad Slug' }],
            meta: { pagination: { pageCount: 1 } },
          }),
        );
      }

      if (url.startsWith('http://strapi.test/')) {
        return new Response(JSON.stringify({ data: [], meta: { pagination: { pageCount: 1 } } }));
      }

      return real(input, init);
    });
    vi.stubGlobal('fetch', strapi);

    const app = express();
    app.use(seoRouter({ strapiUrl: 'http://strapi.test', siteUrl: 'https://desertica.pe' }));
    const started = await serve(app);
    server = started.server;

    const xml = await (await real(`${started.url}/sitemap.xml`)).text();
    expect(xml).toContain('<loc>https://desertica.pe/tours/cms-tour</loc>');
    expect(xml).toContain('<lastmod>2026-02-03T00:00:00.000Z</lastmod>');
    expect(xml).not.toContain('Bad%20Slug');
    expect(xml).not.toContain('Bad Slug');
    expect(xml).not.toContain('/tours/dune-buggy<');
  });

  it('answers staging with a blanket disallow and no sitemap', async () => {
    const app = express();
    app.use(seoRouter({ strapiUrl: null, disallowAll: true }));
    const started = await serve(app);
    server = started.server;

    expect(await (await fetch(`${started.url}/robots.txt`)).text()).toContain('Disallow: /\n');
    expect((await fetch(`${started.url}/sitemap.xml`)).status).toBe(404);
  });
});

describe('legacyRedirects', () => {
  it('redirects /experiences/:slug permanently to /tours/:slug and keeps the query', async () => {
    const app = express();
    app.use(legacyRedirects());
    const { url, server } = await serve(app);

    const tour = await fetch(`${url}/experiences/dune-buggy?lang=es`, { redirect: 'manual' });
    expect(tour.status).toBe(301);
    expect(tour.headers.get('location')).toBe('/tours/dune-buggy?lang=es');

    const list = await fetch(`${url}/experiences`, { redirect: 'manual' });
    expect(list.status).toBe(301);
    expect(list.headers.get('location')).toBe('/tours');
    server.close();
  });
});
