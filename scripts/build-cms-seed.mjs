#!/usr/bin/env node
// Genera el seed del CMS (catalog.json) a partir del catalogo estatico de la app Angular.
// Uso (desde la raiz del repo):
//   node scripts/build-cms-seed.mjs                       -> ../desertica-cms/seed/catalog.json
//   node scripts/build-cms-seed.mjs --out path/to/catalog.json
// Tambien acepta CMS_SEED_OUT. El CMS vive en su propio repo (Desertica/desertica-cms): el JSON resultante se commitea alli.
import { buildSync } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const load = (entry, extra = {}) => {
  const out = buildSync({
    entryPoints: [resolve(root, entry)],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    write: false,
    logLevel: 'silent',
    ...extra,
  });
  const module = { exports: {} };
  new Function('module', 'exports', 'require', out.outputFiles[0].text)(module, module.exports, require);
  return module.exports;
};
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const toursMod = load('src/app/core/catalog/tours.ts');
const { tourDestinations, FOOTER_DESTINATION_IDS } = toursMod;
// phone.ts importa libphonenumber-js: se marca como externo (packages: 'external') y se resuelve desde node_modules.
const { CONTACT_BAND_IMAGE } = load('src/app/features/contact/phone.ts', { packages: 'external' });
const { ABOUT_TRIO_IMAGE, ABOUT_ARCHIVE_IMAGES } = load('src/app/features/about/about-media.ts');
const { BLOG_HERO_IMAGE } = load('src/app/core/catalog/blog.ts', { packages: 'external' });
const { tourPage } = load('src/app/core/catalog/tour-pages.ts');

const dicts = {
  en: JSON.parse(readFileSync(resolve(root, 'src/locales/en.json'), 'utf8')),
  es: JSON.parse(readFileSync(resolve(root, 'src/locales/es.json'), 'utf8')),
};

const lookup = (dict, key) =>
  key.split('.').reduce((acc, part) => (acc && typeof acc === 'object' ? acc[part] : undefined), dict);

const warnings = new Set();
// Keys read while building destinations/tours belong to those content types, not to `translation`.
const catalogKeys = new Set();
let trackCatalogKeys = true;
const t = (locale, key) => {
  if (!key) return '';
  if (trackCatalogKeys) catalogKeys.add(key);
  let value = lookup(dicts[locale], key);
  if (typeof value !== 'string') {
    warnings.add(`missing ${locale}:${key}`);
    if (locale === 'es') value = lookup(dicts.en, key);
  }
  return typeof value === 'string' ? value : '';
};

const feature = (locale, f) => ({ icon: f.icon, title: t(locale, f.titleKey), body: t(locale, f.bodyKey) });
const stop = (locale, s) => ({
  imageUrl: s.image,
  title: t(locale, s.titleKey),
  body: t(locale, s.bodyKey),
  expandedBody: s.expandedBodyKey ? t(locale, s.expandedBodyKey) : '',
});
const video = (v) => ({ posterUrl: v.poster, webmUrl: v.webm, mp4Url: v.mp4 });
const list = (locale, keys) => keys.map((k) => t(locale, k)).filter(Boolean);

const destinations = [];
const tours = [];

tourDestinations.forEach((destination, dIndex) => {
  const slug = destination.id;
  const i18n = {};
  for (const locale of ['en', 'es']) {
    i18n[locale] = {
      title: t(locale, destination.titleKey),
      lead: t(locale, destination.leadKey),
      allLabel: t(locale, destination.allLabelKey),
    };
  }
  const footerRank = FOOTER_DESTINATION_IDS.indexOf(slug);
  destinations.push({
    slug,
    order: dIndex,
    footerOrder: footerRank === -1 ? FOOTER_DESTINATION_IDS.length + dIndex : footerRank,
    showInFooter: true,
    imageUrl: destination.image,
    i18n,
  });

  destination.tours.forEach((tour, tIndex) => {
    const page = tourPage(tour);
    const tourI18n = {};
    for (const locale of ['en', 'es']) {
      const entry = {
        title: t(locale, tour.titleKey),
        description: t(locale, tour.descriptionKey),
        lead: t(locale, page.leadKey),
      };
      entry.meeting = t(locale, page.meetingKey);
      entry.paragraphs = list(locale, page.descriptionKeys);
      entry.expandedParagraphs = list(locale, page.expandedDescriptionKeys);
      entry.termsSummary = t(locale, page.termsSummaryKey);
      entry.videos = page.videos.map(video);
      entry.practices = page.practices.map((f) => feature(locale, f));
      entry.itinerary = page.itinerary.map((s) => stop(locale, s));
      entry.included = list(locale, page.includedKeys);
      entry.excluded = list(locale, page.excludedKeys);
      entry.pack = list(locale, page.packKeys);
      entry.notes = list(locale, page.notesKeys);
      tourI18n[locale] = entry;
    }
    tours.push({
      slug: tour.id,
      destination: slug,
      order: tIndex,
      durationHours: tour.durationHours,
      priceFrom: tour.priceFrom,
      featured: tour.featured,
      format: page.format,
      languages: [...page.languages],
      imageUrl: tour.image,
      galleryUrls: [...page.gallery],
      itineraryFileUrl: page.itineraryFile,
      i18n: tourI18n,
    });
  });
});

const siteSetting = {
  email: 'xxxxxx@desertica.pe',
  phone: '+51 9XX XXX XXX',
  whatsapp: '519XXXXXXXXX',
  instagram: 'https://www.instagram.com/desertica',
  facebook: 'https://www.facebook.com/desertica',
  tiktok: 'https://www.tiktok.com/@desertica',
  youtube: 'https://www.youtube.com/@desertica',
  linkedin: 'https://www.linkedin.com/company/desertica',
  google: 'https://maps.google.com/?q=Desertica',
  tripadvisor: 'https://www.tripadvisor.com/desertica',
  legalName: 'XXXXXXXXXXXX S.A.C.',
  ruc: 'XXXXXXXXXXX',
  brandName: 'Desértica',
  legalYear: 2026, // FOOTER_LEGAL_YEAR in footer-nav.ts
};

for (const w of warnings) console.warn(`[seed] ${w}`);
// translations: todas las hojas string de los JSON de locale (es cae a en)
const flatten = (obj, prefix = '', out = {}) => {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else if (typeof v === 'string') out[key] = v;
  }
  return out;
};
const flatEn = flatten(dicts.en);
const flatEs = flatten(dicts.es);
trackCatalogKeys = false;

// ---------------------------------------------------------------------------------------------
// Translation organisation. Rules are tried top to bottom; the first match wins.
// [key regex, page, section]. Pages: global navigation footer home about contact tours tour-detail
// booking blog products legal accessibility. Derived from where each key is read in src/app
// (templates and components); update this table when the frontend gains new keys.
// ---------------------------------------------------------------------------------------------
const TRANSLATION_RULES = [
  [/^skip$/, 'accessibility', 'skip-link'],
  [/^a11y\./, 'accessibility', 'labels'],
  [/^whatsapp\./, 'global', 'whatsapp'],
  [/^lang\./, 'global', 'language'],
  [/^meta\./, 'global', 'seo'],
  [/^menu\./, 'navigation', 'mobile-menu'],
  [/^nav\.(primary|footer)$/, 'navigation', 'aria'],
  [/^nav\./, 'navigation', 'header'],
  [/^footer\.social\./, 'footer', 'social'],
  [/^footer\.(minceturAlt|complaintsAlt)$/, 'footer', 'stamps'],
  [/^footer\.(terms|privacy|conduct|complaints|mincetur|ruc)$/, 'footer', 'legal'],
  [/^footer\.newsletter/, 'footer', 'newsletter'],
  [/^footer\./, 'footer', 'columns'],
  [/^home\.hero/, 'home', 'hero'],
  [/^home\.why/, 'home', 'why'],
  [/^home\.featured/, 'home', 'featured'],
  [/^home\.pitch/, 'home', 'pitch'],
  [/^about\.(hero)/, 'about', 'hero'],
  [/^about\.(kicker|manifesto)/, 'about', 'manifesto'],
  [/^about\.map/, 'about', 'map'],
  [/^about\.trio/, 'about', 'trio'],
  [/^about\.motiva/, 'about', 'motivation'],
  [/^about\.craft/, 'about', 'craft'],
  [/^about\.archive/, 'about', 'archive'],
  [/^about\.closer/, 'about', 'closer'],
  [/^pages\.contact(Title|Lead)$/, 'contact', 'hero'],
  [/^contact\..*Error$/, 'contact', 'errors'],
  [/^contact\.(reply|thanks)/, 'contact', 'reply'],
  [/^contact\./, 'contact', 'form'],
  [/^pages\.tours(Lead)$/, 'tours', 'hero'],
  [/^pages\.toursCta/, 'tours', 'cta'],
  [/^gallery\./, 'tours', 'card'],
  [/^pages\.reservations/, 'booking', 'hero'],
  [/^pages\.(products)/, 'products', 'hero'],
  [/^products\./, 'products', 'list'],
  [/^pages\.blog/, 'blog', 'hero'],
  [/^blog\./, 'blog', 'list'],
  [/^pages\.(terms|privacy|complaints|conduct|mincetur)Lead$/, 'legal', 'lead'],
  [/^pages\.(landingLead|mappedRoutes|experienceLead)$/, 'global', 'placeholders'],
  [/^tour\.assure\./, 'tour-detail', 'assurances'],
  [/^tour\..*Error$/, 'tour-detail', 'errors'],
  [/^tour\.(gallery|photoAlt)/, 'tour-detail', 'gallery'],
  [/^tour\.(timeline|downloadItinerary)/, 'tour-detail', 'itinerary'],
  [/^tour\.(practices|included|notIncluded|pack|notes|terms|detailsLabel|detailsOverview)$/, 'tour-detail', 'details'],
  [/^tour\.(video|clip)/, 'tour-detail', 'videos'],
  [/^tour\.crumb$/, 'tour-detail', 'breadcrumb'],
  [/^tour\./, 'tour-detail', 'booking-form'],
];

const humanize = (word) => word.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
const cap = (text) => text.charAt(0).toUpperCase() + text.slice(1);
const PAGE_TITLES = {
  global: 'Global', navigation: 'Navigation', footer: 'Footer', home: 'Home', about: 'About', contact: 'Contact',
  tours: 'Tours', 'tour-detail': 'Tour detail', booking: 'Booking', blog: 'Blog', products: 'Products',
  legal: 'Legal', accessibility: 'Accessibility', brand: 'Brand',
};
// Explicit editor-facing labels for keys whose name alone is not enough.
const LABEL_OVERRIDES = {
  'home.whyKicker': 'Home — Why section kicker',
  'home.whyHeadline': 'Home — Why headline',
  'home.pitchHeadline': 'Home — Pitch headline',
  'tour.payLater': 'Tour booking form — "Pay later" payment option',
  'tour.assure.payLater': 'Tour booking assurance — Pay later (title)',
  'meta.title': 'Site-wide default page title (SEO)',
  'meta.description': 'Site-wide default meta description (SEO)',
};
const classify = (key) => {
  const rule = TRANSLATION_RULES.find(([re]) => re.test(key));
  if (!rule) throw new Error(`translation key without page: ${key}`);
  const [, page, section] = rule;
  const tail = humanize(key.split('.').slice(1).join(' ') || key);
  return { page, section, label: LABEL_OVERRIDES[key] ?? `${PAGE_TITLES[page]} — ${cap(section.replace(/-/g, ' '))} · ${tail}` };
};

const excludedTranslationKeys = Object.keys(flatEn).filter((k) => catalogKeys.has(k));
const translations = Object.keys(flatEn)
  .filter((k) => !catalogKeys.has(k))
  .map((key) => {
    const { page, section, label } = classify(key);
    const long = flatEn[key].length > 80 || flatEn[key].includes('\n');
    return {
      key,
      group: key.split('.')[0],
      page,
      section,
      label,
      kind: long ? 'long' : 'short',
      i18n: { en: { value: flatEn[key] }, es: { value: flatEs[key] ?? flatEn[key] } },
    };
  });
for (const key of Object.keys(flatEs)) if (!(key in flatEn)) warnings.add(`only in es: ${key}`);

// Media slots: [key, page, section, description, extra]
const slot = (key, page, section, description, extra) => ({ key, page, section, description, ...extra });
const mediaSlots = [
  slot('home.hero', 'home', 'hero', 'Full-bleed hero image on the home page.', { imageUrl: toursMod.HOME_HERO_IMAGE }),
  slot('blog.hero', 'blog', 'hero', 'Hero image of the blog index.', { imageUrl: BLOG_HERO_IMAGE }),
  slot('products.hero', 'products', 'hero', 'Hero image of the products index.', { imageUrl: toursMod.TOURS_BANNER_IMAGE }),
  slot('tours.banner', 'tours', 'hero', 'Banner at the top of the tours index.', { imageUrl: toursMod.TOURS_BANNER_IMAGE }),
  slot('tours.closer', 'tours', 'closer', 'Closing image at the bottom of the tours index (call to action).', { imageUrl: toursMod.TOURS_CLOSER_IMAGE }),
  slot('contact.band', 'contact', 'band', 'Wide image band on the contact page.', { imageUrl: CONTACT_BAND_IMAGE }),
  slot('about.trio', 'about', 'trio', 'Photo of the three owners on the About page.', { imageUrl: ABOUT_TRIO_IMAGE }),
  ...ABOUT_ARCHIVE_IMAGES.map((u, i) =>
    slot(`about.archive.${i + 1}`, 'about', 'archive', `Archive photo ${i + 1} of ${ABOUT_ARCHIVE_IMAGES.length} in the About page gallery.`, { imageUrl: u })),
  slot('about.video', 'about', 'video', 'Sand video (poster, webm and mp4) on the About page.', { posterUrl: '/about/sand-poster.jpg', videoUrl: '/about/sand.mp4', videoWebmUrl: '/about/sand.webm' }),
  slot('footer.stamp.mincetur', 'footer', 'stamps', 'MINCETUR travel agency registration stamp in the footer.', { imageUrl: '/legal/mincetur-agencia.png' }),
  slot('footer.stamp.complaints', 'footer', 'stamps', 'Complaints book (Libro de Reclamaciones) stamp in the footer.', { imageUrl: '/legal/libro-reclamaciones.png' }),
];

// Navigation (primary-nav.ts and footer-nav.ts). `tours-menu` = header item with the destinations/tours dropdown.
const navLinkDefs = {
  headerLinks: [
    ['nav.tours', '/tours', 'tours-menu'],
    ['nav.products', '/products'],
    ['nav.about', '/about'],
    ['nav.contact', '/contact'],
  ],
  footerBrandLinks: [['nav.about', '/about'], ['nav.blog', '/blog'], ['nav.contact', '/contact']],
  footerLegalLinks: [['footer.terms', '/terms'], ['footer.privacy', '/privacy'], ['footer.conduct', '/conduct']],
};
const navI18n = Object.fromEntries(
  ['en', 'es'].map((l) => [
    l,
    {
      ...Object.fromEntries(
        Object.entries(navLinkDefs).map(([field, defs]) => [
          field,
          defs.map(([labelKey, path, kind]) => ({ label: t(l, labelKey), path, kind: kind ?? 'link' })),
        ]),
      ),
      planTripLabel: t(l, 'nav.planTrip'),
      planTripPath: '/tours',
    },
  ]),
);
const navigation = { i18n: navI18n };

// Booking rules (tour-book.ts) and assurances (tour-assurances.ts).
const ASSURANCES = [
  { icon: 'lucideCalendar', titleKey: 'tour.assure.payLater', bodyKey: 'tour.assure.payLaterBody' },
  { icon: 'lucideClock', titleKey: 'tour.assure.cancel', bodyKey: 'tour.assure.cancelBody' },
  { icon: 'lucideCircleDollarSign', titleKey: 'tour.assure.price', bodyKey: 'tour.assure.priceBody' },
];
const bookingSetting = {
  depositRate: 0.2,
  adultsMin: 1,
  adultsDefault: 1,
  childrenMin: 0,
  childrenDefault: 0,
  peopleMax: 12,
  currencyCode: 'USD',
  i18n: Object.fromEntries(['en', 'es'].map((l) => [l, { assurances: ASSURANCES.map((f) => feature(l, f)) }])),
};
// Contact form limits (contact.ts).
const formSetting = { nameMin: 2, nameMax: 80, emailMax: 254, messageMax: 500 };

// Theme: parsed from src/styles.css (:root = light, .dark = dark; the app toggles the `dark` class on <html>).
const css = readFileSync(resolve(root, 'src/styles.css'), 'utf8');
const block = (selectorRe) => {
  const m = css.match(new RegExp(`(?:^|\\n)${selectorRe}\\s*\\{([^}]*)\\}`));
  if (!m) throw new Error(`styles.css block not found: ${selectorRe}`);
  return m[1];
};
const camel = (name) => name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
const PALETTE_KEYS = [
  'background', 'foreground', 'card', 'cardForeground', 'popover', 'popoverForeground', 'primary', 'primaryForeground',
  'secondary', 'secondaryForeground', 'muted', 'mutedForeground', 'accent', 'accentForeground', 'destructive', 'border',
  'input', 'ring', 'tierra', 'tierraForeground', 'arena', 'arenaForeground',
];
const palette = (body) => {
  const vars = Object.fromEntries([...body.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)].map(([, k, v]) => [camel(k), v.trim()]));
  return Object.fromEntries(PALETTE_KEYS.map((k) => [k, vars[k]]));
};
const light = palette(block(':root'));
const dark = palette(block(':root\\.dark,\\s*\\.dark'));
for (const [mode, p] of Object.entries({ light, dark })) {
  for (const k of PALETTE_KEYS) if (!p[k]) throw new Error(`styles.css ${mode} palette lacks ${k}`);
}
const cssVar = (body, name) => body.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1].replace(/\s+/g, ' ').trim();
const themeBlock = css.match(/@theme\s*\{([^}]*)\}/)[1];
const headerH = (re) => cssVar(re, 'header-h');
const mediaBlock = (min) => css.match(new RegExp(`@media \\(min-width: ${min}px\\)\\s*\\{\\s*:root\\s*\\{([^}]*)\\}`))[1];
const themeSetting = {
  light,
  dark,
  radius: cssVar(block(':root'), 'radius'),
  fontSans: cssVar(themeBlock, 'font-sans'),
  fontHeading: cssVar(themeBlock, 'font-heading'),
  headerHeightSm: headerH(block(':root')),
  headerHeightMd: headerH(mediaBlock(640)),
  headerHeightLg: headerH(mediaBlock(1024)),
  introEnabled: true,
  introAccent: '#5a6b3e', // INTRO_OLIVE in src/app/core/animation/wordmark-intro.ts
  introRestScale: 0.85, // INTRO_REST_SCALE
  introFailsafeMs: 12000, // INTRO_FAILSAFE_MS
};

const pageDefs = [
  ['terms', 'footer.terms', 'pages.termsLead'],
  ['privacy', 'footer.privacy', 'pages.privacyLead'],
  ['complaints', 'footer.complaints', 'pages.complaintsLead'],
  ['conduct', 'footer.conduct', 'pages.conductLead'],
  ['legal-mincetur', 'footer.mincetur', 'pages.minceturLead'],
  ['products', 'nav.products', 'pages.productsLead'],
  ['blog', 'nav.blog', 'pages.blogLead'],
];
const pages = pageDefs.map(([slug, titleKey, leadKey]) => ({
  slug,
  i18n: Object.fromEntries(['en', 'es'].map((l) => [l, { title: t(l, titleKey), lead: t(l, leadKey), body: '' }])),
}));

const outIndex = process.argv.indexOf('--out');
const outArg = outIndex !== -1 ? process.argv[outIndex + 1] : process.env.CMS_SEED_OUT;
if (outIndex !== -1 && !outArg) {
  throw new Error('--out needs a path');
}
const target = resolve(process.cwd(), outArg ?? resolve(root, '../desertica-cms/seed/catalog.json'));
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, JSON.stringify({ destinations, tours, siteSetting, themeSetting, bookingSetting, formSetting, navigation, translations, mediaSlots, pages }, null, 2) + '\n');
const pageCounts = {};
for (const tr of translations) pageCounts[tr.page] = (pageCounts[tr.page] ?? 0) + 1;
console.log(`[seed] translation pages: ${JSON.stringify(pageCounts)}; excluded ${excludedTranslationKeys.length} catalog-owned keys`);
const exclPrefixes = {};
for (const k of excludedTranslationKeys) { const p = k.split('.').slice(0, 2).join('.'); exclPrefixes[p] = (exclPrefixes[p] ?? 0) + 1; }
if (process.env.SEED_VERBOSE) console.log('[seed] excluded prefixes', JSON.stringify(exclPrefixes));
console.log(`[seed] ${destinations.length} destinations, ${tours.length} tours, ${translations.length} translations -> ${target}`);
