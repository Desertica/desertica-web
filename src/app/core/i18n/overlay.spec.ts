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

  // Keys made editable in docs/TEXTOS-EDITABLES.md: they must exist in both catalogs and yield to the CMS.
  it.each([
    'booking.title', 'booking.lead', 'booking.noAvailability', 'booking.holdNote', 'booking.taxIncluded',
    'checkout.title', 'checkout.empty', 'checkout.passengersLead', 'checkout.billingLead',
    'payment.successTitle', 'payment.successBody', 'payment.pendingTitle', 'payment.pendingBody',
    'myBooking.lead', 'complaints.lead', 'complaints.legalNote', 'complaints.doneTitle', 'waiver.thanks',
  ])('lets the CMS override %s', (key) => {
    for (const locale of ['en', 'es'] as const) {
      expect(translate(key, locale)).not.toBe(key);
      expect(translate(key, locale, { [locale]: { [key]: 'Custom' } })).toBe('Custom');
    }
  });
});
