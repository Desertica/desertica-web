import { TOURS_PATH, tourDestinations } from '../catalog/tours';

export interface NavLink {
  labelKey: string;
  path: string;
  fragment?: string;
  descriptionKey?: string;
}

export interface NavColumn {
  headingKey: string;
  path: string;
  fragment: string;
  children: readonly NavLink[];
}

export interface NavGroup {
  labelKey: string;
  path: string;
  children: readonly NavLink[];
  columns?: readonly NavColumn[];
}

export type NavItem = NavLink | NavGroup;

export function isNavGroup(item: NavItem): item is NavGroup {
  return 'children' in item;
}

export function navItemTrack(item: Pick<NavLink, 'path' | 'fragment'>): string {
  return item.fragment ? `${item.path}#${item.fragment}` : item.path;
}

const toursNavGroup: NavGroup = {
  labelKey: 'nav.tours',
  path: TOURS_PATH,
  children: [
    {
      labelKey: 'nav.toursAll',
      path: TOURS_PATH,
      descriptionKey: 'nav.toursAllDesc',
    },
  ],
  columns: tourDestinations.map((destination) => ({
    headingKey: destination.titleKey,
    path: TOURS_PATH,
    fragment: destination.id,
    children: destination.tours.map((tour) => ({
      labelKey: tour.titleKey,
      path: TOURS_PATH,
      fragment: tour.id,
      descriptionKey: tour.descriptionKey,
    })),
  })),
};

export const primaryNavLinks: readonly NavItem[] = [
  toursNavGroup,
  { labelKey: 'nav.products', path: '/products' },
  { labelKey: 'nav.about', path: '/about' },
  { labelKey: 'nav.contact', path: '/contact' },
];

export const planTripLink = {
  labelKey: 'nav.planTrip',
  path: '/reservations',
} as const;

export function toursNavColumns(): readonly NavColumn[] {
  return toursNavGroup.columns ?? [];
}
