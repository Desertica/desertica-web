import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import type { TourFaq } from '../../../core/catalog/tour-pages';
import { I18nService } from '../../../core/i18n/i18n';
import { TranslatePipe } from '../../../core/i18n/translate-pipe';

/**
 * Frequently asked questions of a tour. They are visible text, which is what lets the page also
 * publish them as `FAQPage` structured data. Native `<details>` keeps them keyboard accessible and
 * readable without JavaScript.
 */
@Component({
  selector: 'app-tour-faqs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  template: `
    <section class="mx-auto max-w-3xl px-4 pb-12 sm:px-6" aria-labelledby="tour-faqs-title">
      <h2 id="tour-faqs-title" class="font-heading text-2xl">{{ 'tour.faqs' | translate: i18n.locale() }}</h2>
      <div class="mt-4 flex flex-col divide-y">
        @for (faq of faqs(); track faq.questionKey) {
          <details class="group py-3">
            <summary class="cursor-pointer font-medium">{{ faq.questionKey | translate: i18n.locale() }}</summary>
            <p class="text-muted-foreground mt-2 whitespace-pre-line">{{ faq.answerKey | translate: i18n.locale() }}</p>
          </details>
        }
      </div>
    </section>
  `,
})
export class TourFaqs {
  readonly faqs = input.required<readonly TourFaq[]>();
  protected readonly i18n = inject(I18nService);
}
