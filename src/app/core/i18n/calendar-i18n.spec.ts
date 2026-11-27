import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideNativeDateAdapter } from '@spartan-ng/brain/date-time';
import { HlmCalendar } from '@spartan-ng/helm/calendar';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { AppLocale } from './catalogs';
import { calendarI18n, provideCalendarI18n } from './calendar-i18n';
import { I18nService } from './i18n';

describe('calendarI18n', () => {
  const config = (locale: AppLocale) =>
    calendarI18n(
      () => locale,
      (key) => key,
    );
  const week = (locale: AppLocale) =>
    Array.from({ length: 7 }, (_, i) => config(locale).formatWeekdayName!(i));

  it('names days and months in Spanish, starting the week on Monday', () => {
    const es = config('es');
    expect(week('es')).toEqual(['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá']);
    expect(es.labelWeekday!(1)).toBe('Lunes');
    expect(es.months!()[0]).toBe('Enero');
    expect(es.formatHeader!(10, 2026)).toBe('Noviembre de 2026');
    expect(es.firstDayOfWeek!()).toBe(1);
  });

  it('keeps English with Sunday first', () => {
    const en = config('en');
    expect(week('en')).toEqual(['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']);
    expect(en.formatHeader!(10, 2026)).toBe('November 2026');
    expect(en.firstDayOfWeek!()).toBe(0);
  });
});

@Component({
  imports: [HlmCalendar],
  template: `<hlm-calendar [defaultFocusedDate]="focused" />`,
})
class Host {
  focused = new Date(2026, 10, 27);
}

describe('provideCalendarI18n', () => {
  it('renders the calendar in the active language and follows a change', async () => {
    TestBed.configureTestingModule({
      providers: [provideSpartanHlm(), provideNativeDateAdapter(), provideCalendarI18n()],
    });
    const i18n = TestBed.inject(I18nService);
    i18n.setLocale('es');
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const weekdays = () =>
      Array.from(fixture.nativeElement.querySelectorAll('th') as NodeListOf<HTMLElement>, (th) =>
        th.textContent?.trim(),
      );

    expect(weekdays()).toEqual(['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do']);
    expect(fixture.nativeElement.textContent).toContain('Noviembre de 2026');
    expect(
      fixture.nativeElement
        .querySelector('button[brnCalendarNextButton]')
        .getAttribute('aria-label'),
    ).toBe('Ir al mes siguiente');

    i18n.setLocale('en');
    await fixture.whenStable();
    expect(weekdays()[0]).toBe('Su');
  });
});
