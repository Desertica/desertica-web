import {
  catalogTours,
  featuredTours,
  FOOTER_DESTINATION_IDS,
  TOURS_BANNER_IMAGE,
  tourDestinations,
} from './tours';

const unsplashPhotoId = (url: string): string =>
  url.match(/images\.unsplash\.com\/(photo-[^?]+)/)?.[1] ?? url;

describe('tour catalog', () => {
  it('keeps three destinations with variable tour counts', () => {
    expect(tourDestinations.map((item) => item.id)).toEqual([
      'huacachina',
      'paracas',
      'nazca',
    ]);
    expect(tourDestinations.map((item) => item.tours.length)).toEqual([6, 4, 5]);
    expect(catalogTours).toHaveLength(15);
    expect(featuredTours).toHaveLength(9);
    expect(featuredTours.every((tour) => tour.featured)).toBe(true);
    expect(new Set(catalogTours.map((item) => item.id)).size).toBe(15);
  });

  it('keeps footer hubs in Nazca, Huacachina, Paracas order', () => {
    expect(FOOTER_DESTINATION_IDS).toEqual(['nazca', 'huacachina', 'paracas']);
  });

  it('uses a Huacachina banner photo that is not a card or destination image', () => {
    expect(TOURS_BANNER_IMAGE).toContain('photo-1511919471431-35002133f316');
    const used = new Set(
      [...tourDestinations.map((item) => item.image), ...catalogTours.map((item) => item.image)].map(
        unsplashPhotoId,
      ),
    );
    expect(used.has(unsplashPhotoId(TOURS_BANNER_IMAGE))).toBe(false);
  });
});
