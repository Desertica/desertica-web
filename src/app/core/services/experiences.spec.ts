import { TestBed } from '@angular/core/testing';
import { ExperiencesService } from './experiences';

describe('ExperiencesService', () => {
  let service: ExperiencesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExperiencesService);
  });

  it('returns the catalog of desert experiences', () => {
    const catalog = service.list();
    expect(catalog.length).toBeGreaterThan(0);
    expect(catalog.every((item) => item.slug && item.name && item.priceFrom > 0)).toBe(true);
  });

  it('finds an experience by slug', () => {
    const experience = service.getBySlug('huacachina-dune-buggy');
    expect(experience?.name).toBe('Huacachina dune buggy');
    expect(experience?.location).toContain('Ica');
  });

  it('returns undefined for an unknown slug', () => {
    expect(service.getBySlug('missing-tour')).toBeUndefined();
  });
});
