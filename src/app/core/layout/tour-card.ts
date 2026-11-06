import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { CatalogTour } from '../catalog/tours';
import { CurrencyService, priceIn } from '../currency/currency';
import { I18nService } from '../i18n/i18n';
import { TranslatePipe } from '../i18n/translate-pipe';

@Component({
  selector: 'app-tour-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage, TranslatePipe, HlmCardImports],
  styleUrl: './tour-card.css',
  host: {
    class: 'tour-card block w-full',
  },
  template: `
    <section hlmCard class="relative rounded-none py-0 shadow-none ring-0">
      <img
        [ngSrc]="tour().image"
        width="1200"
        height="1200"
        [priority]="priority()"
        [sizes]="sizes()"
        alt=""
        [style.object-position]="tour().imageFocus ?? 'center'"
        class="aspect-square w-full rounded-none object-cover"
      />
      <div
        class="tour-card-overlay pointer-events-none absolute inset-0 flex flex-col justify-between p-6 md:p-8"
      >
        <div class="flex max-w-[18rem] flex-col items-start gap-3">
          <p class="text-xs font-medium tracking-[0.22em] uppercase">
            {{ tour().durationHours }} {{ 'gallery.hours' | translate: i18n.locale() }}
          </p>
          <span class="block h-px w-8 bg-current" aria-hidden="true"></span>
          <h3 hlmCardTitle>
            {{ tour().titleKey | translate: i18n.locale() }}
          </h3>
        </div>
        <div class="flex flex-col items-start gap-1">
          <p class="text-xs font-medium tracking-[0.22em] uppercase">
            {{ 'gallery.from' | translate: i18n.locale() }}
          </p>
          <p class="font-heading text-2xl tracking-wide">
            {{ (price().currency === 'PEN' ? 'gallery.currencyPen' : 'gallery.currency') | translate: i18n.locale() }}
            {{ price().amount }}
          </p>
        </div>
      </div>
    </section>
  `,
})
export class TourCard {
  readonly tour = input.required<CatalogTour>();
  readonly sizes = input('(min-width: 768px) 33vw, 100vw');
  readonly priority = input(false);
  protected readonly i18n = inject(I18nService);
  private readonly currency = inject(CurrencyService);
  protected readonly price = computed(() => priceIn(this.tour(), this.currency.currency()));
}
