import { TestBed } from '@angular/core/testing';
import { stubMatchMedia } from '../../testing/match-media';
import { IntroService } from '../animation/intro';
import { settleMotion } from '../../testing/settle-motion';
import { INTRO_FAILSAFE_MS } from '../animation/wordmark-intro';
import { IntroOverlay } from './intro-overlay';

describe('IntroOverlay', () => {
  const realSetTimeout = window.setTimeout;

  beforeEach(() => {
    stubMatchMedia(() => false);
    sessionStorage.removeItem('desertica-intro');
    document.documentElement.dataset['intro'] = 'pending';
  });

  afterEach(() => {
    window.setTimeout = realSetTimeout;
    document.documentElement.dataset['intro'] = 'done';
    sessionStorage.removeItem('desertica-intro');
  });

  it('draws the wordmark and completes when the timeline finishes', async () => {
    await TestBed.configureTestingModule({ imports: [IntroOverlay] }).compileComponents();
    const fixture = TestBed.createComponent(IntroOverlay);
    await fixture.whenStable();
    await settleMotion();

    const { default: gsap } = await import('gsap');
    gsap.globalTimeline.timeScale(50);
    gsap.globalTimeline.progress(1);

    const intro = TestBed.inject(IntroService);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(intro.status()).toBe('done');
    expect(fixture.nativeElement.getAttribute('aria-label')).toBe('Loading Desértica');
    fixture.destroy();
  });

  it('completes immediately when the wordmark is missing', async () => {
    await TestBed.configureTestingModule({ imports: [IntroOverlay] }).compileComponents();
    const fixture = TestBed.createComponent(IntroOverlay);
    await fixture.whenStable();
    fixture.nativeElement.querySelector('.wordmark-svg')?.remove();
    await settleMotion();

    expect(TestBed.inject(IntroService).status()).toBe('done');
    fixture.destroy();
  });

  it('completes from the failsafe timer and cancels it on destroy', async () => {
    const pending: Array<() => void> = [];
    window.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
      if (timeout === INTRO_FAILSAFE_MS && typeof handler === 'function') {
        pending.push(() => handler(...args));
        return 0;
      }
      return realSetTimeout(handler, timeout, ...args);
    }) as typeof window.setTimeout;

    await TestBed.configureTestingModule({ imports: [IntroOverlay] }).compileComponents();
    const fixture = TestBed.createComponent(IntroOverlay);
    await fixture.whenStable();

    expect(pending.length).toBeGreaterThan(0);
    pending[0]?.();
    expect(TestBed.inject(IntroService).status()).toBe('done');

    fixture.destroy();
  });
});
