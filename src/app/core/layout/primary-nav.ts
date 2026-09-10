export interface NavLink {
  labelKey: string;
  path: string;
  descriptionKey?: string;
}

export interface NavGroup {
  labelKey: string;
  path: string;
  children: readonly NavLink[];
}

export type NavItem = NavLink | NavGroup;

export function isNavGroup(item: NavItem): item is NavGroup {
  return 'children' in item;
}

export const primaryNavLinks: readonly NavItem[] = [
  {
    labelKey: 'nav.tours',
    path: '/tours',
    children: [
      {
        labelKey: 'nav.toursAll',
        path: '/tours',
        descriptionKey: 'nav.toursAllDesc',
      },
      {
        labelKey: 'nav.duneBuggy',
        path: '/experiences/dune-buggy',
        descriptionKey: 'nav.duneBuggyDesc',
      },
      {
        labelKey: 'nav.vineyardSunset',
        path: '/experiences/vineyard-sunset',
        descriptionKey: 'nav.vineyardSunsetDesc',
      },
      {
        labelKey: 'nav.oasisCamp',
        path: '/experiences/oasis-camp',
        descriptionKey: 'nav.oasisCampDesc',
      },
    ],
  },
  {
    labelKey: 'nav.packages',
    path: '/packages',
    children: [
      {
        labelKey: 'nav.packagesAll',
        path: '/packages',
        descriptionKey: 'nav.packagesAllDesc',
      },
      {
        labelKey: 'nav.huacachinaWeekend',
        path: '/experiences/huacachina-weekend',
        descriptionKey: 'nav.huacachinaWeekendDesc',
      },
      {
        labelKey: 'nav.sunsetWine',
        path: '/experiences/sunset-wine',
        descriptionKey: 'nav.sunsetWineDesc',
      },
      {
        labelKey: 'nav.oasisOvernight',
        path: '/experiences/oasis-overnight',
        descriptionKey: 'nav.oasisOvernightDesc',
      },
    ],
  },
  { labelKey: 'nav.about', path: '/about' },
  { labelKey: 'nav.contact', path: '/contact' },
];

export const planTripLink = {
  labelKey: 'nav.planTrip',
  path: '/reservations',
} as const;

export function packageChildren(): readonly NavLink[] {
  const group = primaryNavLinks.find((item) => isNavGroup(item) && item.path === '/packages');
  if (!group || !isNavGroup(group)) {
    return [];
  }

  return group.children;
}

export function packageGalleryItems(): readonly NavLink[] {
  return packageChildren().filter((child) => child.path !== '/packages');
}
