import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { afterNextGsap } from '../animation/gsap';
import { SmoothScroll } from '../animation/smooth-scroll';
import { featuredTours, tourPath } from '../catalog/tours';
import { TourCard } from './tour-card';

@Component({
  selector: 'app-horiz-gallery',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TourCard],
  template: `
    <div
      class="horiz-gallery-wrapper relative overflow-hidden max-md:overflow-visible md:flex md:flex-nowrap"
    >
      <div
        class="horiz-gallery-strip flex will-change-transform max-md:flex-col max-md:gap-3 md:flex-nowrap md:gap-3"
      >
        @for (slide of slides; track slide.id) {
          <a
            [routerLink]="detailPath(slide.id)"
            class="horiz-gallery-item box-border block shrink-0 max-md:w-full md:w-[33vw]"
          >
            <app-tour-card [tour]="slide" />
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
  protected readonly slides = featuredTours;
  protected readonly detailPath = tourPath;

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
            let lastTravel = 0;
            const travel = () => {
              const width = strip.scrollWidth;
              const view = wrapper.offsetWidth || window.innerWidth;
              if (width < view) {
                return lastTravel;
              }
              lastTravel = width - view;
              return lastTravel;
            };

            gsap.to(strip, {
              x: () => -travel(),
              ease: 'none',
              scrollTrigger: {
                trigger: wrapper,
                pin: wrapper,
                start: 'center center',
                end: () => `+=${travel()}`,
                scrub: true,
                invalidateOnRefresh: true,
              },
            });

            ScrollTrigger.refresh();
          });
        }, this.host.nativeElement);
      });

      return {
        revert: () => inner?.revert(),
      };
    }, { morphSvg: false });
  }
}
