import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import compression from 'compression';
import express from 'express';
import { join } from 'node:path';
import { cmsConfigFromEnv } from './app/core/cms/cms-config';
import { apiUrlFromEnv, assertProductionConfig, publicConfigFromEnv } from './app/core/config/public-config';
import { apiProxy } from './api-proxy';
import { healthz } from './healthz';
import { imageProxy } from './image-proxy';
import { formsProxy } from './forms-proxy';
import { localeRoutes } from './locale-routes';
import { createPageCache, pageCacheKey } from './page-cache';
import { legacyRedirects, seoRouter } from './seo-routes';
import { stripLocale } from './app/core/i18n/catalogs';
import { cspReportOnly } from './security-headers';

const browserDistFolder = join(import.meta.dirname, '../browser');
/** Angular's `outputHashing: all` names bundles `main-ABCD1234.js`. */
const HASHED_ASSET = /-[A-Z0-9]{8}\.[a-z0-9]+$/;

const app = express();
const angularApp = new AngularNodeAppEngine();

// A hop count ("1" behind one proxy, "2" behind Cloudflare and Traefik) trusts only that many X-Forwarded-For
// entries; plain "true" trusts the whole header and lets any client pick its own IP to dodge the rate limiter.
const trustProxy = process.env['TRUST_PROXY'] ?? '';
app.set('trust proxy', /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy === 'true');
const cms = cmsConfigFromEnv(process.env);
const publicConfig = publicConfigFromEnv(process.env);
const apiUrl = apiUrlFromEnv(process.env);
const assetOrigins = [
  ...(cms.publicUrl ? [new URL(cms.publicUrl).origin] : []),
  ...publicConfig.imageHosts.map((host) => `https://${host}`),
];
const isHtml = (type: string | null | undefined) => !!type?.includes('text/html');
const reportCsp = (res: express.Response, html: Buffer | string) =>
  res.setHeader('Content-Security-Policy-Report-Only', cspReportOnly(String(html), assetOrigins));

/** Legacy `/experiences/:slug` URLs live on as permanent redirects to the tour page. */
app.disable('x-powered-by');
app.use(healthz());
// HTML, JS, CSS and JSON go out compressed (images are already compressed and skipped); Traefik does not do it for us.
app.use(compression());
// Framing is blocked outright (clickjacking on /checkout and /pay). The full policy is report-only for now and is added
// to each rendered page below, because it carries the hashes of that page's inline scripts.
app.use((_req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'Strict-Transport-Security': 'max-age=31536000',
    'Content-Security-Policy': "frame-ancestors 'none'",
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  });
  next();
});

app.use(legacyRedirects());

/** `sitemap.xml` and `robots.txt` are built from the live catalog. */
app.use(
  seoRouter({
    strapiUrl: cms.url,
    token: cms.token,
    siteUrl: publicConfig.siteUrl,
    disallowAll: process.env['ROBOTS_DISALLOW_ALL'] === 'true',
  }),
);

/**
 * Contact and reservation forms are validated here and forwarded to Strapi, so the browser never
 * needs the CMS URL or CORS access.
 */
app.use(
  '/api/forms',
  formsProxy({
    strapiUrl: cms.url,
    token: process.env['STRAPI_FORMS_TOKEN'] ?? null,
    secret: process.env['FORMS_PROXY_SECRET'] ?? null,
    apiUrl,
    bookingEngine: publicConfig.bookingEngineEnabled,
    turnstileSecret: process.env['TURNSTILE_SECRET_KEY']?.trim() || null,
  }),
);

/** The booking engine's public calls reach desertica-api through here (off until the flag is on). */
app.use(
  '/api/public',
  apiProxy({ apiUrl, enabled: publicConfig.bookingEngineEnabled }),
);

/** Resizes CMS images to WebP at the width each screen needs; see image-proxy.ts. */
app.use('/_img', imageProxy({ hosts: publicConfig.imageHosts }));

/**
 * Serve static files from /browser. Files with a content hash never change; the rest (brand
 * images, fonts, favicon) are cached for a day so a replaced file reaches visitors.
 */
app.use(
  express.static(browserDistFolder, {
    index: false,
    redirect: false,
    setHeaders: (res, filePath) => {
      res.setHeader(
        'Cache-Control',
        HASHED_ASSET.test(filePath)
          ? 'public, max-age=31536000, immutable'
          : 'public, max-age=86400',
      );
    },
  }),
);

/**
 * Pages depend on the language cookie and on live CMS content, so a shared cache must not store
 * them: browsers revalidate on every request. `ROBOTS_DISALLOW_ALL` also keeps staging out of
 * search engines at the header level.
 */
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'private, no-cache');
  // E-mailed links carry a credential in the path (`/pay/:token`, `/waiver/:token`, `/booking/:ref`
  // after the token moves to the session) and those pages load the payment gateways' scripts: no
  // Referer may leave with it.
  if (/^\/(pay|waiver|booking|checkout|payment)(\/|$)/.test(stripLocale(req.path))) {
    res.setHeader('Referrer-Policy', 'no-referrer');
  }

  res.vary('Cookie');
  if (process.env['ROBOTS_DISALLOW_ALL'] === 'true') {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  }

  next();
});

/** Pages need a language prefix; see locale-routes.ts. */
app.use(localeRoutes());

/**
 * Handle all other requests by rendering the Angular application.
 * Public pages are kept for `PAGE_CACHE_TTL_MS` (10 s, 0 turns it off); a render takes ~80 ms, about 12 pages/s per process.
 */
const pageCache = createPageCache(Number(process.env['PAGE_CACHE_TTL_MS'] ?? 10_000));
app.use((req, res, next) => {
  const key = pageCacheKey(req);
  const hit = key ? pageCache.get(key) : undefined;
  if (hit) {
    if (isHtml(hit.type)) {
      reportCsp(res, hit.body);
    }

    res.type(hit.type).send(hit.body);
    return;
  }

  angularApp
    .handle(req)
    .then(async (response) => {
      if (!response) {
        next();
        return;
      }

      if (key && response.status === 200) {
        const page = { type: response.headers.get('content-type') ?? 'text/html', body: Buffer.from(await response.arrayBuffer()) };
        pageCache.set(key, page);
        if (isHtml(page.type)) {
          reportCsp(res, page.body);
        }

        res.type(page.type).send(page.body);
        return;
      }

      if (isHtml(response.headers.get('content-type'))) {
        reportCsp(res, await response.clone().text());
      }

      await writeResponseToNodeResponse(response, res);
    })
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  if (process.env['NODE_ENV'] === 'production') {
    assertProductionConfig(process.env);
    if (process.env['TRUST_PROXY'] === 'true') {
      console.warn('TRUST_PROXY=true trusts the whole X-Forwarded-For header; use the number of proxies (1 behind Traefik).');
    } else if (!/^[1-9]\d*$/.test(process.env['TRUST_PROXY'] ?? '')) {
      console.warn('TRUST_PROXY is not set: behind a proxy every visitor shares one IP, so the rate limits hit everyone. Use 1 behind Traefik.');
    }
  }

  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
