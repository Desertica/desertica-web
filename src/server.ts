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
import { publicConfigFromEnv } from './app/core/config/public-config';
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

app.set('trust proxy', process.env['TRUST_PROXY'] === 'true');
const cms = cmsConfigFromEnv(process.env);
const publicConfig = publicConfigFromEnv(process.env);

/** Legacy `/experiences/:slug` URLs live on as permanent redirects to the tour page. */
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
  }),
);

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
