import { inject, Provider } from '@angular/core';
import {
  type BrnCalendarI18n,
  BrnCalendarI18nService,
  BrnCalendarI18nToken,
  type MonthLabels,
} from '@spartan-ng/brain/calendar';
import { AppLocale } from './catalogs';
import { I18nService } from './i18n';

const capitalize = (text: string) => text.charAt(0).toLocaleUpperCase() + text.slice(1);
// UTC on both sides so the server's time zone never shifts a day or month.
const format = (locale: AppLocale, date: number, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(date);
// 1 Jan 2023 was a Sunday, the index Spartan uses for 0.
const weekday = (index: number) => Date.UTC(2023, 0, 1 + index);

/** Spartan calendar texts for the active language; every function reads the locale signal, so it stays reactive. */
export function calendarI18n(
  locale: () => AppLocale,
  t: (key: string) => string,
): Partial<BrnCalendarI18n> {
  return {
    formatWeekdayName: (index) =>
      capitalize(format(locale(), weekday(index), { weekday: 'short' }).slice(0, 2)),
    labelWeekday: (index) => capitalize(format(locale(), weekday(index), { weekday: 'long' })),
    months: () =>
      Array.from({ length: 12 }, (_, m) =>
        capitalize(format(locale(), Date.UTC(2000, m, 1), { month: 'long' })),
      ) as MonthLabels,
    formatHeader: (month, year) =>
      capitalize(format(locale(), Date.UTC(year, month, 1), { month: 'long', year: 'numeric' })),
    formatMonth: (month) =>
      capitalize(format(locale(), Date.UTC(2000, month, 1), { month: 'short' })),
    formatYear: (year) => String(year),
    labelPrevious: () => t('calendar.previousMonth'),
    labelNext: () => t('calendar.nextMonth'),
    labelPreviousYear: () => t('calendar.previousYear'),
    labelNextYear: () => t('calendar.nextYear'),
    labelPreviousYears: () => t('calendar.previousYears'),
    labelNextYears: () => t('calendar.nextYears'),
    firstDayOfWeek: () => (locale() === 'es' ? 1 : 0),
  };
}

/** Calendar i18n following `I18nService`; provide it in each component that shows a Spartan calendar. */
export function provideCalendarI18n(): Provider {
  return {
    provide: BrnCalendarI18nToken,
    useFactory: () => {
      const i18n = inject(I18nService);
      const service = new BrnCalendarI18nService();
      service.use(
        calendarI18n(
          () => i18n.locale(),
          (key) => i18n.t(key),
        ),
      );
      return service;
    },
  };
}
