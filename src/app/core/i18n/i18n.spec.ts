import { TestBed } from '@angular/core/testing';
import { LOCALE_STORAGE_KEY } from './catalogs';
import { I18nService } from './i18n';

describe('I18nService', () => {
  beforeEach(() => {
    localStorage.removeItem(LOCALE_STORAGE_KEY);
    document.cookie = 'locale=; path=/; max-age=0';
    document.documentElement.lang = 'en';
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    localStorage.removeItem(LOCALE_STORAGE_KEY);
    document.cookie = 'locale=; path=/; max-age=0';
    document.documentElement.lang = 'en';
  });

  it('defaults to English copy', () => {
    const service = TestBed.inject(I18nService);

    expect(service.locale()).toBe('en');
    expect(service.t('nav.tours')).toBe('Tours');
    expect(document.documentElement.lang).toBe('en');
  });

  it('changes nav copy when the locale is Spanish', () => {
    const service = TestBed.inject(I18nService);

    service.setLocale('es');

    expect(service.locale()).toBe('es');
    expect(service.t('nav.tours')).toBe('Tours');
    expect(service.t('nav.planTrip')).toBe('Planifica tu viaje');
    expect(service.t('nav.packages')).toBe('Paquetes');
    expect(document.documentElement.lang).toBe('es');
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('es');
  });
});
