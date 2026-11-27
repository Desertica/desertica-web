import { ChangeDetectionStrategy, Component, computed, ElementRef, inject } from '@angular/core';
import { AnalyticsService } from '../analytics/analytics';
import { afterNextGsapUi } from '../animation/gsap-ui';
import { I18nService } from '../i18n/i18n';
import { TranslatePipe } from '../i18n/translate-pipe';
import { CatalogService } from '../catalog/catalog';
import { NgIcon } from '@ng-icons/core';
import { whatsappGlyph } from './footer-social-icons';

type TipTimeline = {
  timeScale: (value: number) => TipTimeline;
  play: () => TipTimeline;
  reverse: () => TipTimeline;
};

@Component({
  selector: 'app-whatsapp-fab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, TranslatePipe],
  host: {
    class: 'fixed right-6 bottom-6 z-50 inline-flex',
  },
  template: `
    @if (href(); as href) {
    <a
      class="relative inline-flex focus-visible:ring-ring rounded-full focus-visible:ring-2 focus-visible:outline-none"
      [href]="href"
      target="_blank"
      rel="noopener noreferrer"
      [attr.aria-label]="'a11y.whatsapp' | translate: i18n.locale()"
      [attr.aria-describedby]="tooltipId"
      (click)="trackClick()"
      (pointerenter)="play()"
      (pointerleave)="reverse()"
      (focusin)="play()"
      (focusout)="reverse()"
    >
      <span
        class="whatsapp-target inline-flex size-[3.6rem] origin-center items-center justify-center overflow-hidden rounded-full text-white shadow-lg"
        style="background-color: #25d366"
        aria-hidden="true"
      >
        <ng-icon [svg]="glyph" size="2.16rem" />
      </span>
      <span
        [id]="tooltipId"
        role="tooltip"
        class="whatsapp-bubble bg-popover text-popover-foreground after:border-t-popover pointer-events-none invisible absolute right-0 bottom-[calc(100%+14px)] origin-bottom-right rounded-3xl px-4 py-1.5 text-sm whitespace-nowrap opacity-0 after:absolute after:top-full after:right-3 after:border-[6px] after:border-solid after:border-transparent after:content-['']"
      >
        {{ 'whatsapp.tooltip' | translate: i18n.locale() }}
      </span>
    </a>
    }
  `,
})
export class WhatsappFab {
  private readonly host = inject(ElementRef<HTMLElement>);
  private timeline: TipTimeline | undefined;
  private showInstant: ((visible: boolean) => void) | undefined;

  protected readonly i18n = inject(I18nService);
  private readonly catalog = inject(CatalogService);
  private readonly analytics = inject(AnalyticsService);
  protected readonly href = computed(() => this.catalog.contact().whatsapp);
  protected readonly tooltipId = 'whatsapp-fab-tooltip';
  protected readonly glyph = whatsappGlyph;

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

  protected trackClick(): void {
    this.analytics.track('click_whatsapp', { placement: 'floating_button' });
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
