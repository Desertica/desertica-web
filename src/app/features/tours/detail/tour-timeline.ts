import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { TourStop } from '../../../core/catalog/tour-pages';
import { I18nService } from '../../../core/i18n/i18n';
import { TranslatePipe } from '../../../core/i18n/translate-pipe';

@Component({
  selector: 'app-tour-timeline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage, TranslatePipe],
  host: {
    class: 'block w-full',
  },
  template: `
    <section>
      <h2 class="font-heading text-2xl text-balance sm:text-3xl">
        {{ 'tour.timelineLabel' | translate: i18n.locale() }}
      </h2>
      <ol class="mt-6 divide-y divide-border">
        @for (stop of stops(); track stop.titleKey; let i = $index) {
          <li
            class="group grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-x-4 py-3 sm:grid-cols-[9rem_2.5rem_minmax(0,1fr)] sm:gap-x-6 sm:py-4"
          >
            <div class="relative aspect-[4/3] w-full overflow-hidden">
              <img
                [ngSrc]="stop.image"
                fill
                sizes="(min-width: 640px) 9rem, 6rem"
                [alt]="stop.titleKey | translate: i18n.locale()"
                class="rounded-none object-cover"
              />
            </div>
            <!-- The path: a thin line above and below each number, over the row padding, joins the stops; it starts at the first and ends at the last. -->
            <span
              class="text-tierra hidden flex-col items-center gap-2 self-stretch text-sm font-medium tabular-nums before:w-px before:flex-1 before:bg-tierra/40 after:w-px after:flex-1 after:bg-tierra/40 group-first:before:invisible group-last:after:invisible sm:-my-4 sm:flex"
              aria-hidden="true"
            >
              {{ step(i) }}
            </span>
            <div class="min-w-0">
              <h3 class="font-heading text-lg text-balance sm:text-xl">
                <span
                  class="text-tierra me-3 inline-block text-sm tabular-nums sm:hidden"
                  aria-hidden="true"
                >
                  {{ step(i) }}
                </span>
                {{ stop.titleKey | translate: i18n.locale() }}
              </h3>
              <p class="text-muted-foreground mt-1 text-sm sm:text-base">
                {{ stop.bodyKey | translate: i18n.locale() }}
              </p>
            </div>
          </li>
        }
      </ol>
    </section>
  `,
})
export class TourTimeline {
  readonly stops = input.required<readonly TourStop[]>();
  protected readonly i18n = inject(I18nService);

  protected step(index: number): string {
    return String(index + 1).padStart(2, '0');
  }
}
