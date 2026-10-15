import { IMAGE_LOADER } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import type { RawEntry } from '../../../core/cms/cms-mapper';
import { DEFAULT_PUBLIC_CONFIG, PUBLIC_CONFIG } from '../../../core/config/public-config';
import { remoteImageLoader } from '../../../core/images/remote-image-loader';
import { SeoService } from '../../../core/seo/seo';
import { loadSnapshot, tourSnapshot } from '../../../testing/cms-snapshot';
import { stubMatchMedia } from '../../../testing/match-media';
import { TourDetail } from './tour-detail';

describe('TourDetail with CMS fields', () => {
  const mount = async (extra: RawEntry) => {
    stubMatchMedia(() => false);
    await TestBed.configureTestingModule({
      imports: [TourDetail],
      providers: [
        provideRouter([{ path: 'tours', children: [] }]),
        provideSpartanHlm(),
        { provide: IMAGE_LOADER, useValue: remoteImageLoader },
        { provide: PUBLIC_CONFIG, useValue: { ...DEFAULT_PUBLIC_CONFIG, siteUrl: 'https://desertica.pe' } },
      ],
    }).compileComponents();
    await loadSnapshot(TestBed, tourSnapshot(extra));
    const fixture = TestBed.createComponent(TourDetail);
    fixture.componentRef.setInput('id', 'dune-buggy');
    await fixture.whenStable();
    fixture.detectChanges();
    TestBed.inject(SeoService);
    TestBed.tick();
    return fixture.nativeElement as HTMLElement;
  };

  const documents = () =>
    Array.from(document.head.querySelectorAll('script[type="application/ld+json"]')).map((script) =>
      JSON.parse(script.textContent ?? '{}'),
    );

  afterEach(() => {
    document.head.querySelectorAll('script[type="application/ld+json"]').forEach((node) => node.remove());
  });

  it('renders the questions and publishes the same ones as FAQPage, with geo on the trip', async () => {
    const root = await mount({
      latitude: -14.0875,
      longitude: -75.7626,
      faqs: [{ question: 'Is it safe?', answer: 'Yes, with certified guides.' }],
    });

    expect(root.querySelector('app-tour-faqs summary')?.textContent).toContain('Is it safe?');
    expect(root.querySelector('app-tour-faqs details p')?.textContent).toContain('certified guides');
    const faq = documents().find((entry) => entry['@type'] === 'FAQPage');
    expect(faq?.mainEntity[0]).toEqual({
      '@type': 'Question',
      name: 'Is it safe?',
      acceptedAnswer: { '@type': 'Answer', text: 'Yes, with certified guides.' },
    });
    const trip = documents().find((entry) => entry['@type'] === 'TouristTrip');
    expect(trip?.itinerary).toEqual({
      '@type': 'Place',
      name: 'Plaza de Armas',
      geo: { '@type': 'GeoCoordinates', latitude: -14.0875, longitude: -75.7626 },
    });
  });

  it('links the meeting point to the CMS map link, or to a map search built from the coordinates', async () => {
    const withLink = await mount({ latitude: -14.1, longitude: -75.7, meetingPointUrl: 'https://maps.example/meet' });
    expect(withLink.querySelector('#tour-map-link')?.getAttribute('href')).toBe('https://maps.example/meet');
    expect(withLink.querySelector('#tour-map-link')?.getAttribute('rel')).toContain('noopener');
    TestBed.resetTestingModule();

    const byCoordinates = await mount({ latitude: -14.1, longitude: -75.7 });
    expect(byCoordinates.querySelector('#tour-map-link')?.getAttribute('href')).toBe(
      'https://www.google.com/maps/search/?api=1&query=-14.1,-75.7',
    );
  });

  it('adds nothing when the tour has no questions or coordinates', async () => {
    const root = await mount({});

    expect(root.querySelector('app-tour-faqs')).toBeNull();
    expect(root.querySelector('#tour-map-link')).toBeNull();
    expect(documents().some((entry) => entry['@type'] === 'FAQPage')).toBe(false);
    expect(documents().find((entry) => entry['@type'] === 'TouristTrip')).not.toHaveProperty('itinerary');
  });
});
