import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import cookieParser from 'cookie-parser';
import express from 'express';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { cmsConfigFromEnv } from './app/core/cms/cms-config';
import { apiUrlFromEnv, publicConfigFromEnv } from './app/core/config/public-config';
import { apiProxy } from './api-proxy';
import { imageProxy } from './image-proxy';
import { formsProxy } from './forms-proxy';
import { legacyRedirects, seoRouter } from './seo-routes';
import {
  catalogs,
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_COOKIE,
  LOCALE_QUERY,
  resolveLocale,
} from './app/core/i18n/catalogs';

const nodeRequire = createRequire(import.meta.url);
const { I18n } = nodeRequire('i18n') as {
  I18n: new (options: {
    locales: readonly string[];
    defaultLocale: string;
    cookie: string;
    queryParameter: string;
    objectNotation: boolean;
    updateFiles: boolean;
    staticCatalog: typeof catalogs;
  }) => { init: express.RequestHandler };
};

const browserDistFolder = join(import.meta.dirname, '../browser');
/** Angular's `outputHashing: all` names bundles `main-ABCD1234.js`. */
const HASHED_ASSET = /-[A-Z0-9]{8}\.[a-z0-9]+$/;

const app = express();
const angularApp = new AngularNodeAppEngine();
const i18n = new I18n({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  cookie: LOCALE_COOKIE,
  queryParameter: LOCALE_QUERY,
  objectNotation: true,
  updateFiles: false,
  staticCatalog: catalogs,
});

// A hop count ("1" behind one proxy, "2" behind Cloudflare and Traefik) trusts only that many X-Forwarded-For
// entries; plain "true" trusts the whole header and lets any client pick its own IP to dodge the rate limiter.
const trustProxy = process.env['TRUST_PROXY'] ?? '';
app.set('trust proxy', /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy === 'true');
const cms = cmsConfigFromEnv(process.env);
const publicConfig = publicConfigFromEnv(process.env);
const apiUrl = apiUrlFromEnv(process.env);

/** Legacy `/experiences/:slug` URLs live on as permanent redirects to the tour page. */
app.disable('x-powered-by');
// A full Content-Security-Policy needs GTM, Turnstile, Stripe, Culqi and the CMS media hosts allowed and checked in a browser;
// until then only framing is locked down, which is what protects /checkout and /pay from clickjacking.
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

app.use(cookieParser());
app.use((req, res, next) => {
  i18n.init(req, res, () => {
    const queryValue = req.query[LOCALE_QUERY];
    const locale = resolveLocale({
      cookie:
        typeof req.cookies[LOCALE_COOKIE] === 'string' ? req.cookies[LOCALE_COOKIE] : undefined,
      query: typeof queryValue === 'string' ? queryValue : undefined,
    });

    (req as express.Request & { setLocale?: (locale: string) => void }).setLocale?.(locale);

    if (req.cookies[LOCALE_COOKIE] !== locale) {
      res.cookie(LOCALE_COOKIE, locale, {
        maxAge: 365 * 24 * 60 * 60 * 1000,
        sameSite: 'lax',
        path: '/',
      });
    }

    next();
  });
});

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
  if (/^\/(pay|waiver|booking|checkout|payment)(\/|$)/.test(req.path)) {
    res.setHeader('Referrer-Policy', 'no-referrer');
  }

  res.vary('Cookie');
  if (process.env['ROBOTS_DISALLOW_ALL'] === 'true') {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  }

  next();
});

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
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
