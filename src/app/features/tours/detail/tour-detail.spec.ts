import { IMAGE_LOADER } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { remoteImageLoader } from '../../../core/images/remote-image-loader';
import { TourDetail } from './tour-detail';

describe('TourDetail', () => {
  beforeEach(async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
        onchange: null,
      }),
    });

    await TestBed.configureTestingModule({
      imports: [TourDetail],
      providers: [
        provideRouter([{ path: 'tours', children: [] }]),
        provideSpartanHlm(),
        { provide: IMAGE_LOADER, useValue: remoteImageLoader },
      ],
    }).compileComponents();
  });

  it('renders the dune-buggy page blocks', async () => {
    const fixture = TestBed.createComponent(TourDetail);
    fixture.componentRef.setInput('id', 'dune-buggy');
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('h1')?.textContent).toContain('Dune buggy');
    expect(compiled.textContent).toContain('Ride the Huacachina dunes');
    expect(compiled.textContent).toContain('Lorem ipsum dolor sit amet');
    expect(compiled.textContent).not.toContain('What the day includes');
    expect(compiled.textContent).toContain('How we run it');
    expect(compiled.textContent).toContain('The day');
    expect(compiled.textContent).not.toContain('15:50');
    expect(compiled.textContent).toContain('Book');
    expect(compiled.textContent).not.toContain('Book on WhatsApp');
    expect(compiled.textContent).toContain('Included');
    expect(compiled.textContent).toContain('Details');
    expect(compiled.textContent).toContain('Video coming soon');
    expect(compiled.textContent).not.toContain('On the dunes');
    const heading = compiled.querySelector('app-tour-heading');
    const gallery = compiled.querySelector('app-tour-gallery');
    const book = compiled.querySelector('app-tour-book');
    const videos = compiled.querySelector('app-tour-videos');
    expect(heading).not.toBeNull();
    expect(gallery).not.toBeNull();
    expect(book).not.toBeNull();
    expect(videos).not.toBeNull();
    expect(
      heading!.compareDocumentPosition(gallery!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(book!.compareDocumentPosition(videos!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const features = compiled.querySelector('app-tour-features');
    const timeline = compiled.querySelector('app-tour-timeline');
    const details = compiled.querySelector('app-tour-full-details');
    expect(features).not.toBeNull();
    expect(timeline).not.toBeNull();
    expect(details).not.toBeNull();
    expect(
      timeline!.compareDocumentPosition(features!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      timeline!.compareDocumentPosition(videos!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      details!.compareDocumentPosition(videos!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(features!.querySelector('[data-slot=card]')).toBeNull();
    expect(features!.querySelector('section')?.className).toContain('bg-muted');
    expect(compiled.querySelectorAll('app-tour-gallery img').length).toBeGreaterThanOrEqual(3);
    expect(compiled.querySelectorAll('app-tour-videos article').length).toBe(2);
    expect(compiled.querySelectorAll('app-tour-timeline img').length).toBe(5);
    expect(compiled.querySelector('app-tour-timeline img')?.getAttribute('sizes')).toContain(
      '9rem',
    );
    expect(compiled.querySelector('app-tour-portraits')).toBeNull();
    expect(compiled.querySelector('a[href="/tours"]')).not.toBeNull();
    expect(compiled.textContent).toContain('Secure your spot');
    expect(compiled.textContent).toContain('Free cancellation');
    expect(compiled.textContent).toContain('Final prices');
    const download = compiled.querySelector('a[href="/tours/dune-buggy-itinerary.pdf"]');
    expect(download?.textContent).toContain('Download itinerary');
    expect(download?.querySelector('ng-icon')).not.toBeNull();
    expect(compiled.textContent).not.toContain('Plan your trip');
    expect(
      book!.compareDocumentPosition(download!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(TestBed.inject(Title).getTitle()).toContain('Dune buggy');
  });

  it('redirects unknown ids to the catalog', async () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(TourDetail);
    fixture.componentRef.setInput('id', 'nope');
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith('/tours');
  });
});
