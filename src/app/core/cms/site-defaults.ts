import type { SiteSettings } from './cms-models';

/** Placeholder contact data used until the CMS `site-setting` entry is published. */
export const DEFAULT_SITE: SiteSettings = {
  brandName: 'Desértica',
  legalYear: 2026,
  shareImage: '',
  email: 'xxxxxx@desertica.pe',
  phone: '+51 9XX XXX XXX',
  whatsapp: '519XXXXXXXX',
  instagram: 'https://www.instagram.com/desertica',
  facebook: 'https://www.facebook.com/desertica',
  tiktok: 'https://www.tiktok.com/@desertica',
  youtube: 'https://www.youtube.com/@desertica',
  linkedin: 'https://www.linkedin.com/company/desertica',
  google: 'https://maps.google.com/?q=Desertica',
  tripadvisor: 'https://www.tripadvisor.com/desertica',
  legalName: 'XXXXXXXXXXXX S.A.C.',
  ruc: 'XXXXXXXXXXX',
};

export type SiteContact = {
  email: string;
  phone: string;
  mailto: string;
  tel: string;
  whatsapp: string;
};

export function contactFromSite(site: SiteSettings): SiteContact {
  return {
    email: site.email,
    phone: site.phone,
    mailto: `mailto:${site.email}`,
    tel: `tel:${site.phone.replace(/[^\d+]/g, '')}`,
    whatsapp: `https://wa.me/${site.whatsapp}`,
  };
}

/** Fills empty CMS fields with the defaults so the footer never renders blanks. */
export function withSiteDefaults(site: Partial<SiteSettings> | null | undefined): SiteSettings {
  const merged: SiteSettings = { ...DEFAULT_SITE };
  for (const key of Object.keys(DEFAULT_SITE) as (keyof SiteSettings)[]) {
    const value = site?.[key];
    if (typeof value === 'string' && value.trim()) {
      (merged as Record<string, string | number>)[key] = value;
    } else if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      (merged as Record<string, string | number>)[key] = value;
    }
  }

  return merged;
}
