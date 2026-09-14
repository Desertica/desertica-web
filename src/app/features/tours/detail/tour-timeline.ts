import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { TourStop } from '../../../core/catalog/tour-pages';
import { I18nService } from '../../../core/i18n/i18n';
import { TranslatePipe } from '../../../core/i18n/translate-pipe';

@Component({
  selector: 'app-tour-timeline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmCardImports, TranslatePipe],
  host: {
    class: 'block w-full',
  },
  template: `
    <section>
      <h2 class="font-heading text-2xl text-balance sm:text-3xl">
        {{ 'tour.timelineLabel' | translate: i18n.locale() }}
      </h2>
      <div class="relative mt-6">
        <div
          class="pointer-events-none absolute inset-y-0 left-4 w-6 -translate-x-1/2 md:left-1/2 md:w-7"
          aria-hidden="true"
        >
          <svg
            class="text-foreground/30 block size-full"
            viewBox="0 0 24 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <pattern id="tour-rail-sleepers" width="24" height="8" patternUnits="userSpaceOnUse">
                <path d="M6 4h12" fill="none" stroke="currentColor" stroke-width="1.25" />
              </pattern>
            </defs>
            <rect x="6" y="0" width="12" height="100" fill="url(#tour-rail-sleepers)" />
            <path
              d="M7 0v100M17 0v100"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              vector-effect="non-scaling-stroke"
            />
          </svg>
        </div>
        <ol class="flex flex-col gap-8">
          @for (stop of stops(); track stop.time + stop.titleKey; let odd = $odd) {
            <li class="relative flex" [class.md:justify-end]="odd">
              @if (odd) {
                <span
                  class="bg-foreground/25 absolute top-8 left-1/2 hidden h-px w-6 md:block"
                  aria-hidden="true"
                ></span>
              } @else {
                <span
                  class="bg-foreground/25 absolute top-8 right-1/2 hidden h-px w-6 md:block"
                  aria-hidden="true"
                ></span>
              }
              <span
                class="bg-foreground/25 absolute top-8 left-4 h-px w-6 md:hidden"
                aria-hidden="true"
              ></span>
              <span
                class="bg-card ring-primary absolute top-8 left-4 z-10 size-3 -translate-x-1/2 rounded-full ring-2 md:left-1/2"
                aria-hidden="true"
              ></span>
              <article
                hlmCard
                size="sm"
                class="relative z-10 ml-10 w-[calc(100%-2.75rem)] md:ml-0 md:w-[calc(50%-1.75rem)]"
              >
                <div hlmCardHeader>
                  <p class="text-xs font-medium tracking-[0.22em] uppercase">{{ stop.time }}</p>
                  <h3 hlmCardTitle class="font-heading">
                    {{ stop.titleKey | translate: i18n.locale() }}
                  </h3>
                </div>
                <div hlmCardContent>
                  <p hlmCardDescription>
                    {{ stop.bodyKey | translate: i18n.locale() }}
                  </p>
                </div>
              </article>
            </li>
          }
        </ol>
      </div>
    </section>
  `,
})
export class TourTimeline {
  readonly stops = input.required<readonly TourStop[]>();
  protected readonly i18n = inject(I18nService);
}
