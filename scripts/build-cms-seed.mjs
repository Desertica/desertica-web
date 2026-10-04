#!/usr/bin/env node
// Genera cms/seed/catalog.json a partir del catalogo estatico de la app Angular.
// Uso (desde la raiz del repo): node scripts/build-cms-seed.mjs
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
const { tourDestinations } = toursMod;
// phone.ts importa libphonenumber-js: se marca como externo (packages: 'external') y se resuelve desde node_modules.
const { CONTACT_BAND_IMAGE } = load('src/app/features/contact/phone.ts', { packages: 'external' });
const { ABOUT_TRIO_IMAGE, ABOUT_ARCHIVE_IMAGES } = load('src/app/features/about/about-media.ts');
const { tourPage } = load('src/app/core/catalog/tour-pages.ts');

const dicts = {
  en: JSON.parse(readFileSync(resolve(root, 'src/locales/en.json'), 'utf8')),
  es: JSON.parse(readFileSync(resolve(root, 'src/locales/es.json'), 'utf8')),
};

const lookup = (dict, key) =>
  key.split('.').reduce((acc, part) => (acc && typeof acc === 'object' ? acc[part] : undefined), dict);

const warnings = new Set();
const t = (locale, key) => {
  if (!key) return '';
  let value = lookup(dicts[locale], key);
  if (typeof value !== 'string') {
    warnings.add(`missing ${locale}:${key}`);
    if (locale === 'es') value = lookup(dicts.en, key);
  }
  return typeof value === 'string' ? value : '';
};

const feature = (locale, f) => ({ icon: f.icon, title: t(locale, f.titleKey), body: t(locale, f.bodyKey) });
const stop = (locale, s) => ({ time: s.time, title: t(locale, s.titleKey), body: t(locale, s.bodyKey) });
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
  destinations.push({ slug, order: dIndex, imageUrl: destination.image, i18n });

  destination.tours.forEach((tour, tIndex) => {
    const page = tourPage(tour);
    const tourI18n = {};
    for (const locale of ['en', 'es']) {
      const entry = {
        title: t(locale, tour.titleKey),
        description: t(locale, tour.descriptionKey),
        lead: t(locale, page.leadKey),
      };
      if (page.lead2Key) {
        const lead2 = t(locale, page.lead2Key);
        if (lead2) entry.lead2 = lead2;
      }
      entry.meeting = t(locale, page.meetingKey);
      entry.highlights = page.highlights.map((f) => feature(locale, f));
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
      portraitUrls: [...page.portraits],
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
const translations = Object.keys(flatEn).map((key) => ({
  key,
  group: key.split('.')[0],
  i18n: { en: { value: flatEn[key] }, es: { value: flatEs[key] ?? flatEn[key] } },
}));
for (const key of Object.keys(flatEs)) if (!(key in flatEn)) warnings.add(`only in es: ${key}`);

const slot = (key, extra) => ({ key, ...extra });
const mediaSlots = [
  slot('tours.banner', { imageUrl: toursMod.TOURS_BANNER_IMAGE }),
  slot('tours.closer', { imageUrl: toursMod.TOURS_CLOSER_IMAGE }),
  slot('contact.band', { imageUrl: CONTACT_BAND_IMAGE }),
  slot('about.trio', { imageUrl: ABOUT_TRIO_IMAGE }),
  ...ABOUT_ARCHIVE_IMAGES.map((u, i) => slot(`about.archive.${i + 1}`, { imageUrl: u })),
  slot('about.video', { posterUrl: '/about/sand-poster.jpg', videoUrl: '/about/sand.mp4', videoWebmUrl: '/about/sand.webm' }),
  slot('footer.stamp.mincetur', { imageUrl: '/legal/mincetur-agencia.png' }),
  slot('footer.stamp.complaints', { imageUrl: '/legal/libro-reclamaciones.png' }),
];

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

const target = resolve(root, 'cms/seed/catalog.json');
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, JSON.stringify({ destinations, tours, siteSetting, translations, mediaSlots, pages }, null, 2) + '\n');
console.log(`[seed] ${destinations.length} destinations, ${tours.length} tours, ${translations.length} translations -> ${target}`);
