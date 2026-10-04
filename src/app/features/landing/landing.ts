import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmAspectRatioImports } from '@spartan-ng/helm/aspect-ratio';
import { HlmButton, buttonVariants } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { afterNextGsap } from '../../core/animation/gsap';
import { IntroService } from '../../core/animation/intro';
import { PlanTripHover } from '../../core/animation/plan-trip-hover';
import { SmoothScroll } from '../../core/animation/smooth-scroll';
import { CatalogService } from '../../core/catalog/catalog';
import {
  appendWordmarkDraw,
  prepareWordmarkDraw,
  queryWordmark,
} from '../../core/animation/wordmark-intro';
import { HOME_HERO_IMAGE } from '../../core/catalog/tours';
import { I18nService } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { HorizGallery } from '../../core/layout/horiz-gallery';
import { planTripLink } from '../../core/layout/primary-nav';
import { WordmarkSvg } from '../../core/layout/wordmark-svg';

@Component({
  selector: 'app-landing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    TranslatePipe,
    HlmButton,
    HlmCardImports,
    HlmAspectRatioImports,
    NgOptimizedImage,
    WordmarkSvg,
    HorizGallery,
    PlanTripHover,
  ],
  templateUrl: './landing.html',
  styleUrl: './landing.css',
})
export class Landing {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly intro = inject(IntroService);
  private readonly smooth = inject(SmoothScroll);
  private readonly destroyRef = inject(DestroyRef);
  private readonly motionReady = signal(false);
  private bindWhy: (() => void) | undefined;
  private bindClose: (() => void) | undefined;

  protected readonly i18n = inject(I18nService);
  protected readonly planTrip = planTripLink;
  private readonly catalog = inject(CatalogService);
  protected readonly heroImage = this.catalog.mediaImage('home.hero', HOME_HERO_IMAGE);
  protected readonly destinations = this.catalog.destinations;
  protected readonly destRatio = 4 / 5;
  protected readonly reserveBtnClass = `${buttonVariants({ size: 'lg' })} w-fit self-start`;
  protected readonly pitchBeats = [
    'home.pitchBeat1',
    'home.pitchBeat2',
    'home.pitchBeat3',
  ] as const;

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

      requestAnimationFrame(() => {
        this.bindWhy?.();
        this.bindClose?.();
      });
    });

    afterNextGsap(
      (gsap, { ScrollTrigger, SplitText }) => {
        const hero = this.host.nativeElement.querySelector('[data-hero]');
        const stage = this.host.nativeElement.querySelector('.wordmark-stage');
        const wordmark = this.host.nativeElement.querySelector('.wordmark-svg');
        const photo = this.host.nativeElement.querySelector('[data-hero-photo]');
        const copy = this.host.nativeElement.querySelector('[data-hero-copy]');
        if (
          !(hero instanceof HTMLElement) ||
          !(stage instanceof HTMLElement) ||
          !(wordmark instanceof SVGElement) ||
          !(photo instanceof HTMLElement) ||
          !(copy instanceof HTMLElement)
        ) {
          return;
        }

        const parts = queryWordmark(wordmark);
        const header = document.querySelector('app-site-header');
        const fab = document.querySelector('app-whatsapp-fab');
        const chrome = [header, fab].filter((el): el is Element => el instanceof Element);

        const paintPhotoRest = () => {
          stage.classList.add('hero-rest');
          gsap.set(stage, { autoAlpha: 0 });
          gsap.set(photo, { autoAlpha: 1 });
          gsap.set(copy, { autoAlpha: 1, y: 0 });
          if (chrome.length) {
            gsap.set(chrome, { autoAlpha: 1 });
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
            stagger: 0.04,
            ease: 'none',
            scrollTrigger: {
              trigger: whyHeadline,
              start: 'top 75%',
              end: 'bottom 60%',
              scrub: true,
            },
          });
        };

        let closeSplit: { revert: () => void; words: Element[] } | undefined;
        let closeTween: { kill: () => void; scrollTrigger?: { kill: () => void } } | undefined;

        this.bindClose = () => {
          closeTween?.scrollTrigger?.kill();
          closeTween?.kill();
          closeSplit?.revert();
          closeSplit = undefined;
          closeTween = undefined;

          const pitch = this.host.nativeElement.querySelector('[data-pitch]');
          const headline = this.host.nativeElement.querySelector('[data-pitch-headline]');
          const beats = this.host.nativeElement.querySelectorAll('[data-pitch-beat]');
          if (!(pitch instanceof HTMLElement) || !(headline instanceof HTMLElement) || !SplitText) {
            return;
          }

          headline.textContent = this.i18n.t('home.pitchHeadline');
          if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return;
          }

          closeSplit = new SplitText(headline, { type: 'words,lines' });
          closeTween = gsap
            .timeline({
              scrollTrigger: {
                trigger: pitch,
                start: 'top 75%',
                end: 'bottom 60%',
                scrub: true,
              },
            })
            .from(closeSplit.words, {
              y: 24,
              autoAlpha: 0,
              stagger: 0.04,
              ease: 'none',
            })
            .from(
              beats,
              {
                y: 20,
                autoAlpha: 0,
                stagger: 0.1,
                ease: 'none',
              },
              0.35,
            );
        };

        return gsap.context(() => {
          const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          const playIntro = !reduced && this.intro.shouldPlay();

          if (!playIntro) {
            paintPhotoRest();
          } else {
            stage.classList.remove('hero-rest');
            hero.classList.add('hero-intro');
            prepareWordmarkDraw(gsap, parts, { stage, copy, header, fab });
            gsap.set(photo, { autoAlpha: 0 });
            this.intro.markPlaying();

            const tl = gsap.timeline({
              defaults: { ease: 'power1.inOut' },
              onComplete: () => {
                if (cancelled) {
                  return;
                }
                void this.smooth.whenReady().then(() => ScrollTrigger.refresh());
              },
            });

            appendWordmarkDraw(tl, parts);
            tl.add(() => {
              stage.classList.add('hero-rest');
            })
              .to(stage, { autoAlpha: 0, duration: 0.45, ease: 'power2.inOut' })
              .to(photo, { autoAlpha: 1, duration: 0.7, ease: 'power2.out' })
              .to(copy, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power2.out' }, '<')
              .add(() => {
                hero.classList.remove('hero-intro');
                this.intro.complete();
              });

            if (chrome.length) {
              tl.to(chrome, { autoAlpha: 1, duration: 0.5, ease: 'power2.out' }, '-=0.5');
            }
          }

          this.motionReady.set(true);
        }, this.host.nativeElement);
      },
      { morphSvg: false, drawSvg: true, splitText: true },
    );
  }
}
