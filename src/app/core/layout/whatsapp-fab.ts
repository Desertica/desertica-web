import { ChangeDetectionStrategy, Component, ElementRef, inject } from '@angular/core';
import { afterNextGsapUi } from '../animation/gsap-ui';
import { I18nService } from '../i18n/i18n';
import { TranslatePipe } from '../i18n/translate-pipe';
import { footerContact } from './footer-nav';

type TipTimeline = {
  timeScale: (value: number) => TipTimeline;
  play: () => TipTimeline;
  reverse: () => TipTimeline;
};

@Component({
  selector: 'app-whatsapp-fab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  host: {
    class: 'fixed right-6 bottom-6 z-50 inline-flex',
  },
  template: `
    <a
      class="relative inline-flex focus-visible:ring-ring rounded-full focus-visible:ring-2 focus-visible:outline-none"
      [href]="href"
      target="_blank"
      rel="noopener noreferrer"
      [attr.aria-label]="'a11y.whatsapp' | translate: i18n.locale()"
      [attr.aria-describedby]="tooltipId"
      (pointerenter)="play()"
      (pointerleave)="reverse()"
      (focusin)="play()"
      (focusout)="reverse()"
    >
      <span
        class="whatsapp-target inline-flex size-16 origin-center items-center justify-center overflow-hidden rounded-full text-white shadow-lg"
        style="background-color: #25d366"
        aria-hidden="true"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 720" fill="currentColor" class="size-[60%]">
          <path
            d="M360,0C161.18,0,0,161.18,0,360c0,65.41,17.45,126.75,47.94,179.61L0,720l187.02-44.21c51.34,28.18,110.28,44.21,172.98,44.21,198.82,0,360-161.18,360-360S558.82,0,360,0ZM360,655.52c-60.17,0-116.13-17.98-162.82-48.87l-110.49,28.14,30.99-105.61c-33.53-47.93-53.2-106.26-53.2-169.19,0-163.21,132.31-295.52,295.52-295.52s295.52,132.31,295.52,295.52-132.31,295.52-295.52,295.52Z"
          />
          <path
            d="M444.35,407.52l87.1,41.06c4,1.88,6.56,5.94,6.2,10.34-.94,11.46-5.54,34.43-26.13,55.02-58.12,58.12-162.49-7.64-166.74-10.18-25.67-13.79-50.06-32.24-73.19-55.36s-41.58-47.52-55.37-73.19c-2.55-4.24-68.31-108.61-10.18-166.74,20.59-20.59,43.56-25.19,55.02-26.13,4.41-.36,8.46,2.2,10.34,6.2l41.07,87.1c1.94,4.12,1.09,9.02-2.13,12.24l-30.61,30.61c-6.62,6.62-8.56,16.93-4,25.11,11.17,20.03,26.19,39.32,43.59,57.07,17.75,17.4,37.04,32.43,57.07,43.59,8.18,4.56,18.48,2.62,25.11-4l30.61-30.61c3.22-3.22,8.12-4.08,12.24-2.13Z"
          />
        </svg>
      </span>
      <span
        [id]="tooltipId"
        role="tooltip"
        class="whatsapp-bubble bg-popover text-popover-foreground after:border-t-popover pointer-events-none invisible absolute right-0 bottom-[calc(100%+14px)] origin-bottom-right rounded-md px-4 py-1.5 text-sm whitespace-nowrap opacity-0 after:absolute after:top-full after:right-3 after:border-[6px] after:border-solid after:border-transparent after:content-['']"
      >
        {{ 'whatsapp.tooltip' | translate: i18n.locale() }}
      </span>
    </a>
  `,
})
export class WhatsappFab {
  private readonly host = inject(ElementRef<HTMLElement>);
  private timeline: TipTimeline | undefined;
  private showInstant: ((visible: boolean) => void) | undefined;

  protected readonly i18n = inject(I18nService);
  protected readonly href = footerContact.whatsapp;
  protected readonly tooltipId = 'whatsapp-fab-tooltip';

  constructor() {
    afterNextGsapUi((gsap) => {
      const root = this.host.nativeElement;
      const bubble = root.querySelector('.whatsapp-bubble');
      const target = root.querySelector('.whatsapp-target');
      if (!(bubble instanceof HTMLElement) || !(target instanceof HTMLElement)) {
        return;
      }

      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      return gsap.context(() => {
        gsap.set(bubble, { autoAlpha: 0, y: reduced ? 0 : 14, scale: reduced ? 1 : 0.4 });
        gsap.set(target, { scale: 1 });

        if (reduced) {
          this.showInstant = (visible) => {
            gsap.set(bubble, { autoAlpha: visible ? 1 : 0 });
          };
          return;
        }

        this.timeline = gsap
          .timeline({ paused: true })
          .to(
            bubble,
            {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              duration: 1,
              ease: 'elastic.out(1.2, 0.3)',
              easeReverse: 'power3.in',
            },
            0,
          )
          .to(
            target,
            {
              scale: 1.3,
              duration: 0.8,
              ease: 'elastic.out(1.2, 0.3)',
              easeReverse: 'power3.in',
            },
            0,
          );
      }, root);
    });
  }

  protected play(): void {
    this.showInstant?.(true);
    this.timeline?.timeScale(1).play();
  }

  protected reverse(): void {
    this.showInstant?.(false);
    this.timeline?.timeScale(2.5).reverse();
  }
}
