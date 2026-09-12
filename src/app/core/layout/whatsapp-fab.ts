import { NgOptimizedImage } from '@angular/common';
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
  imports: [NgOptimizedImage, TranslatePipe],
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
      <span class="whatsapp-target inline-flex size-16 origin-center drop-shadow-lg" aria-hidden="true">
        <img
          ngSrc="/brand/whatsapp-glyph.png"
          width="64"
          height="64"
          alt=""
          class="size-16"
          priority
          disableOptimizedSrcset
        />
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
