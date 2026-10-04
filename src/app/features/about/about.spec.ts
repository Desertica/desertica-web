import { IMAGE_LOADER } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { remoteImageLoader } from '../../core/images/remote-image-loader';
import { ABOUT_POSTER, ABOUT_TRIO_IMAGE, About } from './about';

describe('About', () => {
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

    Object.defineProperty(window.HTMLMediaElement.prototype, 'play', {
      writable: true,
      configurable: true,
      value: () => Promise.resolve(),
    });
    Object.defineProperty(window.HTMLMediaElement.prototype, 'pause', {
      writable: true,
      configurable: true,
      value: () => undefined,
    });

    await TestBed.configureTestingModule({
      imports: [About],
      providers: [
        provideRouter([]),
        provideSpartanHlm(),
        { provide: IMAGE_LOADER, useValue: remoteImageLoader },
      ],
    }).compileComponents();
  });

  it('renders a full-bleed still hero with the page title and lead', async () => {
    const fixture = TestBed.createComponent(About);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('[data-hero-copy] h1')?.textContent?.trim()).toBe(
      'The desert is the destination, not the shortcut.',
    );
    expect(compiled.querySelector('h1')?.getAttribute('aria-label')).toBeNull();
    expect(compiled.querySelector('[data-hero-title]')).toBeNull();
    expect(compiled.textContent).toContain('Three owners. Based in Ica.');
    expect(compiled.textContent).not.toContain('SSG');
    expect(compiled.textContent).not.toContain('Story later');
    expect(compiled.textContent).not.toContain('Trujillo');

    const overlay = compiled.querySelector('.about-banner-overlay');
    expect(overlay).not.toBeNull();
    expect(overlay?.className).toContain('items-center');
    expect(overlay?.className).toContain('justify-end');
    expect(overlay?.querySelector('h1')).not.toBeNull();

    const poster = compiled.querySelector('img[src*="sand-poster"]');
    expect(poster).not.toBeNull();
    expect(poster?.getAttribute('sizes')).toBe('100vw');
    expect(compiled.querySelector('[data-hero-video]')).toBeNull();
    expect(compiled.querySelector('video')).toBeNull();
    expect(ABOUT_POSTER).toContain('sand-poster.jpg');

    const hero = compiled.querySelector('[data-hero]');
    expect(hero?.className).toContain('min-h-[calc(100dvh-var(--header-h))]');
    expect(hero?.className).toContain('w-full');
    expect(poster?.className).toContain('object-[center_65%]');
    expect(poster?.closest('.max-w-6xl')).toBeNull();
  });

  it('renders the Ica map, trio photo, three columns, craft cells, archive, and a tours closer', async () => {
    const fixture = TestBed.createComponent(About);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('[data-quote]')).toBeNull();
    expect(compiled.querySelector('[data-ribbon]')).toBeNull();
    expect(compiled.querySelector('[data-manifesto]')).toBeNull();
    expect(compiled.querySelector('[data-motiva-beat]')).toBeNull();
    const scene = compiled.querySelector('[data-map-scene]');
    expect(scene?.querySelector('[data-map-who]')).not.toBeNull();
    expect(scene?.querySelector('[data-map-who-in]')).not.toBeNull();
    expect(scene?.querySelector('[data-map-origin]')).not.toBeNull();
    expect(scene?.querySelector('[data-map-origin-in]')).not.toBeNull();
    expect(compiled.textContent).toContain('Who we are');
    expect(compiled.textContent).toContain("Ica isn't a place you pass through.");
    expect(compiled.querySelector('[data-map-kicker]')).not.toBeNull();
    expect(compiled.textContent).not.toContain('This is the beginning.');
    expect(compiled.querySelector('[data-map-scene]')?.className).toContain(
      'min-h-[calc(100svh-var(--header-h))]',
    );
    expect(compiled.querySelector('[data-map-scene]')?.className).toContain('bg-background');
    expect(compiled.querySelector('[data-map-layer]')).not.toBeNull();
    expect(compiled.querySelector('[data-map-stage]')).not.toBeNull();
    expect(compiled.querySelector('.about-map-frame')).toBeNull();
    expect(compiled.innerHTML).not.toContain('max-h-[28rem]');
    expect(compiled.querySelector('[data-ica]')).not.toBeNull();
    expect(compiled.querySelector('[data-map-label]')).toBeNull();
    expect(compiled.querySelector('[data-peru]')).not.toBeNull();
    expect(compiled.querySelector('.about-map-svg')?.getAttribute('viewBox')).toBe(
      '0 0 542.76703 792',
    );
    expect(compiled.querySelector('#PE-ICA')).not.toBeNull();
    expect(compiled.querySelector('#PE-LIM')).not.toBeNull();
    expect(compiled.textContent).toContain('The day is built here.');
    expect(compiled.textContent).toContain('The three of us, Huacachina');
    expect(compiled.textContent).toContain('The archive fills as we go out.');
    expect(compiled.textContent).not.toContain('Trujillo');

    const trio = compiled.querySelector('[data-trio]');
    expect(trio?.className).toContain('bg-background');
    expect(trio?.querySelector('.about-banner-overlay')?.className).toContain('z-10');
    expect(trio?.closest('[data-map-scene]')).not.toBeNull();
    const trioPhoto = trio?.querySelector('img');
    expect(trioPhoto?.getAttribute('src')).toContain('photo-1527736848781');
    expect(ABOUT_TRIO_IMAGE).toContain('photo-1527736848781-72dc3b2ee00f');

    expect(compiled.querySelectorAll('[data-motiva-col]').length).toBe(3);
    expect(compiled.textContent).toContain('Drive');
    expect(compiled.textContent).toContain('Commitment');
    expect(compiled.textContent).toContain('Momentum');

    expect(compiled.querySelectorAll('[data-craft-cell]').length).toBe(3);
    expect(compiled.textContent).toContain('Meeting point');
    expect(compiled.textContent).toContain('Format');
    expect(compiled.textContent).toContain('Language');

    expect(compiled.querySelectorAll('.about-archive-frame').length).toBe(12);
    expect(compiled.querySelectorAll('.about-archive-frame img').length).toBe(12);
    expect(compiled.querySelector('.about-archive-frame')?.className).toContain('bg-background');

    expect(compiled.textContent).toContain('Shall we build your day?');
    const closer = compiled.querySelector('app-photo-cta');
    expect(closer?.querySelector('section')?.className).toContain('h-[500px]');
    const closerCta = closer?.querySelector('a[href="/tours"]');
    expect(closerCta).not.toBeNull();
    expect(closerCta?.textContent?.trim()).toBe('Tours');
    expect(closerCta?.className).toContain('pointer-events-auto');
    const closerOverlay = closer?.querySelector('.photo-cta-overlay');
    expect(closerOverlay?.className).toContain('z-10');
    expect(closer?.querySelector('.about-banner-overlay')).toBeNull();
  });
});
