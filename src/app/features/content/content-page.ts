import { NgOptimizedImage, isPlatformServer } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  PendingTasks,
  TransferState,
  computed,
  inject,
  makeStateKey,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { API_URL } from '../../core/api/api-client';
import { BookingApi, type LegalDocumentWithText } from '../../core/api/booking-api';
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

/** Legal pages whose text is the version published in the backoffice (what the customer accepts). */
const LEGAL_KINDS = {
  terms: 'TERMS',
  privacy: 'PRIVACY',
  cancellation: 'CANCELLATION',
  cookies: 'COOKIES',
  conduct: 'CONDUCT',
} as const;

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
      @if (legal(); as doc) {
        <p class="text-muted-foreground mt-4 text-sm" id="legal-version">{{ versionLabel(doc) }}</p>
      } @else if (lead()) {
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

  /** Version published in the backoffice; wins over the CMS page while it exists. */
  protected readonly legal = signal<LegalDocumentWithText | null>(null);

  protected readonly title = computed(
    () => this.legal()?.title || this.cms()?.title || this.i18n.t(this.data().titleKey ?? ''),
  );
  protected readonly lead = computed(
    () => this.cms()?.lead || this.i18n.t(this.data().leadKey ?? ''),
  );
  protected readonly body = computed(() => this.legal()?.text ?? this.cms()?.body ?? '');
  protected readonly hero = computed(
    () => this.catalog.page(this.data().slug ?? '')?.heroImage ?? this.destination()?.image,
  );
  protected readonly tours = computed(() => this.destination()?.tours ?? []);

  constructor() {
    this.loadLegal();
    usePageMeta(() => ({
      title: this.cms()?.seoTitle || this.title(),
      description: this.cms()?.seoDescription || this.lead(),
      image: this.hero(),
      breadcrumbs: [],
    }));
  }

  protected versionLabel(doc: LegalDocumentWithText): string {
    const date = new Intl.DateTimeFormat(this.i18n.locale(), {
      dateStyle: 'long',
      timeZone: 'America/Lima',
    }).format(new Date(doc.publishedAt));
    return this.i18n
      .t('pages.legalVersion')
      .replace('{version}', String(doc.version))
      .replace('{date}', date);
  }

  /**
   * Fetched on the server (the API URL never reaches the browser) and handed over in TransferState, so the
   * browser shows the same text without calling the API. Without an API or a published version the CMS page stays.
   */
  private loadLegal(): void {
    const kind = LEGAL_KINDS[(this.data().slug ?? '') as keyof typeof LEGAL_KINDS];
    if (!kind) {
      return;
    }

    const key = makeStateKey<LegalDocumentWithText | null>(`legal:${kind}:${this.i18n.locale()}`);
    const state = inject(TransferState);
    if (!isPlatformServer(inject(PLATFORM_ID))) {
      this.legal.set(state.get(key, null));
      return;
    }

    if (!inject(API_URL)) {
      return;
    }

    const api = inject(BookingApi);
    inject(PendingTasks).run(async () => {
      const result = await api.legalDocument(kind, this.i18n.locale());
      const doc = result.ok ? result.data : null;
      state.set(key, doc);
      this.legal.set(doc);
    });
  }
}
