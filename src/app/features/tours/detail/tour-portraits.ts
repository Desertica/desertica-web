import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n';
import { TranslatePipe } from '../../../core/i18n/translate-pipe';

@Component({
  selector: 'app-tour-portraits',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage, TranslatePipe],
  template: `
    <section>
      <h2 class="font-heading text-2xl text-balance sm:text-3xl">
        {{ 'tour.portraitsLabel' | translate: i18n.locale() }}
      </h2>
      <div class="mt-6 grid max-w-xl gap-3 sm:grid-cols-2">
        @for (src of photos(); track src; let i = $index) {
          <div class="relative aspect-[9/16] overflow-hidden">
            <img
              [ngSrc]="src"
              fill
              sizes="(min-width: 640px) 14rem, 70vw"
              [alt]="alt(i)"
              class="rounded-none object-cover"
            />
          </div>
        }
      </div>
    </section>
  `,
})
export class TourPortraits {
  readonly photos = input.required<readonly string[]>();
  readonly title = input.required<string>();
  protected readonly i18n = inject(I18nService);

  protected alt(index: number): string {
    return this.i18n
      .t('tour.photoAlt')
      .replace('{tour}', this.title())
      .replace('{n}', String(index + 1));
  }
}
