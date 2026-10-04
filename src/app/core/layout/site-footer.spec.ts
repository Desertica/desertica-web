import { IMAGE_LOADER } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { toast } from '@spartan-ng/brain/sonner';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { remoteImageLoader } from '../images/remote-image-loader';
import { allowMotion, stubMatchMedia } from '../../testing/match-media';
import { settleMotion } from '../../testing/settle-motion';
import { SmoothScroll } from '../animation/smooth-scroll';
import { SiteFooter } from './site-footer';

vi.mock('@spartan-ng/brain/sonner', () => ({
  toast: vi.fn(),
}));

describe('SiteFooter', () => {
  beforeEach(async () => {
    vi.mocked(toast).mockClear();
    stubMatchMedia(allowMotion);
    localStorage.removeItem('locale');
    await TestBed.configureTestingModule({
      imports: [SiteFooter],
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        provideSpartanHlm(),
        { provide: IMAGE_LOADER, useValue: remoteImageLoader },
      ],
    }).compileComponents();
  });

  afterEach(async () => {
    const { default: ScrollTrigger } = await import('gsap/ScrollTrigger');
    ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
  });

  it('rejects an empty newsletter address and thanks a valid one', async () => {
    const fixture = TestBed.createComponent(SiteFooter);
    await fixture.whenStable();
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    const input = fixture.nativeElement.querySelector('input[type="email"]') as HTMLInputElement;

    const submit = form.querySelector('button[type="submit"]') as HTMLButtonElement;
    submit.click();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Enter a valid email.');
    expect(toast).not.toHaveBeenCalled();

    input.value = 'ada@example.com';
    input.dispatchEvent(new Event('input'));
    submit.click();
    await fixture.whenStable();

    expect(toast).toHaveBeenCalled();
    expect(input.value).toBe('');
  });

  it('bounces the footer rule from scroll velocity and refreshes after navigation', async () => {
    TestBed.inject(SmoothScroll).markReady();
    const fixture = TestBed.createComponent(SiteFooter);
    await fixture.whenStable();
    await settleMotion();

    const { default: ScrollTrigger } = await import('gsap/ScrollTrigger');
    const trigger = ScrollTrigger.getAll().find((item) => item.vars?.onEnter);
    const onEnter = trigger?.vars.onEnter as ((self: { getVelocity: () => number }) => void) | undefined;
    onEnter?.({ getVelocity: () => 10 });
    onEnter?.({ getVelocity: () => 4000 });

    const router = TestBed.inject(Router);
    await router.navigateByUrl('/tours');
    fixture.destroy();
  });

  it('ignores the bounce setup after the footer is destroyed', async () => {
    const smooth = TestBed.inject(SmoothScroll);
    const fixture = TestBed.createComponent(SiteFooter);
    await fixture.whenStable();
    await settleMotion();
    fixture.destroy();
    smooth.markReady();
    await Promise.resolve();
  });
});
