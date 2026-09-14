import { CatalogTour, destinationById, tourById } from './tours';

export type TourFormat = 'shared' | 'private' | 'both';
export type TourLanguage = 'es' | 'en';

export type TourFeature = {
  icon: string;
  titleKey: string;
  bodyKey: string;
};

export type TourStop = {
  time: string;
  titleKey: string;
  bodyKey: string;
};

export type TourPage = {
  gallery: readonly string[];
  portraits: readonly string[];
  leadKey: string;
  lead2Key?: string;
  meetingKey: string;
  languages: readonly TourLanguage[];
  format: TourFormat;
  highlights: readonly TourFeature[];
  practices: readonly TourFeature[];
  itinerary: readonly TourStop[];
  includedKeys: readonly string[];
  excludedKeys: readonly string[];
  packKeys: readonly string[];
  notesKeys: readonly string[];
};

const unsplash = (photo: string, size: { w?: number; h?: number } = {}): string => {
  const width = size.w ?? 1600;
  const height = size.h ?? 1200;
  return `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=${width}&h=${height}&q=80`;
};

const emptyPage = (tour: CatalogTour): TourPage => ({
  gallery: [tour.image, tour.image, tour.image],
  portraits: [],
  leadKey: tour.descriptionKey,
  meetingKey: 'tour.meetingIca',
  languages: ['es', 'en'],
  format: 'both',
  highlights: [],
  practices: [],
  itinerary: [],
  includedKeys: [],
  excludedKeys: [],
  packKeys: [],
  notesKeys: [],
});

const duneBuggyPage: TourPage = {
  gallery: [
    unsplash('photo-1533106497176-45ae19e68ba2', { w: 1800, h: 1200 }),
    unsplash('photo-1509316785289-025f5b846b35', { w: 900, h: 1200 }),
    unsplash('photo-1473580044384-7ba9967e16a0', { w: 900, h: 1200 }),
  ],
  portraits: [
    unsplash('photo-1621795307430-3ff25aa08945', { w: 900, h: 1600 }),
    unsplash('photo-1643856120284-f47c4e9521e0', { w: 900, h: 1600 }),
  ],
  leadKey: 'tours.duneBuggy.lead',
  lead2Key: 'tours.duneBuggy.lead2',
  meetingKey: 'tours.duneBuggy.meeting',
  languages: ['es', 'en'],
  format: 'both',
  highlights: [
    {
      icon: 'lucideCar',
      titleKey: 'tours.duneBuggy.highlights.buggy.title',
      bodyKey: 'tours.duneBuggy.highlights.buggy.body',
    },
    {
      icon: 'lucideWind',
      titleKey: 'tours.duneBuggy.highlights.board.title',
      bodyKey: 'tours.duneBuggy.highlights.board.body',
    },
    {
      icon: 'lucideShield',
      titleKey: 'tours.duneBuggy.highlights.helmet.title',
      bodyKey: 'tours.duneBuggy.highlights.helmet.body',
    },
    {
      icon: 'lucideSun',
      titleKey: 'tours.duneBuggy.highlights.light.title',
      bodyKey: 'tours.duneBuggy.highlights.light.body',
    },
    {
      icon: 'lucideMapPin',
      titleKey: 'tours.duneBuggy.highlights.meet.title',
      bodyKey: 'tours.duneBuggy.highlights.meet.body',
    },
  ],
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
      time: '15:50',
      titleKey: 'tours.duneBuggy.itinerary.meet.title',
      bodyKey: 'tours.duneBuggy.itinerary.meet.body',
    },
    {
      time: '15:55',
      titleKey: 'tours.duneBuggy.itinerary.dunes.title',
      bodyKey: 'tours.duneBuggy.itinerary.dunes.body',
    },
    {
      time: '16:30',
      titleKey: 'tours.duneBuggy.itinerary.board.title',
      bodyKey: 'tours.duneBuggy.itinerary.board.body',
    },
    {
      time: '17:40',
      titleKey: 'tours.duneBuggy.itinerary.light.title',
      bodyKey: 'tours.duneBuggy.itinerary.light.body',
    },
    {
      time: '18:15',
      titleKey: 'tours.duneBuggy.itinerary.close.title',
      bodyKey: 'tours.duneBuggy.itinerary.close.body',
    },
  ],
  includedKeys: [
    'tours.duneBuggy.included.guide',
    'tours.duneBuggy.included.buggy',
    'tours.duneBuggy.included.board',
    'tours.duneBuggy.included.helmet',
  ],
  excludedKeys: [
    'tours.duneBuggy.excluded.meals',
    'tours.duneBuggy.excluded.standing',
  ],
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
