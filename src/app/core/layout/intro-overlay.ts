import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  computed,
  inject,
} from '@angular/core';
import { CatalogService } from '../catalog/catalog';
import { afterNextGsap } from '../animation/gsap';
import { IntroService } from '../animation/intro';
import {
  appendWordmarkDraw,
  prepareWordmarkDraw,
  queryWordmark,
} from '../animation/wordmark-intro';
import { I18nService } from '../i18n/i18n';
import { WordmarkSvg } from './wordmark-svg';

@Component({
  selector: 'app-intro-overlay',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [WordmarkSvg],
  host: {
    class: 'fixed inset-0 z-[100] flex items-center justify-center',
    role: 'status',
    'aria-live': 'polite',
    '[attr.aria-label]': 'label()',
  },
  template: `
    <div class="intro-overlay-stage w-full max-w-3xl px-4">
      <app-wordmark-svg />
    </div>
  `,
  styles: `
    :host {
      background: var(--primary);
      color: #ffffff;
    }
  `,
})
export class IntroOverlay {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly intro = inject(IntroService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject(I18nService);
  private readonly ngZone = inject(NgZone);
  private readonly style = inject(CatalogService).introStyle();

  protected readonly label = computed(() => {
    this.i18n.locale();
    return this.i18n.t('a11y.intro');
  });

  constructor() {
    let cancelled = false;
    this.ngZone.runOutsideAngular(() => {
      const failsafe = window.setTimeout(() => {
        this.ngZone.run(() => this.intro.complete());
      }, this.style.failsafeMs);
      this.destroyRef.onDestroy(() => {
        cancelled = true;
        window.clearTimeout(failsafe);
      });
    });

    afterNextGsap(
      (gsap) => {
        const wordmark = this.host.nativeElement.querySelector('.wordmark-svg');
        if (!(wordmark instanceof SVGElement)) {
          this.intro.complete();
          return;
        }

        const parts = queryWordmark(wordmark);

        return gsap.context(() => {
          this.intro.markPlaying();
          prepareWordmarkDraw(gsap, parts);

          const tl = gsap.timeline({
            defaults: { ease: 'power1.inOut' },
            onComplete: () => {
              if (cancelled) {
                return;
              }
              this.intro.complete();
            },
          });

          appendWordmarkDraw(tl, parts, this.style);
          tl.to(this.host.nativeElement, { autoAlpha: 0, duration: 0.6, ease: 'power2.out' });
        }, this.host.nativeElement);
      },
      { morphSvg: false, drawSvg: true },
    );
  }
}
