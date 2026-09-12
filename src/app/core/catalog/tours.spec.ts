import { catalogTours, FOOTER_DESTINATION_IDS, tourDestinations } from './tours';

describe('tour catalog', () => {
  it('keeps three destinations with three tours each', () => {
    expect(tourDestinations.map((item) => item.id)).toEqual([
      'huacachina',
      'paracas',
      'nazca',
    ]);
    expect(tourDestinations.every((item) => item.tours.length === 3)).toBe(true);
    expect(catalogTours).toHaveLength(9);
    expect(new Set(catalogTours.map((item) => item.id)).size).toBe(9);
  });

  it('keeps footer hubs in Nazca, Huacachina, Paracas order', () => {
    expect(FOOTER_DESTINATION_IDS).toEqual(['nazca', 'huacachina', 'paracas']);
  });
});
