import { isPlaceholder } from '../seo/seo-urls';
import type { SiteSettings } from './cms-models';

/** Placeholder contact data used until the CMS `site-setting` entry is published. */
export const DEFAULT_SITE: SiteSettings = {
  brandName: 'Desértica',
  legalYear: 2026,
  shareImage: '',
  placeholderImage: '',
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
  showInstagram: false,
  showFacebook: false,
  showTiktok: false,
  showYoutube: false,
  showLinkedin: false,
  showGoogle: false,
  showTripadvisor: false,
  legalName: 'XXXXXXXXXXXX S.A.C.',
  ruc: 'XXXXXXXXXXX',
};

/** Contact channels the visitor can use; a value still holding the placeholder is `null` so the page leaves it out. */
export type SiteContact = {
  email: string | null;
  phone: string | null;
  mailto: string | null;
  tel: string | null;
  whatsapp: string | null;
};

export function contactFromSite(site: SiteSettings): SiteContact {
  const real = (value: string) => (isPlaceholder(value) ? null : value);
  const email = real(site.email);
  const phone = real(site.phone);
  const whatsapp = real(site.whatsapp);
  return {
    email,
    phone,
    mailto: email && `mailto:${email}`,
    tel: phone && `tel:${phone.replace(/[^\d+]/g, '')}`,
    whatsapp: whatsapp && `https://wa.me/${whatsapp}`,
  };
}

/** Company name and RUC for the legal line; a placeholder name falls back to the brand and a placeholder RUC is dropped. */
export function legalFromSite(site: SiteSettings): { year: number; name: string; ruc: string | null } {
  return {
    year: site.legalYear,
    name: isPlaceholder(site.legalName) ? site.brandName : site.legalName,
    ruc: isPlaceholder(site.ruc) ? null : site.ruc,
  };
}

export type SocialId = 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'linkedin' | 'google' | 'tripadvisor';

/** The network URL, or '' unless its CMS switch is on and the URL is not empty. Every social use (footer, JSON-LD) goes through here. */
export function socialUrl(site: SiteSettings, id: SocialId): string {
  const flag = `show${id[0]!.toUpperCase()}${id.slice(1)}` as keyof SiteSettings;
  return site[flag] ? site[id].trim() : '';
}

/** Fills empty CMS fields with the defaults so the footer never renders blanks. */
export function withSiteDefaults(site: Partial<SiteSettings> | null | undefined): SiteSettings {
  const merged: SiteSettings = { ...DEFAULT_SITE };
  for (const key of Object.keys(DEFAULT_SITE) as (keyof SiteSettings)[]) {
    const value = site?.[key];
    if (typeof value === 'string' && value.trim()) {
      (merged as Record<string, string | number | boolean>)[key] = value;
    } else if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      (merged as Record<string, string | number | boolean>)[key] = value;
    } else if (typeof value === 'boolean') {
      (merged as Record<string, string | number | boolean>)[key] = value;
    }
  }

  return merged;
}
