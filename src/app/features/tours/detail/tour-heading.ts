import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideClock,
  lucideLanguages,
  lucideMapPin,
  lucideUsers,
} from '@ng-icons/lucide';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { TourPage } from '../../../core/catalog/tour-pages';
import { CatalogTour, destinationById, TOURS_PATH } from '../../../core/catalog/tours';
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
      <span hlmBadge variant="outline">
        <ng-icon name="lucideClock" />
        {{ tour().durationHours }} {{ 'gallery.hours' | translate: i18n.locale() }}
      </span>
      <span hlmBadge variant="outline">
        <ng-icon name="lucideMapPin" />
        {{ destination().titleKey | translate: i18n.locale() }}
      </span>
      <span hlmBadge variant="outline">
        <ng-icon name="lucideLanguages" />
        {{ languageChip() }}
      </span>
      <span hlmBadge variant="outline">
        <ng-icon name="lucideUsers" />
        {{ formatKey() | translate: i18n.locale() }}
      </span>
      <span hlmBadge variant="secondary">
        {{ 'gallery.from' | translate: i18n.locale() }}
        {{ 'gallery.currency' | translate: i18n.locale() }}
        {{ tour().priceFrom }}
      </span>
    </div>
  `,
})
export class TourHeading {
  readonly tour = input.required<CatalogTour>();
  readonly page = input.required<TourPage>();
  protected readonly i18n = inject(I18nService);
  protected readonly toursPath = TOURS_PATH;
  protected readonly destination = computed(() => destinationById(this.tour().destination));
  protected readonly languageChip = computed(() =>
    this.page()
      .languages.map((code) => code.toUpperCase())
      .join(' / '),
  );
  protected readonly formatKey = computed(() => `tour.${this.page().format}`);
}
