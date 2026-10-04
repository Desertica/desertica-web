import { IMAGE_LOADER } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { SmoothScroll } from '../../core/animation/smooth-scroll';
import { remoteImageLoader } from '../../core/images/remote-image-loader';
import { allowMotion, reduceMotion, stubMatchMedia } from '../../testing/match-media';
import { settleMotion } from '../../testing/settle-motion';
import { About } from './about';
import { AboutArchive } from './about-archive';

function box(node: Element, width: number, height: number): void {
  Object.defineProperty(node, 'offsetWidth', { configurable: true, value: width });
  Object.defineProperty(node, 'offsetHeight', { configurable: true, value: height });
}

function mobileMotion(query: string): boolean {
  if (query.includes('max-width')) {
    return true;
  }
  return query.includes('no-preference') || query.includes('min-width');
}

describe('About motion', () => {
  beforeEach(async () => {
    Object.defineProperty(window.HTMLMediaElement.prototype, 'pause', {
      configurable: true,
      value: () => undefined,
    });
    await TestBed.configureTestingModule({
      imports: [About, AboutArchive],
      providers: [
        provideRouter([]),
        provideSpartanHlm(),
        { provide: IMAGE_LOADER, useValue: remoteImageLoader },
      ],
    }).compileComponents();
  });

  afterEach(async () => {
    const { default: ScrollTrigger } = await import('gsap/ScrollTrigger');
    ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    document.querySelector('app-site-header')?.remove();
  });

  async function render(): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(About);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const stageWrap = root.querySelector('[data-map-stage-wrap]');
    const strip = root.querySelector('.about-archive-strip');
    const wrapper = root.querySelector('.about-archive-wrapper');
    const ica = root.querySelector('[data-ica]');
    if (stageWrap) {
      box(stageWrap, 120, 800);
    }
    if (strip) {
      Object.defineProperty(strip, 'scrollWidth', { configurable: true, value: 4000 });
    }
    if (wrapper) {
      box(wrapper, 800, 400);
    }
    if (ica) {
      Object.assign(ica, {
        getBBox: () => ({ x: 40, y: 80, width: 200, height: 50 }),
      });
    }
    const peru = root.querySelector('[data-peru]');
    if (peru) {
      const extra = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      extra.id = 'PE-UNKNOWN';
      peru.append(extra);
    }
    const bar = document.createElement('app-site-header');
    const header = document.createElement('header');
    header.getBoundingClientRect = () =>
      ({
        height: 64,
        width: 0,
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        toJSON: () => ({}),
      }) as DOMRect;
    bar.append(header);
    document.body.append(bar);
    return root;
  }

  it('builds the map and archive timelines when motion is allowed', async () => {
    stubMatchMedia(allowMotion);
    Object.defineProperty(window.HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: () => Promise.reject(new Error('blocked')),
    });
    TestBed.inject(SmoothScroll).markReady();
    const root = await render();
    await settleMotion();
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));

    const { default: ScrollTrigger } = await import('gsap/ScrollTrigger');
    const { default: gsap } = await import('gsap');
    const draw = ScrollTrigger.getById('about-map-draw');
    const whoIn = root.querySelector('[data-map-who-in]');
    const originIn = root.querySelector('[data-map-origin-in]');
    draw?.animation?.progress(0);
    expect(Number(gsap.getProperty(whoIn, 'opacity'))).toBe(0);
    expect(Number(gsap.getProperty(originIn, 'opacity'))).toBe(0);
    draw?.animation?.progress(0.75);
    expect(Number(gsap.getProperty(originIn, 'opacity'))).toBeGreaterThan(0.9);
    const pin = ScrollTrigger.getById('about-map-pin');
    pin?.animation?.progress(0.5);
    expect(root.querySelector('.about-map-svg')?.getAttribute('viewBox')).toBeTruthy();
  });

  it('draws the map while the stage is on screen when the viewport is narrow', async () => {
    stubMatchMedia(mobileMotion);
    TestBed.inject(SmoothScroll).markReady();
    const root = await render();
    await settleMotion();
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));

    const { default: ScrollTrigger } = await import('gsap/ScrollTrigger');
    const { default: gsap } = await import('gsap');
    const draw = ScrollTrigger.getById('about-map-draw-mobile');
    expect(draw?.trigger).toBe(root.querySelector('[data-map-stage-wrap]'));
    expect(ScrollTrigger.getById('about-map-pin')).toBeUndefined();
    draw?.animation?.progress(1);
    const ica = root.querySelector('[data-ica]');
    expect(Number(gsap.getProperty(ica, 'fillOpacity'))).toBeGreaterThan(0.1);
  });

  it('falls back when the map camera cannot be measured', async () => {
    stubMatchMedia(allowMotion);
    Object.defineProperty(window.HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: () => undefined,
    });
    TestBed.inject(SmoothScroll).markReady();
    const fixture = TestBed.createComponent(About);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const ica = root.querySelector('[data-ica]');
    if (ica) {
      Object.assign(ica, {
        getBBox: () => {
          throw new Error('no box');
        },
      });
    }
    await settleMotion();
    const { default: ScrollTrigger } = await import('gsap/ScrollTrigger');
    ScrollTrigger.getById('about-map-pin')?.animation?.progress(0.2);
    expect(root.querySelector('[data-map-who]')).not.toBeNull();
  });

  it('rests the map when the user prefers reduced motion', async () => {
    stubMatchMedia(reduceMotion);
    TestBed.inject(SmoothScroll).markReady();
    const fixture = TestBed.createComponent(About);
    await fixture.whenStable();
    await settleMotion();
    expect(fixture.nativeElement.querySelector('[data-hero-video]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-ica]')).not.toBeNull();
    const { default: gsap } = await import('gsap');
    const whoIn = fixture.nativeElement.querySelector('[data-map-who-in]');
    expect(Number(gsap.getProperty(whoIn, 'x')) || 0).toBe(0);
    expect(Number(gsap.getProperty(whoIn, 'opacity'))).toBe(1);
  });

  it('drops archive motion when the page is destroyed first', async () => {
    stubMatchMedia(allowMotion);
    const smooth = TestBed.inject(SmoothScroll);
    const fixture = TestBed.createComponent(AboutArchive);
    await fixture.whenStable();
    await settleMotion();
    fixture.destroy();
    smooth.markReady();
    await Promise.resolve();
  });
});
