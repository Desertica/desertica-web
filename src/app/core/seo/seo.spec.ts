import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { DEFAULT_PUBLIC_CONFIG, PUBLIC_CONFIG } from '../config/public-config';
import { I18nService } from '../i18n/i18n';
import { SeoService } from './seo';

const head = (selector: string): Element | null => document.head.querySelector(selector);
const content = (selector: string): string | null | undefined =>
  head(selector)?.getAttribute('content');

describe('SeoService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        { provide: PUBLIC_CONFIG, useValue: { ...DEFAULT_PUBLIC_CONFIG, siteUrl: 'https://desertica.pe' } },
      ],
    });
  });

  afterEach(() => {
    document.head.querySelectorAll('link[rel="canonical"], link[hreflang], script[type="application/ld+json"]').forEach((node) => node.remove());
  });

  const navigate = async (url: string) => {
    await TestBed.inject(Router).navigateByUrl(url);
  };

  it('writes canonical, hreflang, Open Graph and Twitter tags for the current route', async () => {
    const seo = TestBed.inject(SeoService);
    await navigate('/tours/dune-buggy');
    seo.setPage({}, {
      title: 'Dune buggy',
      description: 'Ride the dunes',
      image: '/a.jpg',
      breadcrumbs: [{ name: 'Tours', path: '/tours' }],
    });
    TestBed.tick();

    expect(document.title).toBe('Dune buggy | Desértica | Tours and experiences in Ica');
    expect(head('link[rel="canonical"]')?.getAttribute('href')).toBe('https://desertica.pe/tours/dune-buggy');
    const alternates = Array.from(document.head.querySelectorAll('link[rel="alternate"][hreflang]')).map(
      (link) => [link.getAttribute('hreflang'), link.getAttribute('href')],
    );
    expect(alternates).toEqual([
      ['en', 'https://desertica.pe/tours/dune-buggy'],
      ['es', 'https://desertica.pe/tours/dune-buggy?lang=es'],
      ['x-default', 'https://desertica.pe/tours/dune-buggy'],
    ]);
    expect(content('meta[name="description"]')).toBe('Ride the dunes');
    expect(content('meta[property="og:title"]')).toContain('Dune buggy');
    expect(content('meta[property="og:url"]')).toBe('https://desertica.pe/tours/dune-buggy');
    expect(content('meta[property="og:image"]')).toBe('https://desertica.pe/a.jpg');
    expect(content('meta[property="og:locale"]')).toBe('en_US');
    expect(content('meta[property="og:locale:alternate"]')).toBe('es_PE');
    expect(content('meta[name="twitter:card"]')).toBe('summary_large_image');
    expect(content('meta[name="twitter:image"]')).toBe('https://desertica.pe/a.jpg');
    expect(content('meta[name="robots"]')).toBe('index, follow');
  });

  it('emits Organization and BreadcrumbList JSON-LD plus the page documents', async () => {
    const seo = TestBed.inject(SeoService);
    await navigate('/tours/dune-buggy');
    seo.setPage({}, {
      title: 'Dune buggy',
      breadcrumbs: [{ name: 'Tours', path: '/tours' }],
      jsonLd: [{ '@context': 'https://schema.org', '@type': 'TouristTrip', name: 'Dune buggy' }],
    });
    TestBed.tick();

    const documents = Array.from(
      document.head.querySelectorAll('script[type="application/ld+json"]'),
    ).map((script) => JSON.parse(script.textContent ?? '{}'));
    expect(documents.map((entry) => entry['@type'])).toEqual([
      'TravelAgency',
      'BreadcrumbList',
      'TouristTrip',
    ]);
    expect(documents[0].url).toBe('https://desertica.pe');
    expect(documents[0]).not.toHaveProperty('email');
    expect(documents[1].itemListElement.map((item: { name: string }) => item.name)).toEqual([
      'Home',
      'Tours',
      'Dune buggy',
    ]);
  });

  it('switches canonical and og:locale with the language and drops the page on clear', async () => {
    const seo = TestBed.inject(SeoService);
    const owner = {};
    await navigate('/tours');
    seo.setPage(owner, { title: 'Tours', noindex: true });
    TestBed.inject(I18nService).setLocale('es');
    TestBed.tick();

    expect(head('link[rel="canonical"]')?.getAttribute('href')).toBe('https://desertica.pe/tours?lang=es');
    expect(content('meta[property="og:locale"]')).toBe('es_PE');
    expect(content('meta[name="robots"]')).toBe('noindex, nofollow');

    seo.clearPage(owner);
    TestBed.tick();
    expect(content('meta[name="robots"]')).toBe('index, follow');
    expect(document.title).toBe('Desértica | Tours y experiencias en Ica');
  });

  it('falls back to the browser origin when SITE_URL is not set', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PUBLIC_CONFIG, useValue: DEFAULT_PUBLIC_CONFIG },
      ],
    });
    TestBed.inject(SeoService);
    TestBed.tick();
    expect(head('link[rel="canonical"]')?.getAttribute('href')).toMatch(/^http:\/\/localhost/);
  });
});
