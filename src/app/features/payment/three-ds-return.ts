import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  afterNextRender,
  inject,
} from '@angular/core';
import { I18nService } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { CULQI_3DS_SRC } from '../../core/payments/culqi-loader';
import { loadScript } from '../../core/payments/third-party-script';
import { usePageMeta } from '../../core/seo/page-meta';

/**
 * Return page of Culqi's 3DS challenge (`returnUrl`). Culqi shows the bank's challenge in a frame
 * and sends it back here; as in Culqi's own demo, the page loads the 3DS script, which hands the
 * authentication parameters to the payment page through `postMessage`. Nothing else runs here.
 */
@Component({
  selector: 'app-three-ds-return',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  template: `
    <section class="mx-auto max-w-md px-4 py-12 text-center">
      <p role="status">{{ 'payment.threeDsReturn' | translate: i18n.locale() }}</p>
    </section>
  `,
})
export class ThreeDsReturn {
  private readonly document = inject(DOCUMENT);
  protected readonly i18n = inject(I18nService);

  constructor() {
    usePageMeta(() => ({ title: this.i18n.t('payment.title'), noindex: true }));
    const browser = isPlatformBrowser(inject(PLATFORM_ID));
    afterNextRender(() => {
      if (browser) {
        void loadScript(this.document, CULQI_3DS_SRC).catch(() => undefined);
      }
    });
  }
}
