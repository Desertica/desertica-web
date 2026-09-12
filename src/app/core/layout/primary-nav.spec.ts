import { isNavGroup, primaryNavLinks, toursNavColumns } from './primary-nav';

describe('primary nav', () => {
  it('groups tours by destination on /tours fragments', () => {
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
      toursNavColumns().flatMap((column) => column.children.map((item) => item.fragment)),
    ).toEqual([
      'dune-buggy',
      'oasis-overnight',
      'huacachina-weekend',
      'paracas-buggy',
      'ballestas',
      'paracas-reserve',
      'nazca-lines',
      'nazca-flight',
      'nazca-cantalloc',
    ]);
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
