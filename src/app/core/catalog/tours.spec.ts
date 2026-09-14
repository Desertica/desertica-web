import { tourPage } from './tour-pages';
import {
  catalogTours,
  featuredTours,
  FOOTER_DESTINATION_IDS,
  TOURS_BANNER_IMAGE,
  TOURS_CLOSER_IMAGE,
  tourById,
  tourDestinations,
  tourPath,
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

  it('uses distinct banner and closer photos that are not card or destination images', () => {
    expect(TOURS_BANNER_IMAGE).toContain('photo-1511919471431-35002133f316');
    expect(TOURS_CLOSER_IMAGE).toContain('photo-1516026672322-bc52d61a55d5');
    expect(unsplashPhotoId(TOURS_CLOSER_IMAGE)).not.toBe(unsplashPhotoId(TOURS_BANNER_IMAGE));
    expect(unsplashPhotoId(TOURS_CLOSER_IMAGE)).not.toBe('photo-1533106497176-45ae19e68ba2');
    const used = new Set(
      [...tourDestinations.map((item) => item.image), ...catalogTours.map((item) => item.image)].map(
        unsplashPhotoId,
      ),
    );
    expect(used.has(unsplashPhotoId(TOURS_BANNER_IMAGE))).toBe(false);
    expect(used.has(unsplashPhotoId(TOURS_CLOSER_IMAGE))).toBe(false);
  });

  it('resolves tour paths and ids', () => {
    expect(tourPath('dune-buggy')).toBe('/tours/dune-buggy');
    expect(tourById('dune-buggy')?.titleKey).toBe('nav.duneBuggy');
    expect(tourById('missing')).toBeUndefined();
  });

  it('fills dune-buggy detail and hides empty blocks on other tours', () => {
    const dune = tourById('dune-buggy');
    const sandboard = tourById('sandboard');
    expect(dune).toBeDefined();
    expect(sandboard).toBeDefined();
    if (!dune || !sandboard) {
      return;
    }

    const page = tourPage(dune);
    expect(page.gallery).toHaveLength(3);
    expect(new Set(page.gallery.map(unsplashPhotoId)).size).toBe(3);
    expect(page.portraits).toHaveLength(2);
    expect(page.itinerary).toHaveLength(5);
    expect(page.highlights.length).toBeGreaterThan(3);
    expect(page.leadKey).toBe('tours.duneBuggy.lead');

    const stub = tourPage(sandboard);
    expect(stub.gallery).toEqual([sandboard.image, sandboard.image, sandboard.image]);
    expect(stub.highlights).toEqual([]);
    expect(stub.itinerary).toEqual([]);
    expect(stub.portraits).toEqual([]);
    expect(stub.leadKey).toBe(sandboard.descriptionKey);
  });
});
