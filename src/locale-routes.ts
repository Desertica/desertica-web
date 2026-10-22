import type { RequestHandler } from 'express';
import {
  LOCALE_COOKIE,
  LOCALE_QUERY,
  isAppLocale,
  localeFromPath,
  parseCookie,
  resolveLocale,
  withLocale,
} from './app/core/i18n/catalogs';

const ASSET = /\.[a-z0-9]{1,8}$/i;
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * The language is the first path segment (`/en/tours`, `/es/tours`). A page without one has no language
 * yet, so it redirects to the visitor's: legacy `?lang=` (permanent, it is a fixed URL), then the cookie,
 * then the browser's `Accept-Language` (temporary, it depends on who asks). Files and `/api` pass through.
 */
export function localeRoutes(): RequestHandler {
  return (req, res, next) => {
    if ((req.method !== 'GET' && req.method !== 'HEAD') || ASSET.test(req.path) || req.path.startsWith('/api/')) {
      next();
      return;
    }

    const cookie = parseCookie(req.headers.cookie, LOCALE_COOKIE);
    const search = new URLSearchParams(req.url.split('?')[1] ?? '');
    const legacy = search.get(LOCALE_QUERY);
    search.delete(LOCALE_QUERY);
    const query = search.size ? `?${search}` : '';
    const prefixed = localeFromPath(req.path);

    if (prefixed) {
      // The home page is `/es/` (the router writes it that way), and a leftover `?lang=` says nothing the path does not.
      if (req.path === `/${prefixed}` || legacy !== null) {
        res.redirect(301, `${req.path === `/${prefixed}` ? `/${prefixed}/` : req.path}${query}`);
        return;
      }

      if (cookie !== prefixed) {
        res.cookie(LOCALE_COOKIE, prefixed, { maxAge: YEAR_MS, sameSite: 'lax', path: '/' });
      }

      next();
      return;
    }

    const locale = resolveLocale({ query: legacy, cookie, acceptLanguage: req.headers['accept-language'] });
    res.vary('Cookie');
    res.vary('Accept-Language');
    res.redirect(isAppLocale(legacy) ? 301 : 302, `${withLocale(req.path, locale)}${query}`);
  };
}
