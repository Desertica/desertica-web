import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject } from '@angular/core';
import { afterNextGsap } from '../../core/animation/gsap';
import { SmoothScroll } from '../../core/animation/smooth-scroll';
import { ABOUT_ARCHIVE_IMAGES } from './about-media';

const FRAME =
  'about-archive-frame bg-background surface-grain relative overflow-hidden box-border shrink-0 w-[68vw] sm:w-64';

const ARCHIVE_SIZES = [
  'h-56 md:h-[26rem] md:w-[22vw]',
  'h-72 md:h-[32rem] md:w-[28vw]',
  'h-52 md:h-[24rem] md:w-[20vw]',
  'h-64 md:h-[30rem] md:w-[26vw]',
  'h-56 md:h-[26rem] md:w-[22vw]',
  'h-60 md:h-[28rem] md:w-[24vw]',
] as const;

const ARCHIVE_FRAMES = ABOUT_ARCHIVE_IMAGES.map((image, index) => ({
  id: String(index + 1),
  class: `${FRAME} ${ARCHIVE_SIZES[index % ARCHIVE_SIZES.length]}`,
  image,
}));

@Component({
  selector: 'app-about-archive',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage],
  template: `
    <div
      class="about-archive-wrapper relative overflow-x-auto overscroll-x-contain md:flex md:flex-nowrap md:overflow-hidden"
    >
      <div
        class="about-archive-strip flex w-max items-end gap-3 will-change-transform md:w-auto md:flex-nowrap"
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
