import { mapCms, mapTheme, mediaUrl, type CmsRaw, type RawEntry } from './cms-mapper';
import { mapSite } from './cms-mapper';

const options = { mediaBase: 'https://cms.test', fallbackImage: () => 'https://fallback/img.jpg' };

const destination = (locale: 'en' | 'es'): RawEntry => ({
  slug: 'huacachina',
  order: 0,
  footerOrder: 2,
  showInFooter: false,
  imageUrl: 'https://img/dest.jpg',
  title: locale === 'en' ? 'Huacachina' : 'Huacachina ES',
  lead: locale === 'en' ? 'Dunes' : 'Dunas',
  allLabel: locale === 'en' ? 'All' : 'Todos',
});

const tour = (locale: 'en' | 'es', slug: string, order: number, featured = false): RawEntry => ({
  slug,
  order,
  durationHours: 4,
  priceFrom: 79,
  featured,
  format: 'both',
  languages: ['es', 'en'],
  imageUrl: 'https://img/tour.jpg',
  galleryUrls: ['https://img/g1.jpg'],
  image: null,
  gallery: [{ url: '/uploads/g.jpg' }],
  destination: { slug: 'huacachina' },
  title: locale === 'en' ? `Title ${slug}` : `Titulo ${slug}`,
  description: locale === 'en' ? 'Short' : 'Corto',
  lead: locale === 'en' ? 'Lead' : null,
  termsSummary: locale === 'en' ? 'Summary' : null,
  itineraryFileUrl: '/files/itinerary.pdf',
  seoTitle: locale === 'en' ? 'SEO title' : null,
  seoDescription: null,
  assurances: [{ icon: 'lucideShield', title: locale === 'en' ? 'Safe' : 'Seguro', body: 'Body' }],
  meeting: locale === 'en' ? 'Meet' : 'Punto',
  paragraphs: [{ text: locale === 'en' ? 'First' : 'Primero' }],
  expandedParagraphs: [{ text: 'Long' }],
  practices: [{ icon: 'lucideCar', title: locale === 'en' ? 'Buggy' : 'Buggy ES', body: 'Body' }],
  itinerary: [
    {
      image: { url: '/uploads/stop.jpg' },
      imageUrl: null,
      title: 'Meet',
      body: 'At the oasis',
      expandedBody: locale === 'en' ? 'More' : null,
    },
    { image: null, imageUrl: null, title: 'Dunes', body: 'Ride', expandedBody: null },
  ],
  videos: [
    {
      poster: null,
      posterUrl: 'https://img/poster.jpg',
      webm: null,
      webmUrl: '/v.webm',
      mp4: { url: '/uploads/v.mp4' },
      mp4Url: null,
    },
  ],
  included: [{ text: 'Guide' }],
  excluded: [],
  pack: [],
  notes: [{ text: 'Weather' }],
});

const both = (make: (locale: 'en' | 'es') => RawEntry[]) => ({ en: make('en'), es: make('es') });

const raw: CmsRaw = {
  destinations: both((l) => [destination(l)]),
  tours: both((l) => [tour(l, 'b-tour', 1), tour(l, 'a-tour', 0, true)]),
  translations: both((l) => [
    { key: 'nav.blog', value: l === 'en' ? 'Journal' : 'Diario' },
    { key: 'x', value: '' },
  ]),
  mediaSlots: both((l) => [
    {
      key: 'about.video',
      video: null,
      videoUrl: '/about/sand.mp4',
      videoWebmUrl: '/about/sand.webm',
      posterUrl: '/about/p.jpg',
      alt: l === 'en' ? 'Sand' : 'Arena',
    },
  ]),
  pages: both((l) => [
    {
      slug: 'terms',
      title: l === 'en' ? 'Terms' : 'Términos',
      lead: 'L',
      body: '# T',
      seoTitle: '',
      seoDescription: '',
    },
  ]),
  posts: both((l) => [
    {
      slug: 'p',
      publishedDate: '2026-01-02',
      title: l === 'en' ? 'Post' : 'Entrada',
      excerpt: '',
      content: 'c',
      cover: { url: '/uploads/c.jpg' },
    },
  ]),
  products: both((l) => [
    { slug: 'pisco', order: 1, price: '25', title: l === 'en' ? 'Pisco' : 'Pisco ES' },
  ]),
  site: {
    brandName: 'Desértica',
    legalYear: 2027,
    shareImage: { url: '/uploads/share.jpg' },
    email: 'a@b.pe',
    phone: '+51 1',
    whatsapp: '+51 999-000',
    ruc: '123',
  },
  theme: {
    light: { primary: 'red', unknownToken: 'x' },
    dark: { primary: 'blue' },
    radius: '1rem',
    introEnabled: false,
    introAccent: '#123456',
    introRestScale: 0.9,
    introFailsafeMs: 5000,
  },
  forms: { nameMin: 3, nameMax: 60, emailMax: 200, messageMax: 400 },
  booking: {
    en: {
      depositRate: 0.3,
      adultsMin: 1,
      adultsDefault: 2,
      childrenMin: 0,
      childrenDefault: 0,
      peopleMax: 10,
      currencyCode: 'USD',
      assurances: [{ icon: 'lucideClock', title: 'Free cancel', body: 'Up to 24h' }],
    },
    es: { assurances: [{ icon: 'lucideClock', title: 'Cancelación gratis', body: 'Hasta 24h' }] },
  },
  navigation: {
    en: {
      headerLinks: [
        { label: 'Tours', path: '/tours', kind: 'tours-menu' },
        { label: 'About', path: '/about', kind: 'link' },
      ],
      footerBrandLinks: [{ label: 'Blog', path: '/blog' }],
      footerLegalLinks: [],
      planTripLabel: 'Plan your trip',
      planTripPath: '/contact',
    },
    es: {
      headerLinks: [
        { label: 'Tours', path: '/tours', kind: 'tours-menu' },
        { label: 'Nosotros', path: '/about', kind: 'link' },
      ],
      footerBrandLinks: [{ label: 'Blog', path: '/blog' }],
      footerLegalLinks: [],
      planTripLabel: 'Planea tu viaje',
      planTripPath: '/contact',
    },
  },
};

describe('mapCms', () => {
  const snapshot = mapCms(raw, options);

  it('builds destinations with ordered tours and key-based text', () => {
    expect(snapshot.destinations).toHaveLength(1);
    const dest = snapshot.destinations[0];
    expect(dest?.id).toBe('huacachina');
    expect(dest?.hubPath).toBe('/huacachina');
    expect(dest?.image).toBe('https://img/dest.jpg');
    expect(dest?.tours.map((item) => item.id)).toEqual(['a-tour', 'b-tour']);
    expect(dest?.tours[0]).toEqual({
      id: 'a-tour',
      destination: 'huacachina',
      titleKey: 'cms.tours.a-tour.title',
      descriptionKey: 'cms.tours.a-tour.description',
      durationHours: 4,
      priceFrom: 79,
      image: 'https://img/tour.jpg',
      featured: true,
    });
    expect(snapshot.messages.es?.['cms.tours.a-tour.title']).toBe('Titulo a-tour');
    expect(snapshot.messages.en?.['cms.destinations.huacachina.lead']).toBe('Dunes');
  });

  it('maps tour pages to the key-based model', () => {
    const page = snapshot.tourPages['a-tour'];
    expect(page?.gallery).toEqual(['https://cms.test/uploads/g.jpg']);
    expect(page?.leadKey).toBe('cms.tours.a-tour.lead');
    expect(snapshot.messages.es?.['cms.tours.a-tour.lead']).toBe('Corto');
    expect(page?.descriptionKeys).toEqual(['cms.tours.a-tour.paragraphs.0']);
    expect(snapshot.messages.es?.['cms.tours.a-tour.paragraphs.0']).toBe('Primero');
    expect(page?.expandedDescriptionKeys).toEqual(['cms.tours.a-tour.expandedParagraphs.0']);
    expect(page?.practices).toEqual([
      {
        icon: 'lucideCar',
        titleKey: 'cms.tours.a-tour.practices.0.title',
        bodyKey: 'cms.tours.a-tour.practices.0.body',
      },
    ]);
    expect(page?.includedKeys).toEqual(['cms.tours.a-tour.included.0']);
    expect(snapshot.messages.en?.['cms.tours.a-tour.notes.0']).toBe('Weather');
    expect(page?.format).toBe('both');
    expect(page?.termsSummaryKey).toBe('cms.tours.a-tour.termsSummary');
    expect(page?.itineraryFile).toBe('/files/itinerary.pdf');
  });

  it('maps itinerary stops with images, expanded copy and videos', () => {
    const page = snapshot.tourPages['a-tour'];
    expect(page?.itinerary).toEqual([
      {
        image: 'https://cms.test/uploads/stop.jpg',
        titleKey: 'cms.tours.a-tour.itinerary.0.title',
        bodyKey: 'cms.tours.a-tour.itinerary.0.body',
        expandedBodyKey: 'cms.tours.a-tour.itinerary.0.expanded',
      },
      {
        image: 'https://img/tour.jpg',
        titleKey: 'cms.tours.a-tour.itinerary.1.title',
        bodyKey: 'cms.tours.a-tour.itinerary.1.body',
        expandedBodyKey: undefined,
      },
    ]);
    expect(snapshot.messages.en?.['cms.tours.a-tour.itinerary.0.expanded']).toBe('More');
    expect(page?.videos).toEqual([
      { poster: 'https://img/poster.jpg', webm: '/v.webm', mp4: 'https://cms.test/uploads/v.mp4' },
    ]);
  });

  it('keeps only non-empty translations', () => {
    expect(snapshot.messages.en?.['nav.blog']).toBe('Journal');
    expect(snapshot.messages.es?.['nav.blog']).toBe('Diario');
    expect(snapshot.messages.en).not.toHaveProperty('x');
  });

  it('maps media slots, alts, pages, posts, products and the site', () => {
    expect(snapshot.media['about.video']).toEqual({
      video: '/about/sand.mp4',
      videoWebm: '/about/sand.webm',
      poster: '/about/p.jpg',
    });
    expect(snapshot.messages.es?.['cms.media.about.video.alt']).toBe('Arena');
    expect(snapshot.pages['terms']?.i18n.es?.title).toBe('Términos');
    expect(snapshot.posts[0]).toMatchObject({ slug: 'p', cover: 'https://cms.test/uploads/c.jpg' });
    expect(snapshot.products[0]).toMatchObject({ slug: 'pisco', price: 25 });
    expect(snapshot.site?.whatsapp).toBe('51999000');
  });

  it('skips tours without a destination and tolerates missing collections', () => {
    const partial = mapCms(
      { tours: both(() => [{ ...tour('en', 'orphan', 0), destination: null }]) },
      options,
    );
    expect(partial.destinations).toEqual([]);
    expect(partial.tourPages).toEqual({});
    expect(partial.site).toBeNull();
  });
});

describe('mediaUrl', () => {
  it('prefixes relative urls and leaves absolute ones alone', () => {
    expect(mediaUrl({ url: '/uploads/a.jpg' }, 'https://cms.test')).toBe(
      'https://cms.test/uploads/a.jpg',
    );
    expect(mediaUrl({ url: 'https://cdn/a.jpg' }, 'https://cms.test')).toBe('https://cdn/a.jpg');
    expect(mediaUrl({ url: '/uploads/a.jpg' }, null)).toBe('/uploads/a.jpg');
    expect(mediaUrl(null, 'https://cms.test')).toBeUndefined();
  });
});

describe('mapSite', () => {
  it('strips non-digits from the WhatsApp number', () => {
    expect(mapSite({ whatsapp: '+51 (999) 000-111' }).whatsapp).toBe('51999000111');
  });
});

describe('mapCms global settings', () => {
  const snapshot = mapCms(raw, options);

  it('maps the site settings including the share image', () => {
    expect(snapshot.site).toMatchObject({
      brandName: 'Desértica',
      legalYear: 2027,
      shareImage: 'https://cms.test/uploads/share.jpg',
      whatsapp: '51999000',
    });
  });

  it('maps theme palettes, ignoring unknown tokens', () => {
    expect(snapshot.theme?.light).toEqual({ primary: 'red' });
    expect(snapshot.theme?.dark).toEqual({ primary: 'blue' });
    expect(snapshot.theme?.radius).toBe('1rem');
    expect(snapshot.theme?.intro).toEqual({
      enabled: false,
      accent: '#123456',
      restScale: 0.9,
      failsafeMs: 5000,
    });
    expect(mapTheme({ light: null }).light).toEqual({});
  });

  it('maps booking rules and localized assurances', () => {
    expect(snapshot.booking).toMatchObject({
      depositRate: 0.3,
      adultsDefault: 2,
      peopleMax: 10,
      assurances: [
        {
          icon: 'lucideClock',
          titleKey: 'cms.booking.assurances.0.title',
          bodyKey: 'cms.booking.assurances.0.body',
        },
      ],
    });
    expect(snapshot.messages.es?.['cms.booking.assurances.0.title']).toBe('Cancelación gratis');
    expect(snapshot.forms).toEqual({ nameMin: 3, nameMax: 60, emailMax: 200, messageMax: 400 });
  });

  it('maps navigation with localized labels and the tours menu marker', () => {
    expect(snapshot.navigation?.headerLinks).toEqual([
      {
        labelKey: 'cms.nav.header.0.label',
        path: '/tours',
        fragment: undefined,
        kind: 'tours-menu',
      },
      { labelKey: 'cms.nav.header.1.label', path: '/about', fragment: undefined, kind: 'link' },
    ]);
    expect(snapshot.messages.es?.['cms.nav.header.1.label']).toBe('Nosotros');
    expect(snapshot.messages.en?.['cms.nav.planTrip.label']).toBe('Plan your trip');
    expect(snapshot.navigation?.planTrip.path).toBe('/contact');
    expect(snapshot.navigation?.footerBrandLinks).toHaveLength(1);
  });

  it('maps per-tour assurances, SEO keys and footer settings', () => {
    const page = snapshot.tourPages['a-tour'];
    expect(page?.assurances?.[0]?.titleKey).toBe('cms.tours.a-tour.assurances.0.title');
    expect(snapshot.messages.es?.['cms.tours.a-tour.assurances.0.title']).toBe('Seguro');
    expect(page?.seoTitleKey).toBe('cms.tours.a-tour.seoTitle');
    expect(page?.seoDescriptionKey).toBeUndefined();
    expect(snapshot.destinations[0]).toMatchObject({ footerOrder: 2, showInFooter: false });
  });
});
