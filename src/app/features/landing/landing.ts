import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  effect,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import { afterNextGsap } from '../../core/animation/gsap';
import { SmoothScroll } from '../../core/animation/smooth-scroll';
import { I18nService } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { HorizGallery } from '../../core/layout/horiz-gallery';
import { planTripLink } from '../../core/layout/primary-nav';
import { WordmarkSvg } from './wordmark-svg';

const INTRO_KEY = 'desertica-intro';
const OLIVE = '#5a6b3e';
const WHITE = '#ffffff';
const REST_SCALE = 0.72;

@Component({
  selector: 'app-landing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe, HlmButton, WordmarkSvg, HorizGallery],
  templateUrl: './landing.html',
  styleUrl: './landing.css',
})
export class Landing {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly smooth = inject(SmoothScroll);
  private readonly destroyRef = inject(DestroyRef);
  private readonly motionReady = signal(false);
  private bindWhy: (() => void) | undefined;

  protected readonly i18n = inject(I18nService);
  protected readonly planTrip = planTripLink;

  constructor() {
    let cancelled = false;
    this.destroyRef.onDestroy(() => {
      cancelled = true;
    });

    effect(() => {
      this.i18n.locale();
      if (!this.motionReady()) {
        return;
      }

      requestAnimationFrame(() => this.bindWhy?.());
    });

    afterNextGsap(
      (gsap, { ScrollTrigger, SplitText }) => {
        const hero = this.host.nativeElement.querySelector('[data-hero]');
        const stage = this.host.nativeElement.querySelector('.wordmark-stage');
        const wordmark = this.host.nativeElement.querySelector('.wordmark-svg');
        const copy = this.host.nativeElement.querySelector('[data-hero-copy]');
        if (
          !(hero instanceof HTMLElement) ||
          !(stage instanceof HTMLElement) ||
          !(wordmark instanceof SVGElement) ||
          !(copy instanceof HTMLElement)
        ) {
          return;
        }

        const marks = wordmark.querySelectorAll('#bird, #dune-1, #dune-2');
        const letters = wordmark.querySelectorAll('.letter, .accent');
        const counters = wordmark.querySelectorAll('.counter');
        const draws = wordmark.querySelectorAll('.draw');
        const header = document.querySelector('app-site-header');

        const paintRest = () => {
          gsap.set([marks, letters], {
            drawSVG: '100%',
            fill: 'currentColor',
            stroke: 'currentColor',
          });
          gsap.set(counters, { drawSVG: '100%', fill: OLIVE, stroke: OLIVE });
          gsap.set(stage, { opacity: 1, scale: REST_SCALE });
          gsap.set(copy, { autoAlpha: 1, y: 0 });
          if (header) {
            gsap.set(header, { autoAlpha: 1 });
          }
          hero.classList.remove('hero-intro');
          document.documentElement.dataset['intro'] = 'done';
        };

        let whySplit: { revert: () => void; words: Element[] } | undefined;
        let whyTween: { kill: () => void; scrollTrigger?: { kill: () => void } } | undefined;

        this.bindWhy = () => {
          whyTween?.scrollTrigger?.kill();
          whyTween?.kill();
          whySplit?.revert();
          whySplit = undefined;
          whyTween = undefined;

          const whyHeadline = this.host.nativeElement.querySelector('[data-why-headline]');
          if (!(whyHeadline instanceof HTMLElement) || !SplitText) {
            return;
          }

          whyHeadline.textContent = this.i18n.t('home.whyHeadline');
          if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return;
          }

          whySplit = new SplitText(whyHeadline, { type: 'words,lines' });
          whyTween = gsap.from(whySplit.words, {
            y: 24,
            autoAlpha: 0,
            duration: 0.7,
            stagger: 0.04,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: whyHeadline,
              start: 'top 80%',
              toggleActions: 'play none none reverse',
            },
          });
        };

        return gsap.context(() => {
          const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          const playIntro = !reduced && this.shouldPlayIntro();

          if (!playIntro) {
            paintRest();
          } else {
            hero.classList.add('hero-intro');
            gsap.set(copy, { autoAlpha: 0, y: 16 });
            if (header) {
              gsap.set(header, { autoAlpha: 0 });
            }
            gsap.set(draws, { drawSVG: 0, fill: 'transparent', stroke: WHITE });
            gsap.set(stage, { autoAlpha: 1, scale: 1 });
            document.documentElement.dataset['intro'] = 'playing';

            const bird = wordmark.querySelector('#bird');
            const dune2 = wordmark.querySelector('#dune-2');
            const dune1 = wordmark.querySelector('#dune-1');

            const tl = gsap.timeline({
              defaults: { ease: 'power1.inOut' },
              onComplete: () => {
                if (cancelled) {
                  return;
                }
                this.rememberIntro();
                void this.smooth.whenReady().then(() => ScrollTrigger.refresh());
              },
            });

            if (bird) {
              tl.fromTo(bird, { drawSVG: 0 }, { drawSVG: '100%', duration: 2.4 });
            }
            if (dune2) {
              tl.fromTo(dune2, { drawSVG: 0 }, { drawSVG: '100%', duration: 1.15 }, '-=0.55');
            }
            if (dune1) {
              tl.fromTo(dune1, { drawSVG: 0 }, { drawSVG: '100%', duration: 1.25 }, '-=0.95');
            }

            tl.to(marks, { fill: WHITE, duration: 0.65, ease: 'power1.out' }, '-=0.2')
              .fromTo(letters, { drawSVG: 0 }, { drawSVG: '100%', duration: 0.7, stagger: 0.08 }, '-=0.1')
              .fromTo(
                counters,
                { drawSVG: 0 },
                { drawSVG: '100%', duration: 0.45, stagger: 0.12 },
                '-=0.55',
              )
              .to(letters, { fill: WHITE, duration: 0.4, stagger: 0.05, ease: 'power1.out' }, '-=0.35')
              .to(counters, { fill: OLIVE, stroke: OLIVE, duration: 0.35, ease: 'none' }, '-=0.35')
              .add(() => {
                hero.classList.remove('hero-intro');
                document.documentElement.dataset['intro'] = 'done';
              })
              .to(
                [marks, letters],
                { fill: 'currentColor', stroke: 'currentColor', duration: 0.6, ease: 'power2.out' },
                '<',
              )
              .to(stage, { scale: REST_SCALE, duration: 0.8, ease: 'power2.inOut' }, '<')
              .to(copy, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power2.out' }, '-=0.35');

            if (header) {
              tl.to(header, { autoAlpha: 1, duration: 0.5, ease: 'power2.out' }, '-=0.5');
            }
          }

          this.motionReady.set(true);
        }, this.host.nativeElement);
      },
      { morphSvg: false, drawSvg: true, splitText: true },
    );
  }

  private shouldPlayIntro(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }
    try {
      return sessionStorage.getItem(INTRO_KEY) !== '1';
    } catch {
      return false;
    }
  }

  private rememberIntro(): void {
    try {
      sessionStorage.setItem(INTRO_KEY, '1');
    } catch {
      return;
    }
  }
}
