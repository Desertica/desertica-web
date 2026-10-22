import { absoluteUrl, alternatesFor, isPlaceholder, localizedUrl, pathOf } from './seo-urls';

describe('seo urls', () => {
  it('puts the language first in the path, for every language', () => {
    expect(localizedUrl('https://d.pe', '/tours', 'en')).toBe('https://d.pe/en/tours');
    expect(localizedUrl('https://d.pe', '/tours', 'es')).toBe('https://d.pe/es/tours');
    expect(localizedUrl('https://d.pe', '/', 'es')).toBe('https://d.pe/es/');
    expect(localizedUrl('https://d.pe', 'tours', 'en')).toBe('https://d.pe/en/tours');
    expect(localizedUrl('https://d.pe', '/es/tours', 'en')).toBe('https://d.pe/en/tours');
  });

  it('lists every language and x-default pointing at English', () => {
    expect(alternatesFor('https://d.pe', '/tours/dune-buggy')).toEqual([
      { hreflang: 'en', href: 'https://d.pe/en/tours/dune-buggy' },
      { hreflang: 'es', href: 'https://d.pe/es/tours/dune-buggy' },
      { hreflang: 'x-default', href: 'https://d.pe/en/tours/dune-buggy' },
    ]);
  });

  it('strips query and fragment from router URLs', () => {
    expect(pathOf('/tours?lang=es#nazca')).toBe('/tours');
    expect(pathOf('/tours/dune-buggy')).toBe('/tours/dune-buggy');
    expect(pathOf('?lang=es')).toBe('/');
  });

  it('makes media URLs absolute and spots CMS placeholders', () => {
    expect(absoluteUrl('https://d.pe', '/uploads/a.jpg')).toBe('https://d.pe/uploads/a.jpg');
    expect(absoluteUrl('https://d.pe', 'https://cdn.test/a.jpg')).toBe('https://cdn.test/a.jpg');
    expect(isPlaceholder('xxxxxx@desertica.pe')).toBe(true);
    expect(isPlaceholder('+51 9XX XXX XXX')).toBe(true);
    expect(isPlaceholder('info@desertica.pe')).toBe(false);
    expect(isPlaceholder('')).toBe(true);
  });
});
