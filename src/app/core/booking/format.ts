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

type Tier = { hoursBefore?: number; refundPercent?: number };

/**
 * One plain sentence per cancellation tier. A tier applies from `hoursBefore` hours up (the API sorts
 * them from most hours to fewest), so the last window reads "less than N hours" and, when the
 * policy stops above zero hours, that window gets its own "no refund" line.
 */
export function cancellationTierLines(tiers: readonly Tier[] | undefined, t: (key: string) => string): string[] {
  const refund = (percent: number) =>
    percent >= 100 ? t('checkout.refundFull') : percent <= 0 ? t('checkout.refundNone') : t('checkout.refundPart').replace('{percent}', String(percent));
  const line = (key: string, hours: number, percent: number) =>
    t(key).replace('{hours}', String(hours)).replace('{refund}', refund(percent));
  const sorted = [...(tiers ?? [])].sort((a, b) => (b.hoursBefore ?? 0) - (a.hoursBefore ?? 0));
  const lines = sorted.map((tier, index) => {
    const hours = tier.hoursBefore ?? 0;
    const percent = tier.refundPercent ?? 0;
    if (hours > 0) {
      return line('checkout.tierFrom', hours, percent);
    }

    const previous = sorted[index - 1]?.hoursBefore;
    return previous ? line('checkout.tierUnder', previous, percent) : line('checkout.tierAny', 0, percent);
  });
  const last = sorted.at(-1)?.hoursBefore ?? 0;
  return last > 0 ? [...lines, line('checkout.tierUnder', last, 0)] : lines;
}
