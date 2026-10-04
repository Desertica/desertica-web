import { tourDestinations } from '../catalog/tours';
import {
  buildPrimaryNavLinks,
  isNavGroup,
  mobilePrimaryNavLinks,
  navItemTrack,
  primaryNavLinks,
  toursNavColumns,
} from './primary-nav';

describe('primary nav', () => {
  it('groups tours by destination and links each tour to its page', () => {
    const tours = primaryNavLinks.find((item) => isNavGroup(item) && item.path === '/tours');
    expect(tours && isNavGroup(tours)).toBe(true);
    if (!tours || !isNavGroup(tours)) {
      return;
    }

    expect(tours.children.map((item) => item.path)).toEqual(['/tours']);
    expect(toursNavColumns().map((column) => column.fragment)).toEqual([
      'huacachina',
      'paracas',
      'nazca',
    ]);
    expect(
      toursNavColumns().flatMap((column) => column.children.map((item) => item.path)),
    ).toEqual([
      '/tours/dune-buggy',
      '/tours/oasis-overnight',
      '/tours/huacachina-weekend',
      '/tours/sandboard',
      '/tours/ica-vineyards',
      '/tours/oasis-walk',
      '/tours/paracas-buggy',
      '/tours/ballestas',
      '/tours/paracas-reserve',
      '/tours/paracas-sunset',
      '/tours/nazca-lines',
      '/tours/nazca-flight',
      '/tours/nazca-cantalloc',
      '/tours/cahuachi',
      '/tours/maria-reiche',
    ]);
    expect(
      toursNavColumns()
        .flatMap((column) => column.children)
        .every((item) => item.fragment === undefined),
    ).toBe(true);
  });

  it('exposes products as a leaf and drops packages', () => {
    expect(primaryNavLinks.map((item) => item.path)).toEqual([
      '/tours',
      '/products',
      '/about',
      '/contact',
    ]);
    expect(primaryNavLinks.some((item) => item.path === '/packages')).toBe(false);
    expect(navItemTrack({ path: '/products' })).toBe('/products');
    expect(navItemTrack({ path: '/tours', fragment: 'nazca' })).toBe('/tours#nazca');
  });

  it('stacks mobile links top-to-bottom as desktop visual right-to-left', () => {
    expect(primaryNavLinks.map((item) => item.path)).toEqual([
      '/tours',
      '/products',
      '/about',
      '/contact',
    ]);
    expect(mobilePrimaryNavLinks.map((item) => item.path)).toEqual([
      '/contact',
      '/about',
      '/products',
      '/tours',
    ]);
    expect(isNavGroup(mobilePrimaryNavLinks[3]!)).toBe(true);
  });
});

describe('primary nav from CMS links', () => {
  it('orders items as configured and builds the dropdown from destinations', () => {
    const links = buildPrimaryNavLinks(tourDestinations, [
      { labelKey: 'cms.nav.header.0.label', path: '/about', kind: 'link' },
      { labelKey: 'cms.nav.header.1.label', path: '/tours', kind: 'tours-menu' },
    ]);

    expect(links.map((item) => item.path)).toEqual(['/about', '/tours']);
    const tours = links[1];
    expect(tours && isNavGroup(tours) && tours.labelKey).toBe('cms.nav.header.1.label');
    expect(toursNavColumns(links)).toHaveLength(tourDestinations.length);
  });

  it('falls back to the static list when the CMS has no links', () => {
    expect(buildPrimaryNavLinks(tourDestinations, []).map((item) => item.path)).toEqual(
      primaryNavLinks.map((item) => item.path),
    );
  });
});
