import {
  footerContact,
  footerDestinations,
  footerLegalEntity,
  footerSocials,
  footerStamps,
} from './footer-nav';
import { simpleWhatsapp } from './footer-social-icons';

describe('footer nav', () => {
  it('maps destination hubs and product placeholders', () => {
    expect(footerDestinations.map((item) => item.all.path)).toEqual([
      '/nazca',
      '/huacachina',
      '/paracas',
    ]);
    expect(footerDestinations[1]?.children.map((item) => item.fragment)).toEqual([
      'dune-buggy',
      'oasis-overnight',
      'huacachina-weekend',
    ]);
    expect(footerDestinations[1]?.children.every((item) => item.path === '/tours')).toBe(true);
  });

  it('keeps legal placeholders in RUC and company length', () => {
    expect(footerLegalEntity.ruc).toHaveLength(11);
    expect(footerLegalEntity.name.endsWith('S.A.C.')).toBe(true);
  });

  it('points stamps at document routes', () => {
    expect(footerStamps.map((item) => item.path)).toEqual(['/legal/mincetur', '/complaints']);
    expect(footerStamps.every((item) => item.optimized)).toBe(true);
    expect(footerStamps[1]?.src).toBe('/legal/libro-reclamaciones.png');
  });

  it('exposes a WhatsApp deep link and official mark', () => {
    expect(footerContact.whatsapp).toBe('https://wa.me/519XXXXXXXX');
    expect(simpleWhatsapp).toContain('<title>WhatsApp</title>');
    expect(simpleWhatsapp).toContain('viewBox="0 0 24 24"');
  });

  it('uses official brand marks for socials', () => {
    expect(footerSocials.map((item) => item.svg)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('<title>Instagram</title>'),
        expect.stringContaining('<title>Facebook</title>'),
        expect.stringContaining('<title>TikTok</title>'),
        expect.stringContaining('<title>YouTube</title>'),
        expect.stringContaining('<title>LinkedIn</title>'),
        expect.stringContaining('<title>Google</title>'),
        expect.stringContaining('<title>Tripadvisor</title>'),
      ]),
    );
  });
});
