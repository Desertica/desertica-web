export const TOURS_PATH = '/tours';

export type DestinationId = 'huacachina' | 'paracas' | 'nazca';

export type CatalogTour = {
  id: string;
  destination: DestinationId;
  titleKey: string;
  descriptionKey: string;
  durationHours: number;
  priceFrom: number;
  image: string;
};

export type CatalogDestination = {
  id: DestinationId;
  titleKey: string;
  allLabelKey: string;
  hubPath: `/${DestinationId}`;
  leadKey: string;
  image: string;
  tours: readonly CatalogTour[];
};

const unsplash = (photo: string, size: { w?: number; h?: number } = {}): string => {
  const width = size.w ?? 1200;
  const height = size.h ?? 1200;
  return `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=${width}&h=${height}&q=80`;
};

export const tourDestinations: readonly CatalogDestination[] = [
  {
    id: 'huacachina',
    titleKey: 'footer.huacachina',
    allLabelKey: 'footer.huacachinaAll',
    hubPath: '/huacachina',
    leadKey: 'pages.huacachinaLead',
    image: unsplash('photo-1473580044384-7ba9967e16a0', { w: 1200, h: 1500 }),
    tours: [
      {
        id: 'dune-buggy',
        destination: 'huacachina',
        titleKey: 'nav.duneBuggy',
        descriptionKey: 'nav.duneBuggyDesc',
        durationHours: 4,
        priceFrom: 79,
        image: unsplash('photo-1533106497176-45ae19e68ba2'),
      },
      {
        id: 'oasis-overnight',
        destination: 'huacachina',
        titleKey: 'nav.oasisOvernight',
        descriptionKey: 'nav.oasisOvernightDesc',
        durationHours: 24,
        priceFrom: 210,
        image: unsplash('photo-1419242902214-272b3f66ee7a'),
      },
      {
        id: 'huacachina-weekend',
        destination: 'huacachina',
        titleKey: 'nav.huacachinaWeekend',
        descriptionKey: 'nav.huacachinaWeekendDesc',
        durationHours: 48,
        priceFrom: 289,
        image: unsplash('photo-1473580044384-7ba9967e16a0'),
      },
    ],
  },
  {
    id: 'paracas',
    titleKey: 'footer.paracas',
    allLabelKey: 'footer.paracasAll',
    hubPath: '/paracas',
    leadKey: 'pages.paracasLead',
    image: unsplash('photo-1547234935-80c7145ec969', { w: 1200, h: 1500 }),
    tours: [
      {
        id: 'paracas-buggy',
        destination: 'paracas',
        titleKey: 'footer.paracasBuggy',
        descriptionKey: 'nav.paracasBuggyDesc',
        durationHours: 4,
        priceFrom: 85,
        image: unsplash('photo-1547234935-80c7145ec969'),
      },
      {
        id: 'ballestas',
        destination: 'paracas',
        titleKey: 'footer.ballestas',
        descriptionKey: 'nav.ballestasDesc',
        durationHours: 3,
        priceFrom: 55,
        image: unsplash('photo-1507525428034-b723cf961d3e'),
      },
      {
        id: 'paracas-reserve',
        destination: 'paracas',
        titleKey: 'nav.paracasReserve',
        descriptionKey: 'nav.paracasReserveDesc',
        durationHours: 5,
        priceFrom: 72,
        image: unsplash('photo-1501785888041-af3ef285b470'),
      },
    ],
  },
  {
    id: 'nazca',
    titleKey: 'footer.nazca',
    allLabelKey: 'footer.nazcaAll',
    hubPath: '/nazca',
    leadKey: 'pages.nazcaLead',
    image: unsplash('photo-1469854523086-cc02fe5d8800', { w: 1200, h: 1500 }),
    tours: [
      {
        id: 'nazca-lines',
        destination: 'nazca',
        titleKey: 'footer.nazcaLines',
        descriptionKey: 'nav.nazcaLinesDesc',
        durationHours: 3,
        priceFrom: 45,
        image: unsplash('photo-1509316785289-025f5b846b35'),
      },
      {
        id: 'nazca-flight',
        destination: 'nazca',
        titleKey: 'footer.nazcaFlight',
        descriptionKey: 'nav.nazcaFlightDesc',
        durationHours: 2,
        priceFrom: 120,
        image: unsplash('photo-1451337516015-6b6e9a44a8a3'),
      },
      {
        id: 'nazca-cantalloc',
        destination: 'nazca',
        titleKey: 'nav.nazcaCantalloc',
        descriptionKey: 'nav.nazcaCantallocDesc',
        durationHours: 3,
        priceFrom: 50,
        image: unsplash('photo-1469854523086-cc02fe5d8800'),
      },
    ],
  },
];

export const catalogTours: readonly CatalogTour[] = tourDestinations.flatMap(
  (destination) => destination.tours,
);

export const FOOTER_DESTINATION_IDS: readonly DestinationId[] = [
  'nazca',
  'huacachina',
  'paracas',
];

export function destinationById(id: DestinationId): CatalogDestination {
  const destination = tourDestinations.find((item) => item.id === id);
  if (!destination) {
    throw new Error(`Unknown destination: ${id}`);
  }

  return destination;
}
