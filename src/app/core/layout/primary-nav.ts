import { type CatalogDestination, TOURS_PATH, tourDestinations, tourPath } from '../catalog/tours';
import type { CmsNavLink } from '../cms/cms-models';

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

/**
 * Header items. `cmsLinks` (from Strapi) decides the order, labels and paths; the item marked
 * `tours-menu` gets its dropdown from the destinations. Without it the static list is used.
 */
export function buildPrimaryNavLinks(
  destinations: readonly CatalogDestination[],
  cmsLinks?: readonly CmsNavLink[],
): readonly NavItem[] {
  const toursGroup = (labelKey: string, path: string): NavGroup => ({
    labelKey,
    path,
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
  });

  if (cmsLinks?.length) {
    return cmsLinks.map((link): NavItem =>
      link.kind === 'tours-menu'
        ? toursGroup(link.labelKey, link.path)
        : { labelKey: link.labelKey, path: link.path, fragment: link.fragment },
    );
  }

  return [
    toursGroup('nav.tours', TOURS_PATH),
    { labelKey: 'nav.products', path: '/products' },
    { labelKey: 'nav.about', path: '/about' },
    { labelKey: 'nav.contact', path: '/contact' },
  ];
}

export const primaryNavLinks: readonly NavItem[] = buildPrimaryNavLinks(tourDestinations);

/** Desktop visual order is LTR (Tours … Contact). Mobile stacks the same items top→bottom as desktop right→left. */
export const mobilePrimaryNavLinks: readonly NavItem[] = [...primaryNavLinks].reverse();

export const planTripLink = {
  labelKey: 'nav.planTrip',
  path: TOURS_PATH,
} as const;

export function toursNavColumns(links: readonly NavItem[] = primaryNavLinks): readonly NavColumn[] {
  const group = links.find((item): item is NavGroup => isNavGroup(item) && item.path === TOURS_PATH);
  return group?.columns ?? [];
}
