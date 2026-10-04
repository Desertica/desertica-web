import { mapCms, mediaUrl, type CmsRaw, type RawEntry } from './cms-mapper';
import { mapSite } from './cms-mapper';

const options = { mediaBase: 'https://cms.test', fallbackImage: () => 'https://fallback/img.jpg' };

const destination = (locale: 'en' | 'es'): RawEntry => ({
  slug: 'huacachina',
  order: 0,
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
  portraitUrls: [],
  image: null,
  gallery: [{ url: '/uploads/g.jpg' }],
  portraits: [],
  destination: { slug: 'huacachina' },
  title: locale === 'en' ? `Title ${slug}` : `Titulo ${slug}`,
  description: locale === 'en' ? 'Short' : 'Corto',
  lead: locale === 'en' ? 'Lead' : null,
  lead2: null,
  meeting: locale === 'en' ? 'Meet' : 'Punto',
  highlights: [{ icon: 'lucideCar', title: locale === 'en' ? 'Buggy' : 'Buggy ES', body: 'Body' }],
  practices: [],
  itinerary: [{ time: '15:50', title: 'Meet', body: 'At the oasis' }],
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
  site: { email: 'a@b.pe', phone: '+51 1', whatsapp: '+51 999-000', ruc: '123' },
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

  it('maps tour pages, falling back to the description when lead is empty', () => {
    const page = snapshot.tourPages['a-tour'];
    expect(page?.gallery).toEqual(['https://cms.test/uploads/g.jpg']);
    expect(page?.leadKey).toBe('cms.tours.a-tour.lead');
    expect(snapshot.messages.es?.['cms.tours.a-tour.lead']).toBe('Corto');
    expect(page?.lead2Key).toBeUndefined();
    expect(page?.highlights).toEqual([
      {
        icon: 'lucideCar',
        titleKey: 'cms.tours.a-tour.highlights.0.title',
        bodyKey: 'cms.tours.a-tour.highlights.0.body',
      },
    ]);
    expect(page?.itinerary[0]?.time).toBe('15:50');
    expect(page?.includedKeys).toEqual(['cms.tours.a-tour.included.0']);
    expect(snapshot.messages.en?.['cms.tours.a-tour.notes.0']).toBe('Weather');
    expect(page?.format).toBe('both');
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
