import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { afterNextGsap } from '../animation/gsap';
import { SmoothScroll } from '../animation/smooth-scroll';
import { catalogTours, TOURS_PATH } from '../catalog/tours';
import { I18nService } from '../i18n/i18n';
import { TranslatePipe } from '../i18n/translate-pipe';

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
        @for (slide of slides; track slide.id) {
          <a
            [routerLink]="toursPath"
            [fragment]="slide.id"
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
  protected readonly slides = catalogTours;
  protected readonly toursPath = TOURS_PATH;

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
