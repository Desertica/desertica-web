import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject } from '@angular/core';
import { afterNextGsap } from '../../core/animation/gsap';
import { SmoothScroll } from '../../core/animation/smooth-scroll';
import { ABOUT_ARCHIVE_IMAGES } from './about-media';

const FRAME =
  'about-archive-frame bg-muted surface-grain relative overflow-hidden box-border shrink-0 max-md:w-full';

const ARCHIVE_FRAMES = [
  { id: '1', class: `${FRAME} h-56 md:h-[26rem] md:w-[22vw]`, image: ABOUT_ARCHIVE_IMAGES[0] },
  { id: '2', class: `${FRAME} h-72 md:h-[32rem] md:w-[28vw]`, image: ABOUT_ARCHIVE_IMAGES[1] },
  { id: '3', class: `${FRAME} h-52 md:h-[24rem] md:w-[20vw]`, image: ABOUT_ARCHIVE_IMAGES[2] },
  { id: '4', class: `${FRAME} h-64 md:h-[30rem] md:w-[26vw]`, image: ABOUT_ARCHIVE_IMAGES[3] },
  { id: '5', class: `${FRAME} h-56 md:h-[26rem] md:w-[22vw]`, image: ABOUT_ARCHIVE_IMAGES[4] },
  { id: '6', class: `${FRAME} h-60 md:h-[28rem] md:w-[24vw]`, image: ABOUT_ARCHIVE_IMAGES[5] },
] as const;

@Component({
  selector: 'app-about-archive',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage],
  template: `
    <div
      class="about-archive-wrapper relative overflow-hidden max-md:overflow-visible md:flex md:flex-nowrap"
    >
      <div
        class="about-archive-strip flex will-change-transform max-md:flex-col max-md:gap-3 md:flex-nowrap md:items-end md:gap-3"
      >
        @for (frame of frames; track frame.id) {
          <div [class]="frame.class">
            <img
              [ngSrc]="frame.image"
              fill
              sizes="(min-width: 768px) 28vw, 100vw"
              alt=""
              class="rounded-none object-cover"
            />
          </div>
        }
      </div>
    </div>
  `,
})
export class AboutArchive {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly smooth = inject(SmoothScroll);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly frames = ARCHIVE_FRAMES;

  constructor() {
    let cancelled = false;
    this.destroyRef.onDestroy(() => {
      cancelled = true;
    });

    afterNextGsap((gsap, { ScrollTrigger }) => {
      const wrapper = this.host.nativeElement.querySelector('.about-archive-wrapper');
      const strip = this.host.nativeElement.querySelector('.about-archive-strip');
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
