import { isPlatformBrowser, NgOptimizedImage } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  PLATFORM_ID,
  signal,
  viewChild,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePlay } from '@ng-icons/lucide';
import { TourVideo } from '../../../core/catalog/tour-pages';
import { I18nService } from '../../../core/i18n/i18n';
import { TranslatePipe } from '../../../core/i18n/translate-pipe';

@Component({
  selector: 'app-tour-videos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage, NgIcon, TranslatePipe],
  providers: [provideIcons({ lucidePlay })],
  host: {
    class: 'block w-full',
  },
  template: `
    <section [attr.aria-label]="'tour.videosLabel' | translate: i18n.locale()">
      <div class="grid grid-cols-2 gap-3">
        @for (clip of clips(); track clip.poster; let i = $index) {
          <article class="relative aspect-[9/16] overflow-hidden">
            @if (canPlay(clip) && playing() === i) {
              <video
                #player
                class="absolute inset-0 size-full object-cover"
                [attr.poster]="clip.poster"
                controls
                playsinline
                preload="none"
                (ended)="stop()"
              >
                @if (clip.webm) {
                  <source [src]="clip.webm" type="video/webm" />
                }
                @if (clip.mp4) {
                  <source [src]="clip.mp4" type="video/mp4" />
                }
              </video>
            } @else if (canPlay(clip)) {
              <button
                type="button"
                class="absolute inset-0"
                (click)="play(i)"
                [attr.aria-label]="playLabel(i)"
              >
                <img
                  [ngSrc]="clip.poster"
                  fill
                  sizes="(min-width: 768px) 22rem, 45vw"
                  [alt]="alt(i)"
                  class="rounded-none object-cover"
                />
                <span
                  class="bg-background/80 text-foreground pointer-events-none absolute top-1/2 left-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
                  aria-hidden="true"
                >
                  <ng-icon name="lucidePlay" class="size-5" />
                </span>
              </button>
            } @else {
              <img
                [ngSrc]="clip.poster"
                fill
                sizes="(min-width: 768px) 22rem, 45vw"
                [alt]="alt(i)"
                class="rounded-none object-cover"
              />
              <p
                class="bg-background/80 text-foreground absolute inset-x-0 bottom-0 px-3 py-2 text-xs font-medium tracking-wide uppercase"
              >
                {{ 'tour.videoSoon' | translate: i18n.locale() }}
              </p>
            }
          </article>
        }
      </div>
    </section>
  `,
})
export class TourVideos {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly player = viewChild<ElementRef<HTMLVideoElement>>('player');

  readonly clips = input.required<readonly TourVideo[]>();
  readonly title = input.required<string>();
  protected readonly i18n = inject(I18nService);
  protected readonly playing = signal<number | null>(null);

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId) || typeof IntersectionObserver === 'undefined') {
        return;
      }

      const observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => !entry.isIntersecting)) {
          this.stop();
        }
      });
      observer.observe(this.host.nativeElement);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });

    effect(() => {
      const video = this.player()?.nativeElement;
      if (!video || this.playing() === null) {
        return;
      }

      const play = video.play();
      if (play) {
        void play.catch(() => undefined);
      }
    });
  }

  protected canPlay(clip: TourVideo): boolean {
    return Boolean(clip.webm || clip.mp4);
  }

  protected play(index: number): void {
    this.player()?.nativeElement.pause();
    this.playing.set(index);
  }

  protected stop(): void {
    this.player()?.nativeElement.pause();
    this.playing.set(null);
  }

  protected alt(index: number): string {
    return this.i18n
      .t('tour.photoAlt')
      .replace('{tour}', this.title())
      .replace('{n}', String(index + 1));
  }

  protected playLabel(index: number): string {
    return this.i18n
      .t('tour.clipPlay')
      .replace('{tour}', this.title())
      .replace('{n}', String(index + 1));
  }
}
