import { contactFromSite, DEFAULT_SITE, legalFromSite, socialUrl, withSiteDefaults } from './site-defaults';

describe('site defaults', () => {
  it('drops placeholder contact channels and legal data', () => {
    expect(contactFromSite(DEFAULT_SITE)).toEqual({ email: null, phone: null, mailto: null, tel: null, whatsapp: null });
    expect(legalFromSite(DEFAULT_SITE)).toEqual({ year: 2026, name: 'Desértica', ruc: null });
  });

  it('builds links from real CMS values', () => {
    const site = withSiteDefaults({
      email: 'hola@desertica.pe',
      phone: '+51 987 654 321',
      whatsapp: '51987654321',
      legalName: 'Desértica S.A.C.',
      ruc: '20123456789',
    });
    expect(contactFromSite(site)).toEqual({
      email: 'hola@desertica.pe',
      phone: '+51 987 654 321',
      mailto: 'mailto:hola@desertica.pe',
      tel: 'tel:+51987654321',
      whatsapp: 'https://wa.me/51987654321',
    });
    expect(legalFromSite(site)).toEqual({ year: 2026, name: 'Desértica S.A.C.', ruc: '20123456789' });
  });

  it('keeps a social off until its switch is on, and keeps the switch from the CMS', () => {
    expect(socialUrl(DEFAULT_SITE, 'instagram')).toBe('');
    const site = withSiteDefaults({ showInstagram: true, showFacebook: false, facebook: 'https://f.example/x' });
    expect(socialUrl(site, 'instagram')).toBe(DEFAULT_SITE.instagram);
    expect(socialUrl(site, 'facebook')).toBe('');
  });
});
