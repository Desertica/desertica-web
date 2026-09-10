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

export function localeFromAcceptLanguage(header: string | null | undefined): AppLocale | undefined {
  if (!header) {
    return undefined;
  }

  for (const part of header.split(',')) {
    const tag = part.split(';')[0]?.trim().toLowerCase();
    if (tag === 'es' || tag.startsWith('es-')) {
      return 'es';
    }

    if (tag === 'en' || tag.startsWith('en-')) {
      return 'en';
    }
  }

  return undefined;
}

export function resolveLocale(options: {
  cookie?: string | null;
  query?: string | null;
  acceptLanguage?: string | null;
}): AppLocale {
  if (isAppLocale(options.cookie)) {
    return options.cookie;
  }

  if (isAppLocale(options.query)) {
    return options.query;
  }

  return localeFromAcceptLanguage(options.acceptLanguage) ?? DEFAULT_LOCALE;
}

export function translate(key: string, locale: AppLocale): string {
  const value = lookup(catalogs[locale], key);
  if (typeof value === 'string') {
    return value;
  }

  if (locale !== DEFAULT_LOCALE) {
    const fallback = lookup(catalogs[DEFAULT_LOCALE], key);
    if (typeof fallback === 'string') {
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
