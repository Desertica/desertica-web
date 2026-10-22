import { DEFAULT_LOCALE, LOCALES, withLocale, type AppLocale } from '../i18n/catalogs';

/**
 * Every language has its own path prefix (`/en/tours`, `/es/tours`), so crawlers, shared links and
 * `hreflang` all point at one URL per language. See docs/SEO-LOCALE.md.
 */
export function localizedUrl(origin: string, path: string, locale: AppLocale): string {
  return `${origin}${withLocale(path.startsWith('/') ? path : `/${path}`, locale)}`;
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
