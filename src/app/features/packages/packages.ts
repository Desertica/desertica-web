import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate-pipe';

@Component({
  selector: 'app-packages',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  template: `
    <section class="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h1 class="font-heading text-4xl">{{ 'nav.packages' | translate: i18n.locale() }}</h1>
      <p class="text-muted-foreground mt-4">{{ 'pages.packagesLead' | translate: i18n.locale() }}</p>
    </section>
  `,
})
export class Packages {
  protected readonly i18n = inject(I18nService);
}
