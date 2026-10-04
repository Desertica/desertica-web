import { type CatalogDestination, FOOTER_DESTINATION_IDS, tourDestinations, tourPath } from '../catalog/tours';
import type { SiteSettings } from '../cms/cms-models';
import type { MediaSlot } from '../cms/cms-models';
import { contactFromSite, DEFAULT_SITE } from '../cms/site-defaults';
import {
  simpleFacebook,
  simpleGooglemaps,
  simpleInstagram,
  simpleLinkedin,
  simpleTiktok,
  simpleTripadvisor,
  simpleYoutube,
} from './footer-social-icons';

export type FooterLink = {
  labelKey: string;
  path: string;
  fragment?: string;
};

export type FooterSocial = {
  labelKey: string;
  href: string;
  svg: string;
};

export type FooterDestination = {
  titleKey: string;
  all: FooterLink;
  children: readonly FooterLink[];
};

export type FooterStamp = {
  src: string;
  width: number;
  height: number;
  path: string;
  altKey: string;
  optimized: boolean;
};

export const footerBrandLinks: readonly FooterLink[] = [
  { labelKey: 'nav.about', path: '/about' },
  { labelKey: 'nav.blog', path: '/blog' },
  { labelKey: 'nav.contact', path: '/contact' },
];

/** Footer columns follow `FOOTER_DESTINATION_IDS`; destinations added in the CMS come last. */
export function buildFooterDestinations(
  destinations: readonly CatalogDestination[],
): readonly FooterDestination[] {
  const rank = (id: string): number => {
    const index = FOOTER_DESTINATION_IDS.indexOf(id);
    return index === -1 ? FOOTER_DESTINATION_IDS.length : index;
  };

  return [...destinations]
    .sort((a, b) => rank(a.id) - rank(b.id))
    .map((destination) => ({
      titleKey: destination.titleKey,
      all: { labelKey: destination.allLabelKey, path: destination.hubPath },
      children: destination.tours.map((tour) => ({
        labelKey: tour.titleKey,
        path: tourPath(tour.id),
      })),
    }));
}

export const footerDestinations: readonly FooterDestination[] =
  buildFooterDestinations(tourDestinations);

const SOCIAL_LINKS: readonly {
  id: 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'linkedin' | 'google' | 'tripadvisor';
  labelKey: string;
  svg: string;
}[] = [
  { id: 'instagram', labelKey: 'footer.social.instagram', svg: simpleInstagram },
  { id: 'facebook', labelKey: 'footer.social.facebook', svg: simpleFacebook },
  { id: 'tiktok', labelKey: 'footer.social.tiktok', svg: simpleTiktok },
  { id: 'youtube', labelKey: 'footer.social.youtube', svg: simpleYoutube },
  { id: 'linkedin', labelKey: 'footer.social.linkedin', svg: simpleLinkedin },
  { id: 'google', labelKey: 'footer.social.google', svg: simpleGooglemaps },
  { id: 'tripadvisor', labelKey: 'footer.social.tripadvisor', svg: simpleTripadvisor },
];

export function buildFooterSocials(site: SiteSettings): readonly FooterSocial[] {
  return SOCIAL_LINKS.filter((item) => site[item.id]).map((item) => ({
    labelKey: item.labelKey,
    href: site[item.id],
    svg: item.svg,
  }));
}

export const footerSocials: readonly FooterSocial[] = buildFooterSocials(DEFAULT_SITE);

export const footerContact = contactFromSite(DEFAULT_SITE);

export const FOOTER_LEGAL_YEAR = 2026;

export const footerLegalEntity = {
  year: FOOTER_LEGAL_YEAR,
  name: DEFAULT_SITE.legalName,
  ruc: DEFAULT_SITE.ruc,
};

export const footerLegalLinks: readonly FooterLink[] = [
  { labelKey: 'footer.terms', path: '/terms' },
  { labelKey: 'footer.privacy', path: '/privacy' },
  { labelKey: 'footer.conduct', path: '/conduct' },
];

const STAMPS: readonly (FooterStamp & { slot: string })[] = [
  {
    slot: 'footer.stamp.mincetur',
    src: '/legal/mincetur-agencia.png',
    width: 223,
    height: 320,
    path: '/legal/mincetur',
    altKey: 'footer.minceturAlt',
    optimized: true,
  },
  {
    slot: 'footer.stamp.complaints',
    src: '/legal/libro-reclamaciones.png',
    width: 209,
    height: 320,
    path: '/complaints',
    altKey: 'footer.complaintsAlt',
    optimized: true,
  },
];

export function buildFooterStamps(media: Readonly<Record<string, MediaSlot>>): readonly FooterStamp[] {
  return STAMPS.map(({ slot, ...stamp }) => ({ ...stamp, src: media[slot]?.image ?? stamp.src }));
}

export const footerStamps: readonly FooterStamp[] = buildFooterStamps({});
