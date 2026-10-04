import { ApplicationRef, PLATFORM_ID, REQUEST, TransferState, makeStateKey } from '@angular/core';
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
    expect(service.t('nav.products')).toBe('Productos');
    expect(document.documentElement.lang).toBe('es');
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('es');
  });

  it('reads the locale from the query, the cookie, or storage', () => {
    window.history.replaceState({}, '', '/?lang=es');
    expect(TestBed.inject(I18nService).locale()).toBe('es');

    TestBed.resetTestingModule();
    window.history.replaceState({}, '', '/');
    document.cookie = 'locale=es; path=/';
    TestBed.configureTestingModule({});
    expect(TestBed.inject(I18nService).locale()).toBe('es');

    TestBed.resetTestingModule();
    document.cookie = 'locale=; path=/; max-age=0';
    localStorage.setItem(LOCALE_STORAGE_KEY, 'es');
    TestBed.configureTestingModule({});
    expect(TestBed.inject(I18nService).locale()).toBe('es');
    window.history.replaceState({}, '', '/');
  });

  it('applies a stored preference after a transferred locale', async () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'es');
    TestBed.inject(TransferState).set(makeStateKey<string>('locale'), 'en');
    const service = TestBed.inject(I18nService);

    expect(service.locale()).toBe('en');
    TestBed.inject(ApplicationRef).tick();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(service.locale()).toBe('es');
  });

  it('resolves the request locale on the server', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'server' },
        {
          provide: REQUEST,
          useValue: new Request('http://localhost/tours?lang=es', {
            headers: { cookie: 'locale=en' },
          }),
        },
      ],
    });

    const fromCookie = TestBed.inject(I18nService);
    expect(fromCookie.locale()).toBe('en');
    fromCookie.setLocale('es');

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: REQUEST, useValue: new Request('http://localhost/tours?lang=es') },
      ],
    });
    expect(TestBed.inject(I18nService).locale()).toBe('es');
  });
});
