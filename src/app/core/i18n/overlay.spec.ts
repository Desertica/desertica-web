import { translate } from './catalogs';

describe('translate with a CMS overlay', () => {
  it('prefers CMS messages over the bundled catalogs', () => {
    expect(translate('nav.blog', 'es')).not.toBe('Custom');
    expect(translate('nav.blog', 'es', { es: { 'nav.blog': 'Custom' } })).toBe('Custom');
  });

  it('resolves CMS-only keys and falls back to the default locale overlay', () => {
    const overlay = { en: { 'cms.tours.x.title': 'Tour X' }, es: {} };
    expect(translate('cms.tours.x.title', 'es', overlay)).toBe('Tour X');
    expect(translate('cms.tours.x.title', 'en', overlay)).toBe('Tour X');
  });

  it('ignores empty CMS values and returns the key when nothing matches', () => {
    expect(translate('nav.blog', 'en', { en: { 'nav.blog': '' } })).toBe(
      translate('nav.blog', 'en'),
    );
    expect(translate('missing.key', 'es', { en: {} })).toBe('missing.key');
  });
});
