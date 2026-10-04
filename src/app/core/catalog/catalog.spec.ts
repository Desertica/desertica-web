import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { CMS_CONFIG, DEFAULT_CMS_CONFIG } from '../cms/cms-config';
import { CatalogService } from './catalog';
import { catalogTours } from './tours';

describe('CatalogService without a CMS', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), { provide: CMS_CONFIG, useValue: DEFAULT_CMS_CONFIG }],
    });
  });

  it('serves the bundled catalog and defaults', async () => {
    const catalog = TestBed.inject(CatalogService);
    await catalog.init();

    expect(catalog.enabled()).toBe(false);
    expect(catalog.tours().map((tour) => tour.id)).toEqual(catalogTours.map((tour) => tour.id));
    expect(catalog.featuredTours().every((tour) => tour.featured)).toBe(true);
    expect(catalog.resolvedTour('dune-buggy')?.page.highlights.length).toBeGreaterThan(0);
    expect(catalog.resolvedTour('nope')).toBeUndefined();
    expect(catalog.contact().whatsapp).toBe('https://wa.me/519XXXXXXXX');
    expect(catalog.mediaImage('tours.banner', 'fallback.jpg')).toBe('fallback.jpg');
    expect(catalog.posts()).toEqual([]);
    expect(catalog.footerDestinations().map((item) => item.all.path)).toEqual([
      '/nazca',
      '/huacachina',
      '/paracas',
    ]);
  });
});
