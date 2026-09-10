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

app.use(cookieParser());
app.use((req, res, next) => {
  i18n.init(req, res, () => {
    const queryValue = req.query[LOCALE_QUERY];
    const locale = resolveLocale({
      cookie: typeof req.cookies[LOCALE_COOKIE] === 'string' ? req.cookies[LOCALE_COOKIE] : undefined,
      query: typeof queryValue === 'string' ? queryValue : undefined,
      acceptLanguage: req.headers['accept-language'],
    });

    (req as express.Request & { setLocale?: (locale: string) => void }).setLocale?.(locale);

    if (!req.cookies[LOCALE_COOKIE]) {
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
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

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
