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
  featured: boolean;
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

export const TOURS_BANNER_IMAGE = unsplash('photo-1511919471431-35002133f316', {
  w: 2400,
  h: 1200,
});

export const TOURS_CLOSER_IMAGE = unsplash('photo-1516026672322-bc52d61a55d5', {
  w: 2400,
  h: 800,
});

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
        featured: true,
      },
      {
        id: 'oasis-overnight',
        destination: 'huacachina',
        titleKey: 'nav.oasisOvernight',
        descriptionKey: 'nav.oasisOvernightDesc',
        durationHours: 24,
        priceFrom: 210,
        image: unsplash('photo-1419242902214-272b3f66ee7a'),
        featured: true,
      },
      {
        id: 'huacachina-weekend',
        destination: 'huacachina',
        titleKey: 'nav.huacachinaWeekend',
        descriptionKey: 'nav.huacachinaWeekendDesc',
        durationHours: 48,
        priceFrom: 289,
        image: unsplash('photo-1473580044384-7ba9967e16a0'),
        featured: true,
      },
      {
        id: 'sandboard',
        destination: 'huacachina',
        titleKey: 'nav.sandboard',
        descriptionKey: 'nav.sandboardDesc',
        durationHours: 3,
        priceFrom: 45,
        image: unsplash('photo-1474044159687-1ee9f3a62995'),
        featured: false,
      },
      {
        id: 'ica-vineyards',
        destination: 'huacachina',
        titleKey: 'nav.icaVineyards',
        descriptionKey: 'nav.icaVineyardsDesc',
        durationHours: 4,
        priceFrom: 65,
        image: unsplash('photo-1506377247377-2a5b3b417ebb'),
        featured: false,
      },
      {
        id: 'oasis-walk',
        destination: 'huacachina',
        titleKey: 'nav.oasisWalk',
        descriptionKey: 'nav.oasisWalkDesc',
        durationHours: 2,
        priceFrom: 35,
        image: unsplash('photo-1418065460487-3e41a6c84dc5'),
        featured: false,
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
        featured: true,
      },
      {
        id: 'ballestas',
        destination: 'paracas',
        titleKey: 'footer.ballestas',
        descriptionKey: 'nav.ballestasDesc',
        durationHours: 3,
        priceFrom: 55,
        image: unsplash('photo-1507525428034-b723cf961d3e'),
        featured: true,
      },
      {
        id: 'paracas-reserve',
        destination: 'paracas',
        titleKey: 'nav.paracasReserve',
        descriptionKey: 'nav.paracasReserveDesc',
        durationHours: 5,
        priceFrom: 72,
        image: unsplash('photo-1501785888041-af3ef285b470'),
        featured: true,
      },
      {
        id: 'paracas-sunset',
        destination: 'paracas',
        titleKey: 'nav.paracasSunset',
        descriptionKey: 'nav.paracasSunsetDesc',
        durationHours: 3,
        priceFrom: 60,
        image: unsplash('photo-1437719417032-859601134d76'),
        featured: false,
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
        featured: true,
      },
      {
        id: 'nazca-flight',
        destination: 'nazca',
        titleKey: 'footer.nazcaFlight',
        descriptionKey: 'nav.nazcaFlightDesc',
        durationHours: 2,
        priceFrom: 120,
        image: unsplash('photo-1451337516015-6b6e9a44a8a3'),
        featured: true,
      },
      {
        id: 'nazca-cantalloc',
        destination: 'nazca',
        titleKey: 'nav.nazcaCantalloc',
        descriptionKey: 'nav.nazcaCantallocDesc',
        durationHours: 3,
        priceFrom: 50,
        image: unsplash('photo-1469854523086-cc02fe5d8800'),
        featured: true,
      },
      {
        id: 'cahuachi',
        destination: 'nazca',
        titleKey: 'nav.cahuachi',
        descriptionKey: 'nav.cahuachiDesc',
        durationHours: 3,
        priceFrom: 40,
        image: unsplash('photo-1526392060635-9d6019884377'),
        featured: false,
      },
      {
        id: 'maria-reiche',
        destination: 'nazca',
        titleKey: 'nav.mariaReiche',
        descriptionKey: 'nav.mariaReicheDesc',
        durationHours: 2,
        priceFrom: 30,
        image: unsplash('photo-1554907984-15263bfd63bd'),
        featured: false,
      },
    ],
  },
];

export const catalogTours: readonly CatalogTour[] = tourDestinations.flatMap(
  (destination) => destination.tours,
);

export const featuredTours: readonly CatalogTour[] = catalogTours.filter((tour) => tour.featured);

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
