import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { TourStop } from '../../../core/catalog/tour-pages';
import { I18nService } from '../../../core/i18n/i18n';
import { TranslatePipe } from '../../../core/i18n/translate-pipe';

@Component({
  selector: 'app-tour-timeline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  template: `
    <section>
      <h2 class="font-heading text-2xl text-balance sm:text-3xl">
        {{ 'tour.timelineLabel' | translate: i18n.locale() }}
      </h2>
      <ol class="mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
        @for (stop of stops(); track stop.time + stop.titleKey) {
          <li class="border-border w-56 shrink-0 snap-start border p-4">
            <p class="text-xs font-medium tracking-[0.22em] uppercase">{{ stop.time }}</p>
            <h3 class="font-heading mt-3 text-lg">
              {{ stop.titleKey | translate: i18n.locale() }}
            </h3>
            <p class="text-muted-foreground mt-2 text-sm">
              {{ stop.bodyKey | translate: i18n.locale() }}
            </p>
          </li>
        }
      </ol>
    </section>
  `,
})
export class TourTimeline {
  readonly stops = input.required<readonly TourStop[]>();
  protected readonly i18n = inject(I18nService);
}
