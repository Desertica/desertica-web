import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronLeft, lucideChevronRight, lucideX } from '@ng-icons/lucide';
import { I18nService } from '../../../core/i18n/i18n';
import { TranslatePipe } from '../../../core/i18n/translate-pipe';

@Component({
  selector: 'app-tour-gallery',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage, NgIcon, TranslatePipe],
  providers: [provideIcons({ lucideChevronLeft, lucideChevronRight, lucideX })],
  host: {
    class: 'block w-full',
  },
  template: `
    <section [attr.aria-label]="'tour.galleryLabel' | translate: i18n.locale()">
      <div
        class="flex snap-x snap-mandatory gap-3 overflow-x-auto md:grid md:h-[min(56svh,32rem)] md:snap-none md:grid-cols-3 md:grid-rows-2 md:overflow-visible"
      >
        @for (src of photos(); track src; let i = $index) {
          <div
            class="relative aspect-[16/10] w-[88%] shrink-0 snap-center overflow-hidden md:aspect-auto md:h-full md:w-auto md:min-h-0"
            [class.md:col-span-2]="i === 0"
            [class.md:row-span-2]="i === 0"
            [class.md:hidden]="i > 2"
          >
            <img
              [ngSrc]="src"
              fill
              [priority]="i === 0"
              [sizes]="
                i === 0 ? '(min-width: 768px) 48rem, 88vw' : '(min-width: 768px) 24rem, 88vw'
              "
              [alt]="alt(i)"
              class="rounded-none object-cover"
            />
            <button
              type="button"
              class="absolute inset-0 flex cursor-zoom-in items-center justify-center"
              [attr.aria-label]="i18n.t('tour.galleryOpen').replace('{n}', '' + (i + 1))"
              (click)="open(i)"
            >
              @if (i === 2 && photos().length > 3) {
                <span
                  class="hidden size-full items-center justify-center bg-black/50 font-heading text-4xl text-white md:flex"
                  >+{{ photos().length - 3 }}</span
                >
              }
            </button>
          </div>
        }
      </div>

      <dialog
        #viewer
        class="m-auto h-[min(90svh,56rem)] w-[min(96vw,80rem)] max-w-none overflow-hidden bg-black/95 p-0 backdrop:bg-black/80"
        (click)="$event.target === viewer && viewer.close()"
        (keydown.arrowLeft)="step(-1)"
        (keydown.arrowRight)="step(1)"
      >
        <div class="relative size-full">
          <img
            [src]="photos()[current()]"
            [alt]="alt(current())"
            class="size-full object-contain"
          />
          <button
            type="button"
            class="absolute top-3 right-3 rounded-full bg-black/60 p-2 text-white"
            [attr.aria-label]="'tour.galleryClose' | translate: i18n.locale()"
            (click)="viewer.close()"
          >
            <ng-icon name="lucideX" />
          </button>
          @if (photos().length > 1) {
            <button
              type="button"
              class="absolute top-1/2 left-3 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white"
              [attr.aria-label]="'tour.galleryPrev' | translate: i18n.locale()"
              (click)="step(-1)"
            >
              <ng-icon name="lucideChevronLeft" />
            </button>
            <button
              type="button"
              class="absolute top-1/2 right-3 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white"
              [attr.aria-label]="'tour.galleryNext' | translate: i18n.locale()"
              (click)="step(1)"
            >
              <ng-icon name="lucideChevronRight" />
            </button>
            <span class="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-sm text-white"
              >{{ current() + 1 }} / {{ photos().length }}</span
            >
          }
        </div>
      </dialog>
    </section>
  `,
})
export class TourGallery {
  readonly photos = input.required<readonly string[]>();
  readonly title = input.required<string>();
  protected readonly i18n = inject(I18nService);
  protected readonly current = signal(0);
  private readonly viewer = viewChild.required<ElementRef<HTMLDialogElement>>('viewer');

  protected open(index: number): void {
    this.current.set(index);
    this.viewer().nativeElement.showModal();
  }

  protected step(delta: number): void {
    const total = this.photos().length;
    this.current.update((i) => (i + delta + total) % total);
  }

  protected alt(index: number): string {
    return this.i18n
      .t('tour.photoAlt')
      .replace('{tour}', this.title())
      .replace('{n}', String(index + 1));
  }
}
