import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CatalogService } from '../../core/catalog/catalog';
import { tourPath } from '../../core/catalog/tours';
import { ContentBody } from '../../core/cms/content-body';
import { I18nService } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { TourCard } from '../../core/layout/tour-card';
import { usePageMeta } from '../../core/seo/page-meta';

type ContentRouteData = {
  /** CMS `page` slug (also used by destination hubs). */
  slug?: string;
  titleKey?: string;
  leadKey?: string;
  /** Destination slug: renders that destination's tours under the copy. */
  destination?: string;
};

/**
 * Generic page for terms, privacy, hubs and any other route backed by a Strapi `page` entry.
 * Falls back to the i18n title/lead keys when the CMS has nothing for the slug.
 */
@Component({
  selector: 'app-content-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage, RouterLink, TranslatePipe, ContentBody, TourCard],
  template: `
    @if (hero(); as src) {
      <div class="relative h-[min(36svh,22rem)] w-full overflow-hidden">
        <img [ngSrc]="src" fill priority sizes="100vw" alt="" class="rounded-none object-cover" />
      </div>
    }
    <section class="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h1 class="font-heading text-4xl">{{ title() }}</h1>
      @if (lead()) {
        <p class="text-muted-foreground mt-4 max-w-2xl">{{ lead() }}</p>
      }
      <app-content-body class="mt-8" [markdown]="body()" />

      @if (tours().length) {
        <div class="mt-12 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          @for (tour of tours(); track tour.id) {
            <a class="block" [routerLink]="detailPath(tour.id)">
              <app-tour-card [tour]="tour" />
            </a>
          }
        </div>
        <p class="mt-8">
          <a class="underline underline-offset-4" routerLink="/tours">{{
            'nav.toursAll' | translate: i18n.locale()
          }}</a>
        </p>
      }
    </section>
  `,
})
export class ContentPage {
  private readonly catalog = inject(CatalogService);
  private readonly data = toSignal(inject(ActivatedRoute).data, {
    initialValue: {} as ContentRouteData,
  });

  protected readonly i18n = inject(I18nService);
  protected readonly detailPath = tourPath;

  private readonly cms = computed(() => {
    const page = this.catalog.page(this.data().slug ?? '');
    return page ? this.catalog.localized(page.i18n, this.i18n.locale()) : undefined;
  });
  private readonly destination = computed(() => {
    const id = this.data().destination;
    return id ? this.catalog.destinationById(id) : undefined;
  });

  protected readonly title = computed(
    () => this.cms()?.title || this.i18n.t(this.data().titleKey ?? ''),
  );
  protected readonly lead = computed(
    () => this.cms()?.lead || this.i18n.t(this.data().leadKey ?? ''),
  );
  protected readonly body = computed(() => this.cms()?.body ?? '');
  protected readonly hero = computed(
    () => this.catalog.page(this.data().slug ?? '')?.heroImage ?? this.destination()?.image,
  );
  protected readonly tours = computed(() => this.destination()?.tours ?? []);

  constructor() {
    usePageMeta(() => ({
      title: this.cms()?.seoTitle || this.title(),
      description: this.cms()?.seoDescription || this.lead(),
    }));
  }
}
