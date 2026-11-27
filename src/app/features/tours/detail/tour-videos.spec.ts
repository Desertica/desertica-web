import { IMAGE_LOADER } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { remoteImageLoader } from '../../../core/images/remote-image-loader';
import { TourVideos } from './tour-videos';

describe('TourVideos', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TourVideos],
      providers: [{ provide: IMAGE_LOADER, useValue: remoteImageLoader }],
    }).compileComponents();
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

    fixture.destroy();
    vi.unstubAllGlobals();
  });
});
