import type { AppLocale } from '../i18n/catalogs';

export const BUSINESS_TIME_ZONE = 'America/Lima';

const NUMBER_LOCALE: Record<AppLocale, string> = { en: 'en-US', es: 'es-PE' };

/** Formats an API amount in minor units (`7900`) as money (`US$79.00`). */
export function formatMoney(cents: number, currency: string, locale: AppLocale): string {
  return new Intl.NumberFormat(NUMBER_LOCALE[locale], {
    style: 'currency',
    currency,
    currencyDisplay: currency === 'USD' ? 'narrowSymbol' : 'symbol',
  }).format(cents / 100);
}

function lima(iso: string, options: Intl.DateTimeFormatOptions, locale: string): string {
  return new Intl.DateTimeFormat(locale, { timeZone: BUSINESS_TIME_ZONE, ...options }).format(
    new Date(iso),
  );
}

/** `YYYY-MM-DD` of an instant on the business calendar (America/Lima). */
export function limaDay(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(iso));
  const part = (type: string): string => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function limaTime(iso: string, locale: AppLocale): string {
  return lima(iso, { hour: '2-digit', minute: '2-digit', hour12: false }, NUMBER_LOCALE[locale]);
}

export function limaDateLong(iso: string, locale: AppLocale): string {
  return lima(iso, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }, NUMBER_LOCALE[locale]);
}

/** `YYYY-MM-DD` of a picker date, read in the visitor's local calendar. */
export function localDayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** `YYYY-MM` for the month `offset` months after `from`. */
export function monthKey(from: Date, offset = 0): string {
  const shifted = new Date(from.getFullYear(), from.getMonth() + offset, 1);
  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, '0')}`;
}

/** `mm:ss` for a countdown. */
export function clock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
