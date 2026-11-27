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
  featured,
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
  faqs: [
    {
      question: locale === 'en' ? 'Is it safe?' : '¿Es seguro?',
      answer: locale === 'en' ? 'Yes' : 'Sí',
    },
    { question: locale === 'en' ? 'No answer yet' : '', answer: '' },
  ],
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
    { poster: null, posterUrl: 'https://img/no-file.jpg', webm: null, webmUrl: null, mp4: null, mp4Url: null },
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
  },
  theme: {
    light: { primary: 'red', unknownToken: 'x' },
    dark: { primary: 'blue' },
    radius: 'large',
    fontSans: 'inter',
    fontHeading: 'lora',
    headerSize: 'compact',
    introEnabled: false,
    introAccent: '#123456',
    introRestScale: 0.9,
    introFailsafeMs: 5000,
  },
  forms: { nameMin: 3, nameMax: 60, emailMax: 200, messageMax: 400 },
  booking: {
    en: {
      adultsDefault: 2,
      childrenDefault: 0,
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
      image: 'https://cms.test/uploads/g.jpg',
      featured: true,
    });
    expect(snapshot.messages.es?.['cms.tours.a-tour.title']).toBe('Titulo a-tour');
    expect(snapshot.messages.en?.['cms.destinations.huacachina.lead']).toBe('Dunes');
  });

  it('keeps a non-default image focus and ignores unknown values', () => {
    const focusOf = (value: unknown) => {
      const tours = raw.tours as unknown as Record<string, RawEntry[]>;
      const mapped = mapCms(
        {
          ...raw,
          tours: { ...tours, en: tours['en'].map((tour) => ({ ...tour, imageFocus: value })) },
        } as unknown as CmsRaw,
        options,
      );
      return mapped.destinations[0]?.tours.find((tour) => tour.id === 'a-tour')?.imageFocus;
    };

    expect(focusOf('top')).toBe('top');
    expect(focusOf('center')).toBeUndefined();
    expect(focusOf('diagonal')).toBeUndefined();
  });

  describe('values shared by both languages', () => {
    const sharedOf = (en: RawEntry, es: RawEntry) => {
      const tours = raw.tours as unknown as Record<string, RawEntry[]>;
      const mapped = mapCms(
        { ...raw, tours: { en: tours['en'].map((t) => ({ ...t, ...en })), es: tours['es'].map((t) => ({ ...t, ...es })) } } as unknown as CmsRaw,
        options,
      );
      return mapped.destinations[0]?.tours.find((tour) => tour.id === 'a-tour');
    };

    it('takes them from the most recently published language, not always English', () => {
      const tour = sharedOf(
        { featured: false, publishedAt: '2026-11-01T10:00:00.000Z' },
        { featured: true, imageFocus: 'top', publishedAt: '2026-11-05T10:00:00.000Z' },
      );
      expect(tour?.featured).toBe(true);
      expect(tour?.imageFocus).toBe('top');
    });

    it('keeps English first without dates or when English is the newest', () => {
      expect(sharedOf({ featured: false }, { featured: true })?.featured).toBe(false);
      expect(
        sharedOf(
          { featured: false, publishedAt: '2026-11-05T10:00:00.000Z' },
          { featured: true, publishedAt: '2026-11-01T10:00:00.000Z' },
        )?.featured,
      ).toBe(false);
    });
  });

  describe('tour description (body)', () => {
    const pageWith = (en: unknown, es: unknown) => {
      const tours = raw.tours as unknown as Record<string, RawEntry[]>;
      const withBody = (entries: RawEntry[], body: unknown) =>
        entries.map((entry) => ({ ...entry, body }));
      const mapped = mapCms(
        { ...raw, tours: { en: withBody(tours['en'], en), es: withBody(tours['es'], es) } } as unknown as CmsRaw,
        options,
      );
      return { page: mapped.tourPages['a-tour'], messages: mapped.messages };
    };

    it('shows the first paragraph as the lead, the rest below, and repeats all in the accordion', () => {
      const { page, messages } = pageWith('One\n\nTwo\n\n\nThree', 'Uno\n\nDos\n\nTres');
      expect(page?.leadKey).toBe('cms.tours.a-tour.body.0');
      expect(page?.descriptionKeys).toEqual(['cms.tours.a-tour.body.1', 'cms.tours.a-tour.body.2']);
      expect(page?.expandedDescriptionKeys).toEqual([
        'cms.tours.a-tour.body.0',
        'cms.tours.a-tour.body.1',
        'cms.tours.a-tour.body.2',
      ]);
      expect(messages.en?.['cms.tours.a-tour.body.2']).toBe('Three');
      expect(messages.es?.['cms.tours.a-tour.body.1']).toBe('Dos');
    });

    it('drops Lorem ipsum paragraphs left in the CMS text', () => {
      const filler = 'Lorem ipsum dolor sit amet.\n\nSuspendisse potenti. Curabitur at lectus.';
      const { page, messages } = pageWith(`Real lead\n\n${filler}`, `Entrada real\n\n${filler}`);
      expect(page?.descriptionKeys).toEqual([]);
      expect(page?.expandedDescriptionKeys).toEqual(['cms.tours.a-tour.body.0']);
      expect(messages.es?.['cms.tours.a-tour.body.0']).toBe('Entrada real');
    });

    it('works with a single language', () => {
      const { page, messages } = pageWith(null, 'Solo español');
      expect(page?.leadKey).toBe('cms.tours.a-tour.body.0');
      expect(messages.es?.['cms.tours.a-tour.body.0']).toBe('Solo español');
      expect(messages.en?.['cms.tours.a-tour.body.0']).toBeUndefined();
    });

    it('keeps the older fields when the tour has no body', () => {
      const { page } = pageWith('   ', null);
      expect(page?.leadKey).toBe('cms.tours.a-tour.lead');
      expect(page?.descriptionKeys).toEqual(['cms.tours.a-tour.paragraphs.0']);
    });
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
        image: 'https://cms.test/uploads/g.jpg',
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

describe('mapCms placeholder', () => {
  const bare = (extra: RawEntry = {}) => ({
    tours: both((l) => [
      {
        ...tour(l, 'x', 0),
        image: null,
        imageUrl: null,
        gallery: [],
        galleryUrls: [],
        itinerary: [],
        ...extra,
      },
    ]),
    destinations: both((l) => [{ ...destination(l), image: null, imageUrl: null }]),
  });
  const none = { mediaBase: 'https://cms.test', fallbackImage: () => '' };

  it('uses the own wireframe when nothing is set', () => {
    const snapshot = mapCms(bare(), none);
    expect(snapshot.destinations[0].image).toBe('/placeholder.svg');
    expect(snapshot.destinations[0].tours[0].image).toBe('/placeholder.svg');
    expect(snapshot.tourPages['x'].gallery).toEqual([
      '/placeholder.svg',
      '/placeholder.svg',
      '/placeholder.svg',
    ]);
  });

  it('takes a gallery uploaded only on the Spanish entry', () => {
    const raw = bare();
    raw.tours = {
      en: [{ ...tour('en', 'x', 0), image: null, imageUrl: null, gallery: [], galleryUrls: [], itinerary: [] }],
      es: [{ ...tour('es', 'x', 0), image: null, imageUrl: null, gallery: [{ url: '/uploads/es.jpg' }], galleryUrls: [], itinerary: [] }],
    };
    const snapshot = mapCms(raw, none);
    expect(snapshot.tourPages['x'].gallery).toEqual(['https://cms.test/uploads/es.jpg']);
    expect(snapshot.destinations[0].tours[0].image).toBe('https://cms.test/uploads/es.jpg');
  });

  it('uses the CMS placeholderImage and still prefers uploads, then the old url', () => {
    const site = { placeholderImage: { url: '/uploads/ph.png' } };
    const snapshot = mapCms({ ...bare(), site }, none);
    expect(snapshot.destinations[0].image).toBe('https://cms.test/uploads/ph.png');
    expect(snapshot.site?.placeholderImage).toBe('https://cms.test/uploads/ph.png');

    const legacy = mapCms(
      { ...bare(), destinations: both((l) => [{ ...destination(l), image: null }]), site },
      none,
    );
    expect(legacy.destinations[0].image).toBe('https://img/dest.jpg');
  });

  it('maps unknown feature icons to lucideStar', () => {
    const snapshot = mapCms(
      bare({ practices: [{ icon: 'lucideShield', title: 'a', body: 'b' }] }),
      none,
    );
    expect(snapshot.tourPages['x'].practices[0].icon).toBe('lucideStar');
  });
});

describe('mapSite', () => {
  it('strips non-digits from the WhatsApp number', () => {
    expect(mapSite({ whatsapp: '+51 (999) 000-111' }).whatsapp).toBe('51999000111');
  });

  it('reads the social switches, off unless explicitly true', () => {
    const site = mapSite({ instagram: 'https://i.example/x', showInstagram: true, showFacebook: 'true' });
    expect([site.showInstagram, site.showFacebook, site.showTiktok]).toEqual([true, false, false]);
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
    expect(snapshot.theme).toMatchObject({
      radius: 'large',
      fontSans: 'inter',
      fontHeading: 'lora',
      headerSize: 'compact',
    });
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
      adultsDefault: 2,
      childrenDefault: 0,
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

  it('maps FAQs', () => {
    const page = snapshot.tourPages['a-tour'];
    // Only questions with both texts count, and each locale keeps its own copy.
    expect(page?.faqs).toEqual([
      {
        questionKey: 'cms.tours.a-tour.faqs.0.question',
        answerKey: 'cms.tours.a-tour.faqs.0.answer',
      },
    ]);
    expect(snapshot.messages.es?.['cms.tours.a-tour.faqs.0.question']).toBe('¿Es seguro?');
  });

  it('ignores the fields that moved to the booking system', () => {
    const moved = mapCms(
      {
        ...raw,
        tours: both((l) => [
          {
            ...tour(l, 'c-tour', 0),
            priceFrom: 79,
            pricePen: 300,
            durationHours: 4,
            format: 'both',
            languages: ['es'],
            meeting: 'Meet',
            meetingPointUrl: 'https://maps.example/meet',
            latitude: -14.1,
            longitude: -75.7,
          },
        ]),
        site: { ...(raw.site as RawEntry), legalName: 'X S.A.C.', ruc: '123' },
        booking: { en: { depositRate: 0.3, availabilityMonths: 6, adultsMin: 2, childrenMin: 1, peopleMax: 10, adultsDefault: 2 } },
      } as unknown as CmsRaw,
      options,
    );
    const owned = /priceFrom|pricePen|durationHours|"format"|"languages"|meeting|latitude|longitude|depositRate|availabilityMonths|adultsMin|childrenMin|peopleMax|legalName|"ruc"/;
    expect(JSON.stringify({ ...moved, messages: Object.keys(moved.messages.en ?? {}) })).not.toMatch(owned);
    expect(moved.booking?.adultsDefault).toBe(2);
  });
});
