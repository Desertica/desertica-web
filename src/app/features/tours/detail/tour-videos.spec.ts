import { IMAGE_LOADER } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { tourPage } from '../../../core/catalog/tour-pages';
import { tourById } from '../../../core/catalog/tours';
import { remoteImageLoader } from '../../../core/images/remote-image-loader';
import { TourVideos } from './tour-videos';

describe('TourVideos', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TourVideos],
      providers: [{ provide: IMAGE_LOADER, useValue: remoteImageLoader }],
    }).compileComponents();
  });

  it('renders two vertical posters without a player', async () => {
    const tour = tourById('dune-buggy');
    expect(tour).toBeDefined();
    if (!tour) {
      return;
    }

    const fixture = TestBed.createComponent(TourVideos);
    fixture.componentRef.setInput('clips', tourPage(tour).videos);
    fixture.componentRef.setInput('title', 'Dune buggy');
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    const frames = compiled.querySelectorAll('article');
    expect(frames.length).toBe(2);
    for (const frame of Array.from(frames)) {
      expect(frame.className).toContain('aspect-[9/16]');
    }
    const images = compiled.querySelectorAll('img');
    expect(images.length).toBe(2);
    for (const image of Array.from(images)) {
      expect(image.className).toContain('rounded-none');
    }
    expect(compiled.textContent).toContain('Video coming soon');
    expect(compiled.querySelector('video')).toBeNull();
    expect(compiled.querySelector('button')).toBeNull();
    expect(compiled.querySelector('[data-slot=card]')).toBeNull();
  });

  it('plays a clip, pauses when it ends, and stops when it leaves the viewport', async () => {
    const observed: IntersectionObserverCallback[] = [];
    class FakeObserver implements IntersectionObserver {
      readonly root = null;
      readonly rootMargin = '';
      readonly thresholds = [];
      constructor(private readonly callback: IntersectionObserverCallback) {
        observed.push(callback);
      }
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
      takeRecords(): IntersectionObserverEntry[] {
        return [];
      }
    }
    vi.stubGlobal('IntersectionObserver', FakeObserver);
    Object.defineProperty(window.HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: () => Promise.reject(new Error('blocked')),
    });
    Object.defineProperty(window.HTMLMediaElement.prototype, 'pause', {
      configurable: true,
      value: () => undefined,
    });

    const fixture = TestBed.createComponent(TourVideos);
    fixture.componentRef.setInput('clips', [
      { poster: '/clips/a.jpg', webm: '/clips/a.webm', mp4: '/clips/a.mp4' },
      { poster: '/clips/b.jpg', webm: '/clips/b.webm' },
      { poster: '/clips/c.jpg' },
    ]);
    fixture.componentRef.setInput('title', 'Dune buggy');
    await fixture.whenStable();

    const play = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(play.getAttribute('aria-label')).toContain('Dune buggy');
    play.click();
    await fixture.whenStable();

    const video = fixture.nativeElement.querySelector('video') as HTMLVideoElement;
    expect(video).not.toBeNull();
    expect(video.querySelector('source[type="video/webm"]')).not.toBeNull();
    expect(video.querySelector('source[type="video/mp4"]')).not.toBeNull();
    await new Promise((resolve) => setTimeout(resolve, 0));

    video.dispatchEvent(new Event('ended'));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('video')).toBeNull();

    (fixture.nativeElement.querySelectorAll('button')[1] as HTMLButtonElement).click();
    await fixture.whenStable();
    observed[0]?.([{ isIntersecting: false } as IntersectionObserverEntry], new FakeObserver(() => undefined));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('video')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Video coming soon');

    fixture.destroy();
    vi.unstubAllGlobals();
  });
});
