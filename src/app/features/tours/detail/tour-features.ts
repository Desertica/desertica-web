import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCar, lucideLanguages, lucideUsers, lucideWind } from '@ng-icons/lucide';
import { TourFeature } from '../../../core/catalog/tour-pages';
import { I18nService } from '../../../core/i18n/i18n';
import { TranslatePipe } from '../../../core/i18n/translate-pipe';

@Component({
  selector: 'app-tour-features',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, TranslatePipe],
  providers: [provideIcons({ lucideCar, lucideLanguages, lucideUsers, lucideWind })],
  host: {
    class: 'block w-full',
  },
  template: `
    <section class="bg-muted py-8 sm:py-10">
      <div class="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 class="font-heading text-2xl text-balance sm:text-3xl">
          {{ headingKey() | translate: i18n.locale() }}
        </h2>
        <div class="mt-6 grid gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3">
          @for (item of items(); track item.titleKey) {
            <article class="flex gap-4">
              <ng-icon class="mt-1 size-5 shrink-0" [name]="item.icon" />
              <div>
                <h3 class="font-medium">{{ item.titleKey | translate: i18n.locale() }}</h3>
                <p class="text-muted-foreground mt-1 text-sm sm:text-base">
                  {{ item.bodyKey | translate: i18n.locale() }}
                </p>
              </div>
            </article>
          }
        </div>
      </div>
    </section>
  `,
})
export class TourFeatures {
  readonly headingKey = input.required<string>();
  readonly items = input.required<readonly TourFeature[]>();
  protected readonly i18n = inject(I18nService);
}
