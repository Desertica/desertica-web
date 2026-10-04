import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmAccordionImports } from '@spartan-ng/helm/accordion';
import { TourPage } from '../../../core/catalog/tour-pages';
import { I18nService } from '../../../core/i18n/i18n';
import { TranslatePipe } from '../../../core/i18n/translate-pipe';

@Component({
  selector: 'app-tour-full-details',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, HlmAccordionImports, TranslatePipe],
  host: {
    class: 'block w-full',
  },
  template: `
    <section>
      <h2 class="font-heading mb-6 text-2xl text-balance sm:text-3xl">
        {{ 'tour.detailsLabel' | translate: i18n.locale() }}
      </h2>
      <hlm-accordion type="single">
        @if (page().expandedDescriptionKeys.length || page().itinerary.length) {
          <hlm-accordion-item>
            <hlm-accordion-trigger>{{
              'tour.detailsOverview' | translate: i18n.locale()
            }}</hlm-accordion-trigger>
            <hlm-accordion-content>
              @for (key of page().expandedDescriptionKeys; track key) {
                <p>{{ key | translate: i18n.locale() }}</p>
              }
              @if (page().itinerary.length) {
                <ol class="mt-4 flex flex-col gap-4">
                  @for (stop of page().itinerary; track stop.titleKey; let i = $index) {
                    <li>
                      <p class="font-medium">
                        {{ step(i) }}
                        {{ stop.titleKey | translate: i18n.locale() }}
                      </p>
                      <p class="text-muted-foreground mt-1">
                        {{ (stop.expandedBodyKey ?? stop.bodyKey) | translate: i18n.locale() }}
                      </p>
                    </li>
                  }
                </ol>
              }
            </hlm-accordion-content>
          </hlm-accordion-item>
        }

        @if (page().notesKeys.length) {
          <hlm-accordion-item>
            <hlm-accordion-trigger>{{ 'tour.notes' | translate: i18n.locale() }}</hlm-accordion-trigger>
            <hlm-accordion-content>
              <ul class="flex flex-col gap-3">
                @for (key of page().notesKeys; track key) {
                  <li>{{ key | translate: i18n.locale() }}</li>
                }
              </ul>
            </hlm-accordion-content>
          </hlm-accordion-item>
        }

        @if (page().includedKeys.length || page().excludedKeys.length) {
          <hlm-accordion-item>
            <hlm-accordion-trigger>{{
              'tour.included' | translate: i18n.locale()
            }}</hlm-accordion-trigger>
            <hlm-accordion-content>
              @if (page().includedKeys.length) {
                <p class="font-medium">{{ 'tour.included' | translate: i18n.locale() }}</p>
                <ul class="mt-2 list-disc ps-4">
                  @for (key of page().includedKeys; track key) {
                    <li>{{ key | translate: i18n.locale() }}</li>
                  }
                </ul>
              }
              @if (page().excludedKeys.length) {
                <p class="mt-4 font-medium">{{ 'tour.notIncluded' | translate: i18n.locale() }}</p>
                <ul class="mt-2 list-disc ps-4">
                  @for (key of page().excludedKeys; track key) {
                    <li>{{ key | translate: i18n.locale() }}</li>
                  }
                </ul>
              }
            </hlm-accordion-content>
          </hlm-accordion-item>
        }

        @if (page().packKeys.length) {
          <hlm-accordion-item>
            <hlm-accordion-trigger>{{ 'tour.pack' | translate: i18n.locale() }}</hlm-accordion-trigger>
            <hlm-accordion-content>
              <ul class="list-disc ps-4">
                @for (key of page().packKeys; track key) {
                  <li>{{ key | translate: i18n.locale() }}</li>
                }
              </ul>
            </hlm-accordion-content>
          </hlm-accordion-item>
        }

        @if (page().termsSummaryKey; as termsKey) {
          <hlm-accordion-item>
            <hlm-accordion-trigger>{{ 'tour.terms' | translate: i18n.locale() }}</hlm-accordion-trigger>
            <hlm-accordion-content>
              <p>{{ termsKey | translate: i18n.locale() }}</p>
              <p class="mt-4">
                <a routerLink="/terms">{{ 'tour.terms' | translate: i18n.locale() }}</a>
              </p>
            </hlm-accordion-content>
          </hlm-accordion-item>
        }
      </hlm-accordion>
    </section>
  `,
})
export class TourFullDetails {
  readonly page = input.required<TourPage>();
  protected readonly i18n = inject(I18nService);

  protected step(index: number): string {
    return String(index + 1).padStart(2, '0');
  }
}
