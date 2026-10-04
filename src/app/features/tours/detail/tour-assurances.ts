import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCalendar, lucideCircleDollarSign, lucideClock } from '@ng-icons/lucide';
import { I18nService } from '../../../core/i18n/i18n';
import { TranslatePipe } from '../../../core/i18n/translate-pipe';

const ASSURANCES = [
  { icon: 'lucideCalendar', titleKey: 'tour.assure.payLater', bodyKey: 'tour.assure.payLaterBody' },
  { icon: 'lucideClock', titleKey: 'tour.assure.cancel', bodyKey: 'tour.assure.cancelBody' },
  {
    icon: 'lucideCircleDollarSign',
    titleKey: 'tour.assure.price',
    bodyKey: 'tour.assure.priceBody',
  },
] as const;

@Component({
  selector: 'app-tour-assurances',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, TranslatePipe],
  providers: [provideIcons({ lucideCalendar, lucideCircleDollarSign, lucideClock })],
  host: {
    class: 'block w-full',
  },
  template: `
    <ul class="bg-muted flex flex-col gap-4 rounded-4xl p-4">
      @for (item of items; track item.titleKey) {
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
  protected readonly items = ASSURANCES;
  protected readonly i18n = inject(I18nService);
}
