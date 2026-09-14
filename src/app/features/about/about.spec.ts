import { IMAGE_LOADER } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { remoteImageLoader } from '../../core/images/remote-image-loader';
import { ABOUT_POSTER, ABOUT_TRIO_IMAGE, ABOUT_VIDEO_MP4, ABOUT_VIDEO_WEBM, About } from './about';

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

  it('renders a full-bleed cinemagraph hero with the page title and lead', async () => {
    const fixture = TestBed.createComponent(About);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('h1')?.textContent?.trim()).toBe(
      'The desert is the destination, not the shortcut.',
    );
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

    const video = compiled.querySelector('[data-hero-video]');
    expect(video).not.toBeNull();
    expect(video?.getAttribute('aria-hidden')).toBe('true');
    expect(video?.className).toContain('opacity-0');
    expect(compiled.querySelector(`source[src="${ABOUT_VIDEO_WEBM}"]`)).not.toBeNull();
    expect(compiled.querySelector(`source[src="${ABOUT_VIDEO_MP4}"]`)).not.toBeNull();
    expect(ABOUT_POSTER).toContain('sand-poster.jpg');

    expect(compiled.querySelector('[data-hero]')?.className).toContain('w-full');
    expect(poster?.closest('.max-w-6xl')).toBeNull();
  });

  it('renders the Ica map, trio photo, three columns, craft cells, archive, and a tours closer', async () => {
    const fixture = TestBed.createComponent(About);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('[data-quote]')?.className).not.toContain('min-h-[min(80svh,32rem)]');
    expect(compiled.querySelector('[data-quote]')?.className).toContain('pb-24');
    expect(compiled.querySelector('[data-ribbon]')?.className).toBe('about-ribbon');
    expect(compiled.querySelector('[data-map-kicker]')).not.toBeNull();
    expect(compiled.querySelectorAll('[data-ribbon-unit]').length).toBe(3);
    expect(compiled.textContent).toContain('Ica · Huacachina · Paracas · Nazca');
    expect(compiled.querySelector('.about-quote-plate-a')).not.toBeNull();
    expect(compiled.querySelector('.about-quote-plate-b')).not.toBeNull();
    expect(compiled.textContent).toContain('This is the beginning.');
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
    expect(trio?.className).toContain('bg-muted');
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

    expect(compiled.querySelectorAll('.about-archive-frame').length).toBe(6);
    expect(compiled.querySelectorAll('.about-archive-frame img').length).toBe(6);
    expect(compiled.querySelector('.about-archive-frame')?.className).toContain('bg-muted');

    expect(compiled.textContent).toContain('Shall we build your day?');
    const closerCta = compiled.querySelector('a[href="/tours"]');
    expect(closerCta).not.toBeNull();
    expect(closerCta?.textContent?.trim()).toBe('Tours');
    expect(closerCta?.className).toContain('pointer-events-auto');
    const closerOverlay = closerCta?.closest('section')?.querySelector('.about-banner-overlay');
    expect(closerOverlay?.className).toContain('z-10');
  });
});
