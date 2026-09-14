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
    expect(compiled.textContent).toContain('What the day includes');
    expect(compiled.textContent).toContain('How we run it');
    expect(compiled.textContent).toContain('The day');
    expect(compiled.textContent).toContain('15:50');
    expect(compiled.textContent).toContain('Book');
    expect(compiled.textContent).not.toContain('Book on WhatsApp');
    expect(compiled.textContent).toContain('Included');
    expect(compiled.textContent).toContain('On the dunes');
    const heading = compiled.querySelector('app-tour-heading');
    const gallery = compiled.querySelector('app-tour-gallery');
    expect(heading).not.toBeNull();
    expect(gallery).not.toBeNull();
    expect(
      heading!.compareDocumentPosition(gallery!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(compiled.querySelectorAll('app-tour-gallery img').length).toBeGreaterThanOrEqual(3);
    expect(compiled.querySelector('app-tour-portraits .max-w-xl')).not.toBeNull();
    expect(compiled.querySelector('app-tour-portraits .aspect-\\[9\\/16\\]')).not.toBeNull();
    expect(compiled.querySelector('a[href="/tours"]')).not.toBeNull();
    expect(compiled.querySelector('#tour-date')).not.toBeNull();
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
