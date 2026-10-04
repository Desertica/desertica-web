import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCalendar,
  lucideCar,
  lucideCircleDollarSign,
  lucideClock,
  lucideLanguages,
  lucideMapPin,
  lucideShield,
  lucideSun,
  lucideUsers,
  lucideWind,
} from '@ng-icons/lucide';
import { CatalogService } from '../../../core/catalog/catalog';
import type { TourFeature } from '../../../core/catalog/tour-pages';
import { I18nService } from '../../../core/i18n/i18n';
import { TranslatePipe } from '../../../core/i18n/translate-pipe';

@Component({
  selector: 'app-tour-assurances',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, TranslatePipe],
  providers: [
    provideIcons({
      lucideCalendar,
      lucideCar,
      lucideCircleDollarSign,
      lucideClock,
      lucideLanguages,
      lucideMapPin,
      lucideShield,
      lucideSun,
      lucideUsers,
      lucideWind,
    }),
  ],
  host: {
    class: 'block w-full',
  },
  template: `
    <ul class="bg-muted flex flex-col gap-4 rounded-4xl p-4">
      @for (item of items(); track item.titleKey) {
        <li class="flex items-start gap-3">
          <span
            class="bg-background flex size-9 shrink-0 items-center justify-center rounded-full"
            aria-hidden="true"
          >
            <ng-icon class="size-4" [name]="item.icon" />
          </span>
          <p class="pt-1.5 text-sm">
            <span class="font-medium">{{ item.titleKey | translate: i18n.locale() }}</span>
            <span class="text-muted-foreground">
              {{ item.bodyKey | translate: i18n.locale() }}
            </span>
          </p>
        </li>
      }
    </ul>
  `,
})
export class TourAssurances {
  private readonly catalog = inject(CatalogService);

  /** Per-tour assurances from the CMS; empty falls back to the global booking assurances. */
  readonly custom = input<readonly TourFeature[] | undefined>(undefined);
  protected readonly i18n = inject(I18nService);
  protected readonly items = computed(() => {
    const custom = this.custom();
    return custom?.length ? custom : this.catalog.booking().assurances;
  });
}
