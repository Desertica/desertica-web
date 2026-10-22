import { ChangeDetectionStrategy, Component, RESPONSE_INIT, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import { I18nService } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { usePageMeta } from '../../core/seo/page-meta';

/** Unknown URLs answer a real 404 (not a redirect to the home page, which search engines read as a soft 404). */
@Component({
  selector: 'app-not-found',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe, HlmButton],
  template: `
    <section class="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
      <h1 class="font-heading text-4xl">{{ 'notFound.title' | translate: i18n.locale() }}</h1>
      <p class="text-muted-foreground mt-4">{{ 'notFound.body' | translate: i18n.locale() }}</p>
      <div class="mt-8 flex flex-wrap justify-center gap-3">
        <a hlmBtn routerLink="/">{{ 'notFound.home' | translate: i18n.locale() }}</a>
        <a hlmBtn variant="outline" routerLink="/tours">{{ 'notFound.tours' | translate: i18n.locale() }}</a>
      </div>
    </section>
  `,
})
export class NotFound {
  protected readonly i18n = inject(I18nService);

  constructor() {
    const response = inject(RESPONSE_INIT, { optional: true });
    if (response) {
      response.status = 404;
    }

    usePageMeta(() => ({ title: this.i18n.t('notFound.title'), noindex: true, breadcrumbs: [] }));
  }
}
