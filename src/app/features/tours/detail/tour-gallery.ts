import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n';
import { TranslatePipe } from '../../../core/i18n/translate-pipe';

@Component({
  selector: 'app-tour-gallery',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage, TranslatePipe],
  host: {
    class: 'block w-full',
  },
  template: `
    <section [attr.aria-label]="'tour.galleryLabel' | translate: i18n.locale()">
      <div
        class="flex snap-x snap-mandatory gap-3 overflow-x-auto md:grid md:h-[min(42svh,22rem)] md:snap-none md:grid-cols-3 md:grid-rows-2 md:overflow-visible"
      >
        @for (src of photos(); track src; let i = $index) {
          <div
            class="relative aspect-[16/10] w-[72%] shrink-0 snap-center overflow-hidden md:aspect-auto md:h-full md:w-auto md:min-h-0"
            [class.md:col-span-2]="i === 0"
            [class.md:row-span-2]="i === 0"
          >
            <img
              [ngSrc]="src"
              fill
              [priority]="i === 0"
              [sizes]="i === 0 ? '(min-width: 768px) 42rem, 72vw' : '(min-width: 768px) 14rem, 72vw'"
              [alt]="alt(i)"
              class="rounded-none object-cover"
            />
          </div>
        }
      </div>
    </section>
  `,
})
export class TourGallery {
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
