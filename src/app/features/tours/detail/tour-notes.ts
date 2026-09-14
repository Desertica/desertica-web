import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmAccordionImports } from '@spartan-ng/helm/accordion';
import { TourPage } from '../../../core/catalog/tour-pages';
import { I18nService } from '../../../core/i18n/i18n';
import { TranslatePipe } from '../../../core/i18n/translate-pipe';

@Component({
  selector: 'app-tour-notes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, HlmAccordionImports, TranslatePipe],
  template: `
    <hlm-accordion type="multiple">
      @if (page().includedKeys.length || page().excludedKeys.length) {
        <hlm-accordion-item>
          <hlm-accordion-trigger>{{ 'tour.included' | translate: i18n.locale() }}</hlm-accordion-trigger>
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

      @if (page().notesKeys.length) {
        <hlm-accordion-item>
          <hlm-accordion-trigger>{{ 'tour.notes' | translate: i18n.locale() }}</hlm-accordion-trigger>
          <hlm-accordion-content>
            <ul class="flex flex-col gap-3">
              @for (key of page().notesKeys; track key) {
                <li>{{ key | translate: i18n.locale() }}</li>
              }
            </ul>
            <p class="mt-4">
              <a routerLink="/terms">{{ 'tour.terms' | translate: i18n.locale() }}</a>
            </p>
          </hlm-accordion-content>
        </hlm-accordion-item>
      }
    </hlm-accordion>
  `,
})
export class TourNotes {
  readonly page = input.required<TourPage>();
  protected readonly i18n = inject(I18nService);
}
