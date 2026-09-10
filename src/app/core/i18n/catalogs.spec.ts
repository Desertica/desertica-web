import { resolveLocale, translate } from './catalogs';

describe('i18n catalogs', () => {
  it('prefers the cookie over the query and Accept-Language', () => {
    expect(
      resolveLocale({
        cookie: 'en',
        query: 'es',
        acceptLanguage: 'es-PE,es;q=0.9',
      }),
    ).toBe('en');
  });

  it('uses the query when no cookie is set', () => {
    expect(
      resolveLocale({
        query: 'es',
        acceptLanguage: 'en-US,en;q=0.9',
      }),
    ).toBe('es');
  });

  it('falls back to Accept-Language and then English', () => {
    expect(resolveLocale({ acceptLanguage: 'es-PE,en;q=0.8' })).toBe('es');
    expect(resolveLocale({ acceptLanguage: 'fr-FR,fr;q=0.9' })).toBe('en');
  });

  it('looks up nested keys with object notation', () => {
    expect(translate('nav.tours', 'en')).toBe('Tours');
    expect(translate('nav.planTrip', 'es')).toBe('Planifica tu viaje');
    expect(translate('home.whyHeadline', 'en')).toContain("Ica isn't a stop");
    expect(translate('home.whyHeadline', 'es')).toContain('Ica no es una parada');
    expect(translate('gallery.from', 'en')).toBe('FROM');
    expect(translate('gallery.from', 'es')).toBe('DESDE');
    expect(translate('gallery.hours', 'en')).toBe('HOURS');
    expect(translate('gallery.hours', 'es')).toBe('HORAS');
  });
});
