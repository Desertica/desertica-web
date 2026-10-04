import { CatalogTour, destinationById, tourById } from './tours';

export type TourFormat = 'shared' | 'private' | 'both';
export type TourLanguage = 'es' | 'en';

export type TourFeature = {
  icon: string;
  titleKey: string;
  bodyKey: string;
};

export type TourStop = {
  image: string;
  titleKey: string;
  bodyKey: string;
  expandedBodyKey?: string;
};

export type TourVideo = {
  poster: string;
  webm?: string;
  mp4?: string;
};

export type TourPage = {
  gallery: readonly string[];
  leadKey: string;
  descriptionKeys: readonly string[];
  expandedDescriptionKeys: readonly string[];
  meetingKey: string;
  languages: readonly TourLanguage[];
  format: TourFormat;
  practices: readonly TourFeature[];
  itinerary: readonly TourStop[];
  videos: readonly TourVideo[];
  includedKeys: readonly string[];
  excludedKeys: readonly string[];
  packKeys: readonly string[];
  notesKeys: readonly string[];
  termsSummaryKey?: string;
  itineraryFile?: string;
};

const unsplash = (photo: string, size: { w?: number; h?: number } = {}): string => {
  const width = size.w ?? 1600;
  const height = size.h ?? 1200;
  return `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=${width}&h=${height}&q=80`;
};

const duneGallery = [
  unsplash('photo-1533106497176-45ae19e68ba2', { w: 1800, h: 1200 }),
  unsplash('photo-1509316785289-025f5b846b35', { w: 900, h: 1200 }),
  unsplash('photo-1473580044384-7ba9967e16a0', { w: 900, h: 1200 }),
] as const;

const dunePosters = [
  unsplash('photo-1621795307430-3ff25aa08945', { w: 900, h: 1600 }),
  unsplash('photo-1643856120284-f47c4e9521e0', { w: 900, h: 1600 }),
] as const;

const emptyPage = (tour: CatalogTour): TourPage => ({
  gallery: [tour.image, tour.image, tour.image],
  leadKey: tour.descriptionKey,
  descriptionKeys: [],
  expandedDescriptionKeys: [],
  meetingKey: 'tour.meetingIca',
  languages: ['es', 'en'],
  format: 'both',
  practices: [],
  itinerary: [],
  videos: [],
  includedKeys: [],
  excludedKeys: [],
  packKeys: [],
  notesKeys: [],
});

const duneBuggyPage: TourPage = {
  gallery: duneGallery,
  leadKey: 'tours.duneBuggy.lead',
  descriptionKeys: [
    'tours.duneBuggy.lead2',
    'tours.duneBuggy.description.p1',
    'tours.duneBuggy.description.p2',
  ],
  expandedDescriptionKeys: [
    'tours.duneBuggy.details.description.p1',
    'tours.duneBuggy.details.description.p2',
  ],
  meetingKey: 'tours.duneBuggy.meeting',
  languages: ['es', 'en'],
  format: 'both',
  practices: [
    {
      icon: 'lucideUsers',
      titleKey: 'tours.duneBuggy.practices.group.title',
      bodyKey: 'tours.duneBuggy.practices.group.body',
    },
    {
      icon: 'lucideLanguages',
      titleKey: 'tours.duneBuggy.practices.lang.title',
      bodyKey: 'tours.duneBuggy.practices.lang.body',
    },
    {
      icon: 'lucideCar',
      titleKey: 'tours.duneBuggy.practices.private.title',
      bodyKey: 'tours.duneBuggy.practices.private.body',
    },
    {
      icon: 'lucideWind',
      titleKey: 'tours.duneBuggy.practices.pace.title',
      bodyKey: 'tours.duneBuggy.practices.pace.body',
    },
  ],
  itinerary: [
    {
      image: dunePosters[0],
      titleKey: 'tours.duneBuggy.itinerary.meet.title',
      bodyKey: 'tours.duneBuggy.itinerary.meet.body',
      expandedBodyKey: 'tours.duneBuggy.itinerary.meet.expanded',
    },
    {
      image: duneGallery[0],
      titleKey: 'tours.duneBuggy.itinerary.dunes.title',
      bodyKey: 'tours.duneBuggy.itinerary.dunes.body',
      expandedBodyKey: 'tours.duneBuggy.itinerary.dunes.expanded',
    },
    {
      image: duneGallery[1],
      titleKey: 'tours.duneBuggy.itinerary.board.title',
      bodyKey: 'tours.duneBuggy.itinerary.board.body',
      expandedBodyKey: 'tours.duneBuggy.itinerary.board.expanded',
    },
    {
      image: duneGallery[2],
      titleKey: 'tours.duneBuggy.itinerary.light.title',
      bodyKey: 'tours.duneBuggy.itinerary.light.body',
      expandedBodyKey: 'tours.duneBuggy.itinerary.light.expanded',
    },
    {
      image: dunePosters[1],
      titleKey: 'tours.duneBuggy.itinerary.close.title',
      bodyKey: 'tours.duneBuggy.itinerary.close.body',
      expandedBodyKey: 'tours.duneBuggy.itinerary.close.expanded',
    },
  ],
  videos: [{ poster: dunePosters[0] }, { poster: dunePosters[1] }],
  includedKeys: [
    'tours.duneBuggy.included.guide',
    'tours.duneBuggy.included.buggy',
    'tours.duneBuggy.included.board',
    'tours.duneBuggy.included.helmet',
  ],
  excludedKeys: ['tours.duneBuggy.excluded.meals', 'tours.duneBuggy.excluded.standing'],
  packKeys: [
    'tours.duneBuggy.pack.wind',
    'tours.duneBuggy.pack.sun',
    'tours.duneBuggy.pack.shoes',
  ],
  notesKeys: [
    'tours.duneBuggy.notes.intensity',
    'tours.duneBuggy.notes.kids',
    'tours.duneBuggy.notes.weather',
  ],
  termsSummaryKey: 'tours.duneBuggy.termsSummary',
  itineraryFile: '/tours/dune-buggy-itinerary.pdf',
};

const pages: Readonly<Record<string, TourPage>> = {
  'dune-buggy': duneBuggyPage,
};

export function tourPage(tour: CatalogTour): TourPage {
  return pages[tour.id] ?? emptyPage(tour);
}

export function resolvedTour(id: string): { tour: CatalogTour; page: TourPage } | undefined {
  const tour = tourById(id);
  if (!tour) {
    return undefined;
  }

  return { tour, page: tourPage(tour) };
}

export function tourDestination(tour: CatalogTour) {
  return destinationById(tour.destination);
}

export function tourHasDetails(page: TourPage): boolean {
  return Boolean(
    page.expandedDescriptionKeys.length ||
      page.itinerary.length ||
      page.notesKeys.length ||
      page.includedKeys.length ||
      page.excludedKeys.length ||
      page.packKeys.length ||
      page.termsSummaryKey,
  );
}
