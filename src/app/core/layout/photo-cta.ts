import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import { I18nService } from '../i18n/i18n';
import { TranslatePipe } from '../i18n/translate-pipe';

@Component({
  selector: 'app-photo-cta',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage, RouterLink, HlmButton, TranslatePipe],
  styleUrl: './photo-cta.css',
  host: {
    class: 'block w-full',
  },
  template: `
    <section class="bg-background relative isolate h-[500px] w-full overflow-hidden">
      <img
        [ngSrc]="image()"
        fill
        sizes="100vw"
        alt=""
        class="rounded-none object-cover object-center"
      />
      <div
        class="photo-cta-overlay pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-end p-6 pb-8 text-center md:p-8 md:pb-10"
      >
        <div class="flex max-w-md flex-col items-center gap-4">
          <div class="flex flex-col items-center gap-3">
            <span class="block h-px w-8 bg-current" aria-hidden="true"></span>
            <h2>{{ titleKey() | translate: i18n.locale() }}</h2>
            <p>{{ leadKey() | translate: i18n.locale() }}</p>
          </div>
          <a hlmBtn class="pointer-events-auto" [routerLink]="ctaLink()">
            {{ ctaLabelKey() | translate: i18n.locale() }}
          </a>
        </div>
      </div>
    </section>
  `,
})
export class PhotoCta {
  readonly image = input.required<string>();
  readonly titleKey = input.required<string>();
  readonly leadKey = input.required<string>();
  readonly ctaLabelKey = input.required<string>();
  readonly ctaLink = input.required<string>();

  protected readonly i18n = inject(I18nService);
}
