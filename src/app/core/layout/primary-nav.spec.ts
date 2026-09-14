import { isNavGroup, primaryNavLinks, toursNavColumns } from './primary-nav';

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
  });
});
