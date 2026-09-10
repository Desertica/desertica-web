import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { afterNextGsap } from '../animation/gsap';
import { SmoothScroll } from '../animation/smooth-scroll';
import { I18nService } from '../i18n/i18n';
import { TranslatePipe } from '../i18n/translate-pipe';

type GallerySlide = {
  path: string;
  image: string;
  titleKey: string;
  durationHours: number;
  priceFrom: number;
};

const PACKAGE_PATHS = [
  '/packages',
  '/experiences/huacachina-weekend',
  '/experiences/sunset-wine',
  '/experiences/oasis-overnight',
] as const;

const GALLERY_SLIDES: readonly GallerySlide[] = [
  {
    path: PACKAGE_PATHS[0],
    image:
      'https://images.unsplash.com/photo-1547234935-80c7145ec969?auto=format&fit=crop&w=1200&h=1200&q=80',
    titleKey: 'gallery.slides.quadSunset',
    durationHours: 17,
    priceFrom: 145,
  },
  {
    path: PACKAGE_PATHS[1],
    image:
      'https://images.unsplash.com/photo-1473580044384-7ba9967e16a0?auto=format&fit=crop&w=1200&h=1200&q=80',
    titleKey: 'gallery.slides.huacachinaWeekend',
    durationHours: 48,
    priceFrom: 289,
  },
  {
    path: PACKAGE_PATHS[2],
    image:
      'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=1200&h=1200&q=80',
    titleKey: 'gallery.slides.vineyardSunset',
    durationHours: 8,
    priceFrom: 95,
  },
  {
    path: PACKAGE_PATHS[3],
    image:
      'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?auto=format&fit=crop&w=1200&h=1200&q=80',
    titleKey: 'gallery.slides.oasisOvernight',
    durationHours: 24,
    priceFrom: 210,
  },
  {
    path: PACKAGE_PATHS[0],
    image:
      'https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?auto=format&fit=crop&w=1200&h=1200&q=80',
    titleKey: 'gallery.slides.duneBuggy',
    durationHours: 4,
    priceFrom: 79,
  },
  {
    path: PACKAGE_PATHS[1],
    image:
      'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&h=1200&q=80',
    titleKey: 'gallery.slides.sunriseWalk',
    durationHours: 3,
    priceFrom: 65,
  },
  {
    path: PACKAGE_PATHS[2],
    image:
      'https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&w=1200&h=1200&q=80',
    titleKey: 'gallery.slides.goldenHour',
    durationHours: 6,
    priceFrom: 88,
  },
  {
    path: PACKAGE_PATHS[3],
    image:
      'https://images.unsplash.com/photo-1451337516015-6b6e9a44a8a3?auto=format&fit=crop&w=1200&h=1200&q=80',
    titleKey: 'gallery.slides.campfireNight',
    durationHours: 12,
    priceFrom: 175,
  },
];

@Component({
  selector: 'app-horiz-gallery',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe, HlmCardImports, NgOptimizedImage],
  styleUrl: './horiz-gallery.css',
  template: `
    <div
      class="horiz-gallery-wrapper relative overflow-hidden max-md:overflow-visible md:flex md:flex-nowrap"
    >
      <div
        class="horiz-gallery-strip flex will-change-transform max-md:flex-col max-md:gap-4 md:flex-nowrap"
      >
        @for (slide of slides; track $index) {
          <a
            [routerLink]="slide.path"
            class="horiz-gallery-item box-content shrink-0 md:w-[33vw] md:p-8 max-md:box-border max-md:w-full max-md:p-0"
          >
            <section hlmCard class="relative">
              <img
                [ngSrc]="slide.image"
                width="1200"
                height="1200"
                sizes="(min-width: 768px) 33vw, 100vw"
                alt=""
                class="aspect-square w-full object-cover"
              />
              <div
                class="horiz-gallery-overlay pointer-events-none absolute inset-0 flex flex-col justify-between p-6 md:p-8"
              >
                <div class="flex max-w-[18rem] flex-col items-start gap-3">
                  <p class="text-xs font-medium tracking-[0.22em] uppercase">
                    {{ slide.durationHours }} {{ 'gallery.hours' | translate: i18n.locale() }}
                  </p>
                  <span class="block h-px w-8 bg-current" aria-hidden="true"></span>
                  <h3 hlmCardTitle>
                    {{ slide.titleKey | translate: i18n.locale() }}
                  </h3>
                </div>
                <div class="flex flex-col items-start gap-1">
                  <p class="text-xs font-medium tracking-[0.22em] uppercase">
                    {{ 'gallery.from' | translate: i18n.locale() }}
                  </p>
                  <p class="font-heading text-2xl tracking-wide">
                    {{ 'gallery.currency' | translate: i18n.locale() }} {{ slide.priceFrom }}
                  </p>
                </div>
              </div>
            </section>
          </a>
        }
      </div>
    </div>
  `,
})
export class HorizGallery {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly smooth = inject(SmoothScroll);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly i18n = inject(I18nService);
  protected readonly slides = GALLERY_SLIDES;

  constructor() {
    let cancelled = false;
    this.destroyRef.onDestroy(() => {
      cancelled = true;
    });

    afterNextGsap((gsap, { ScrollTrigger }) => {
      const wrapper = this.host.nativeElement.querySelector('.horiz-gallery-wrapper');
      const strip = this.host.nativeElement.querySelector('.horiz-gallery-strip');
      if (!(wrapper instanceof HTMLElement) || !(strip instanceof HTMLElement)) {
        return;
      }

      let inner: { revert: () => void } | undefined;

      void this.smooth.whenReady().then(() => {
        if (cancelled) {
          return;
        }

        const mq = '(min-width: 768px) and (prefers-reduced-motion: no-preference)';

        inner = gsap.context(() => {
          const mm = gsap.matchMedia();
          mm.add(mq, () => {
            let pinWrapWidth = 0;
            let horizontalScrollLength = 0;
            const refresh = () => {
              pinWrapWidth = strip.scrollWidth;
              horizontalScrollLength = pinWrapWidth - window.innerWidth;
            };
            refresh();

            gsap.to(strip, {
              x: () => -horizontalScrollLength,
              ease: 'none',
              scrollTrigger: {
                trigger: wrapper,
                pin: wrapper,
                start: 'center center',
                end: () => `+=${pinWrapWidth}`,
                scrub: true,
                invalidateOnRefresh: true,
              },
            });

            ScrollTrigger.addEventListener('refreshInit', refresh);
            ScrollTrigger.refresh();

            return () => ScrollTrigger.removeEventListener('refreshInit', refresh);
          });
        }, this.host.nativeElement);
      });

      return {
        revert: () => inner?.revert(),
      };
    }, { morphSvg: false });
  }
}
