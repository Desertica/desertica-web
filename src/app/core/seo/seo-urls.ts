import { DEFAULT_LOCALE, LOCALES, LOCALE_QUERY, type AppLocale } from '../i18n/catalogs';

/**
 * The language is chosen by cookie, so each language needs its own crawlable URL: English is the
 * clean path and every other language adds `?lang=xx`, which the server honours before the cookie.
 * See docs/SEO-LOCALE.md for why this is not a `/en` / `/es` prefix yet.
 */
export function localizedUrl(origin: string, path: string, locale: AppLocale): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  const suffix = locale === DEFAULT_LOCALE ? '' : `?${LOCALE_QUERY}=${locale}`;
  return `${origin}${clean}${suffix}`;
}

export type Alternate = { hreflang: string; href: string };

/** One alternate per locale plus `x-default`, which points at the default language. */
export function alternatesFor(origin: string, path: string): readonly Alternate[] {
  return [
    ...LOCALES.map((locale) => ({ hreflang: locale, href: localizedUrl(origin, path, locale) })),
    { hreflang: 'x-default', href: localizedUrl(origin, path, DEFAULT_LOCALE) },
  ];
}

/** Path of a router URL without query string or fragment. */
export function pathOf(url: string): string {
  const end = url.search(/[?#]/);
  const path = end === -1 ? url : url.slice(0, end);
  return path || '/';
}

export function absoluteUrl(origin: string, source: string): string {
  if (/^https?:\/\//i.test(source)) {
    return source;
  }

  return `${origin}${source.startsWith('/') ? '' : '/'}${source}`;
}

const OPEN_GRAPH_LOCALE: Record<AppLocale, string> = { en: 'en_US', es: 'es_PE' };

export function openGraphLocale(locale: AppLocale): string {
  return OPEN_GRAPH_LOCALE[locale];
}

/** Contact values still holding the CMS placeholder (`XXXX`) must not reach structured data. */
export function isPlaceholder(value: string | undefined | null): boolean {
  return !value || /x{3,}/i.test(value);
}
