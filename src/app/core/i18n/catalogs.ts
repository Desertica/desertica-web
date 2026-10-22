import en from '../../../locales/en.json';
import es from '../../../locales/es.json';

export const catalogs = {
  en,
  es,
} as const;

export type AppLocale = keyof typeof catalogs;

export const LOCALES = ['en', 'es'] as const;
export const DEFAULT_LOCALE: AppLocale = 'en';
export const LOCALE_COOKIE = 'locale';
export const LOCALE_STORAGE_KEY = 'locale';
export const LOCALE_QUERY = 'lang';

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return value === 'en' || value === 'es';
}

export function parseCookie(header: string | null | undefined, name: string): string | undefined {
  if (!header) {
    return undefined;
  }

  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) {
      continue;
    }

    const key = part.slice(0, separator).trim();
    if (key === name) {
      return decodeURIComponent(part.slice(separator + 1).trim());
    }
  }

  return undefined;
}

/** Language prefix of a URL path: `/es/tours` is `es`. */
export function localeFromPath(path: string): AppLocale | null {
  const match = /^\/(en|es)(?=[/?#]|$)/.exec(path);
  return match ? (match[1] as AppLocale) : null;
}

/** `/es/tours` is `/tours` and `/es` is `/`; a path without a prefix is returned as it is. */
export function stripLocale(path: string): string {
  const rest = path.replace(/^\/(en|es)(?=[/?#]|$)/, '');
  return rest.startsWith('/') ? rest : `/${rest}`;
}

/** The same page in another language: `withLocale('/tours', 'es')` is `/es/tours`; the home page keeps its slash (`/es/`), which is how the router writes it. */
export function withLocale(path: string, locale: AppLocale): string {
  return `/${locale}${stripLocale(path)}`;
}

/** First supported language of an `Accept-Language` header (`es-PE,es;q=0.9,en;q=0.8` is `es`). */
export function localeFromAcceptLanguage(header: string | null | undefined): AppLocale | null {
  for (const part of (header ?? '').split(',')) {
    const code = part.split(';')[0]?.trim().slice(0, 2).toLowerCase();
    if (isAppLocale(code)) {
      return code;
    }
  }

  return null;
}

export function resolveLocale(options: {
  path?: string | null;
  cookie?: string | null;
  query?: string | null;
  acceptLanguage?: string | null;
}): AppLocale {
  // The language in the URL is what a crawler or a shared link carries (it is what `hreflang` points
  // at), so it wins over whatever the visitor chose earlier. Then the legacy `?lang=`, the cookie
  // and finally the browser's own preference.
  const fromPath = options.path ? localeFromPath(options.path) : null;
  if (fromPath) {
    return fromPath;
  }

  if (isAppLocale(options.query)) {
    return options.query;
  }

  if (isAppLocale(options.cookie)) {
    return options.cookie;
  }

  return localeFromAcceptLanguage(options.acceptLanguage) ?? DEFAULT_LOCALE;
}

export type Messages = Readonly<Record<string, string>>;
export type MessageOverlay = Readonly<Partial<Record<AppLocale, Messages>>>;

export const EMPTY_OVERLAY: MessageOverlay = {};

/**
 * Resolves a message key. CMS messages (`overlay`) win over the bundled JSON catalogs, and the
 * default locale is the fallback for both.
 */
export function translate(key: string, locale: AppLocale, overlay: MessageOverlay = EMPTY_OVERLAY): string {
  const own = overlay[locale]?.[key] || lookup(catalogs[locale], key);
  if (typeof own === 'string' && own) {
    return own;
  }

  if (locale !== DEFAULT_LOCALE) {
    const fallback = overlay[DEFAULT_LOCALE]?.[key] || lookup(catalogs[DEFAULT_LOCALE], key);
    if (typeof fallback === 'string' && fallback) {
      return fallback;
    }
  }

  return key;
}

function lookup(source: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((current, part) => {
    if (typeof current !== 'object' || current === null || !(part in current)) {
      return undefined;
    }

    return (current as Record<string, unknown>)[part];
  }, source);
}
