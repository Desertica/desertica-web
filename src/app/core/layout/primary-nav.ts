import { type CatalogDestination, TOURS_PATH, tourDestinations, tourPath } from '../catalog/tours';

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

export function buildPrimaryNavLinks(destinations: readonly CatalogDestination[]): readonly NavItem[] {
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
    columns: destinations.map((destination) => ({
      headingKey: destination.titleKey,
      path: TOURS_PATH,
      fragment: destination.id,
      children: destination.tours.map((tour) => ({
        labelKey: tour.titleKey,
        path: tourPath(tour.id),
        descriptionKey: tour.descriptionKey,
      })),
    })),
  };

  return [
    toursNavGroup,
    { labelKey: 'nav.products', path: '/products' },
    { labelKey: 'nav.about', path: '/about' },
    { labelKey: 'nav.contact', path: '/contact' },
  ];
}

export const primaryNavLinks: readonly NavItem[] = buildPrimaryNavLinks(tourDestinations);

export const planTripLink = {
  labelKey: 'nav.planTrip',
  path: '/reservations',
} as const;

export function toursNavColumns(links: readonly NavItem[] = primaryNavLinks): readonly NavColumn[] {
  const group = links.find((item): item is NavGroup => isNavGroup(item) && item.path === TOURS_PATH);
  return group?.columns ?? [];
}
