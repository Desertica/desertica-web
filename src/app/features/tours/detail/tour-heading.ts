import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideClock, lucideLanguages, lucideMapPin, lucideUsers } from '@ng-icons/lucide';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { PublicData } from '../../../core/api/public-data';
import { CatalogService } from '../../../core/catalog/catalog';
import { CatalogTour, TOURS_PATH } from '../../../core/catalog/tours';
import { TourPrices } from '../../../core/catalog/tour-prices';
import { CurrencyService } from '../../../core/currency/currency';
import { I18nService } from '../../../core/i18n/i18n';
import { TranslatePipe } from '../../../core/i18n/translate-pipe';

@Component({
  selector: 'app-tour-heading',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, NgIcon, HlmBadge, TranslatePipe],
  providers: [provideIcons({ lucideClock, lucideLanguages, lucideMapPin, lucideUsers })],
  template: `
    <nav [attr.aria-label]="'tour.crumb' | translate: i18n.locale()">
      <ol class="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
        <li>
          <a class="hover:text-foreground" [routerLink]="toursPath">{{
            'nav.tours' | translate: i18n.locale()
          }}</a>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <a class="hover:text-foreground" [routerLink]="toursPath" [fragment]="destination().id">{{
            destination().titleKey | translate: i18n.locale()
          }}</a>
        </li>
        <li aria-hidden="true">/</li>
        <li class="text-foreground" aria-current="page">
          {{ tour().titleKey | translate: i18n.locale() }}
        </li>
      </ol>
    </nav>

    <h1 class="font-heading mt-6 text-4xl text-balance sm:text-5xl">
      {{ tour().titleKey | translate: i18n.locale() }}
    </h1>

    <div class="mt-6 flex flex-wrap gap-2">
      @if (api()?.durationHours; as hours) {
        <span hlmBadge variant="outline">
          <ng-icon name="lucideClock" />
          {{ hours }} {{ 'gallery.hours' | translate: i18n.locale() }}
        </span>
      }
      <span hlmBadge variant="outline">
        <ng-icon name="lucideMapPin" />
        {{ destination().titleKey | translate: i18n.locale() }}
      </span>
      @if (languageChip(); as languages) {
        <span hlmBadge variant="outline">
          <ng-icon name="lucideLanguages" />
          {{ languages }}
        </span>
      }
      @if (formatKey(); as format) {
        <span hlmBadge variant="outline">
          <ng-icon name="lucideUsers" />
          {{ format | translate: i18n.locale() }}
        </span>
      }
      @if (price(); as price) {
        <span hlmBadge variant="secondary">
          {{ 'gallery.from' | translate: i18n.locale() }}
          {{
            (price.currency === 'PEN' ? 'gallery.currencyPen' : 'gallery.currency')
              | translate: i18n.locale()
          }}
          {{ price.amount }}
        </span>
      }
    </div>
  `,
})
export class TourHeading {
  readonly tour = input.required<CatalogTour>();
  protected readonly i18n = inject(I18nService);
  private readonly currency = inject(CurrencyService);
  private readonly prices = inject(TourPrices);
  protected readonly price = computed(() =>
    this.prices.priceFor(this.tour().id, this.currency.currency()),
  );
  protected readonly toursPath = TOURS_PATH;
  private readonly catalog = inject(CatalogService);
  protected readonly destination = computed(() => {
    const tour = this.tour();
    return this.catalog.tourDestination(tour) ?? { id: tour.destination, titleKey: '' };
  });
  private readonly publicData = inject(PublicData);
  /** Duration, languages and format belong to the booking system; a badge without a value is not shown. */
  protected readonly api = computed(() => this.publicData.tour(this.tour().id));
  protected readonly languageChip = computed(() =>
    (this.api()?.languages ?? []).map((code) => code.toUpperCase()).join(' / '),
  );
  protected readonly formatKey = computed(() => {
    const format = this.api()?.format;
    return format ? `tour.${format.toLowerCase()}` : null;
  });
}
