import { catalogTours, featuredTours, FOOTER_DESTINATION_IDS, tourDestinations } from './tours';

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
});
