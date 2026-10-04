import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, provideRouter, Router, Scroll, withInMemoryScrolling } from '@angular/router';
import { stubMatchMedia } from '../../testing/match-media';
import { settleMotion } from '../../testing/settle-motion';
import { SmoothScroll } from './smooth-scroll';

describe('SmoothScroll', () => {
  const originalUserAgent = navigator.userAgent;

  afterEach(() => {
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: originalUserAgent,
    });
    document.getElementById('section')?.remove();
  });

  function setup(platform: 'browser' | 'server' = 'browser'): SmoothScroll {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [{ path: '**', children: [] }],
          withInMemoryScrolling({
            anchorScrolling: 'disabled',
            scrollPositionRestoration: 'disabled',
          }),
        ),
        { provide: PLATFORM_ID, useValue: platform },
      ],
    });
    return TestBed.inject(SmoothScroll);
  }

  it('resolves readiness once and ignores a second start', async () => {
    stubMatchMedia(() => false);
    const service = setup();
    const wrapper = document.createElement('div');
    const content = document.createElement('div');

    expect(service.active()).toBe(false);

    const ready = service.whenReady();
    service.markReady();
    service.markReady();
    await ready;

    service.start(wrapper, content);
    service.start(wrapper, content);
    await service.whenReady();
  });

  it('marks ready without creating a smoother on the server', async () => {
    const service = setup('server');
    service.start(document.createElement('div'), document.createElement('div'));
    await service.whenReady();

    expect(service.scrollToId('section')).toBe(false);
    service.scrollToFragmentWhenReady(null);
    service.scrollToFragmentWhenReady(undefined);
  });

  it('scrolls an element into view and retries until it exists', async () => {
    stubMatchMedia((query) => query.includes('prefers-reduced-motion: reduce'));
    const service = setup();
    service.markReady();

    expect(service.scrollToId('')).toBe(false);
    expect(service.scrollToId('missing')).toBe(false);

    const target = document.createElement('div');
    target.id = 'section';
    const scrollIntoView = vi.fn();
    target.scrollIntoView = scrollIntoView;
    document.body.append(target);

    expect(service.scrollToId('section')).toBe(true);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });

    stubMatchMedia(() => false);
    service.scrollToId('section');
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  });

  it('retries a fragment until the target is in the document', async () => {
    stubMatchMedia(() => false);
    const service = setup();
    service.scrollToFragmentWhenReady('section');

    await new Promise((resolve) => setTimeout(resolve, 0));
    const target = document.createElement('div');
    target.id = 'section';
    target.scrollIntoView = vi.fn();
    document.body.append(target);
    service.markReady();

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(target.scrollIntoView).toHaveBeenCalled();
  });

  it('jumps to the top on navigation instead of smoothing the whole page', () => {
    stubMatchMedia(() => false);
    const service = setup();
    service.markReady();
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    const end = new NavigationEnd(1, '/about', '/about');
    const scroll = service as unknown as { onRouterScroll(event: Scroll): void };

    scroll.onRouterScroll(new Scroll(end, null, null));

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' });
    scrollTo.mockClear();

    scroll.onRouterScroll(new Scroll(end, [0, 640], null));
    expect(scrollTo).toHaveBeenCalledWith({ top: 640, left: 0, behavior: 'auto' });

    scrollTo.mockRestore();
  });

  it('creates a smoother outside jsdom and resets on navigation', async () => {
    stubMatchMedia((query) => query.includes('pointer: coarse') && !query.includes('max-width'));
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0',
    });

    const service = setup();
    const wrapper = document.createElement('div');
    const content = document.createElement('div');
    wrapper.append(content);
    document.body.append(wrapper);

    service.start(wrapper, content);
    await settleMotion();
    await service.whenReady();

    const router = TestBed.inject(Router);
    await router.navigateByUrl('/tours#section');
    await router.navigateByUrl('/about');

    expect(service.active()).toBe(true);
    wrapper.remove();
  });

  it('skips the smoother when motion is reduced and keeps it on a narrow touch screen', async () => {
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0',
    });
    stubMatchMedia((query) => query.includes('prefers-reduced-motion: reduce'));
    const reduced = setup();
    reduced.start(document.createElement('div'), document.createElement('div'));
    await reduced.whenReady();
    expect(reduced.active()).toBe(false);

    TestBed.resetTestingModule();
    stubMatchMedia(
      (query) => query.includes('pointer: coarse') || query.includes('max-width: 767px'),
    );
    const coarse = setup();
    const wrapper = document.createElement('div');
    const content = document.createElement('div');
    wrapper.append(content);
    document.body.append(wrapper);
    coarse.start(wrapper, content);
    await settleMotion();
    await coarse.whenReady();
    expect(coarse.active()).toBe(true);
    wrapper.remove();
  });
});
