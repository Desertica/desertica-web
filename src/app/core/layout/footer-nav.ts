import {
  simpleFacebook,
  simpleGoogle,
  simpleInstagram,
  simpleLinkedin,
  simpleTiktok,
  simpleTripadvisor,
  simpleYoutube,
} from './footer-social-icons';

export type FooterLink = {
  labelKey: string;
  path: string;
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

export const footerDestinations: readonly FooterDestination[] = [
  {
    titleKey: 'footer.nazca',
    all: { labelKey: 'footer.nazcaAll', path: '/nazca' },
    children: [
      { labelKey: 'footer.nazcaLines', path: '/experiences/nazca-lines' },
      { labelKey: 'footer.nazcaFlight', path: '/experiences/nazca-flight' },
    ],
  },
  {
    titleKey: 'footer.huacachina',
    all: { labelKey: 'footer.huacachinaAll', path: '/huacachina' },
    children: [
      { labelKey: 'nav.duneBuggy', path: '/experiences/dune-buggy' },
      { labelKey: 'nav.oasisCamp', path: '/experiences/oasis-camp' },
      { labelKey: 'nav.huacachinaWeekend', path: '/experiences/huacachina-weekend' },
    ],
  },
  {
    titleKey: 'footer.paracas',
    all: { labelKey: 'footer.paracasAll', path: '/paracas' },
    children: [
      { labelKey: 'footer.paracasBuggy', path: '/experiences/paracas-buggy' },
      { labelKey: 'footer.ballestas', path: '/experiences/ballestas' },
    ],
  },
];

export const footerSocials: readonly FooterSocial[] = [
  { labelKey: 'footer.social.instagram', href: 'https://www.instagram.com/desertica', svg: simpleInstagram },
  { labelKey: 'footer.social.facebook', href: 'https://www.facebook.com/desertica', svg: simpleFacebook },
  { labelKey: 'footer.social.tiktok', href: 'https://www.tiktok.com/@desertica', svg: simpleTiktok },
  { labelKey: 'footer.social.youtube', href: 'https://www.youtube.com/@desertica', svg: simpleYoutube },
  { labelKey: 'footer.social.linkedin', href: 'https://www.linkedin.com/company/desertica', svg: simpleLinkedin },
  { labelKey: 'footer.social.google', href: 'https://maps.google.com/?q=Desertica', svg: simpleGoogle },
  { labelKey: 'footer.social.tripadvisor', href: 'https://www.tripadvisor.com/desertica', svg: simpleTripadvisor },
];

export const footerContact = {
  email: 'xxxxxx@desertica.pe',
  phone: '+51 9XX XXX XXX',
  mailto: 'mailto:xxxxxx@desertica.pe',
  tel: 'tel:+519XXXXXXXX',
} as const;

export const footerLegalEntity = {
  year: 2026,
  name: 'XXXXXXXXXXXX S.A.C.',
  ruc: 'XXXXXXXXXXX',
} as const;

export const footerLegalLinks: readonly FooterLink[] = [
  { labelKey: 'footer.terms', path: '/terms' },
  { labelKey: 'footer.privacy', path: '/privacy' },
  { labelKey: 'footer.conduct', path: '/conduct' },
];

export const footerStamps: readonly FooterStamp[] = [
  {
    src: '/legal/mincetur-agencia.png',
    width: 466,
    height: 669,
    path: '/legal/mincetur',
    altKey: 'footer.minceturAlt',
    optimized: true,
  },
  {
    src: '/legal/libro-reclamaciones.png',
    width: 1253,
    height: 1916,
    path: '/complaints',
    altKey: 'footer.complaintsAlt',
    optimized: true,
  },
];
