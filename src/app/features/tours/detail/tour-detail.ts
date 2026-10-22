import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { AnalyticsService, asCurrency } from '../../../core/analytics/analytics';
import { tourItem } from '../../../core/analytics/items';
import { PUBLIC_CONFIG } from '../../../core/config/public-config';
import { CatalogService } from '../../../core/catalog/catalog';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideDownload, lucideMessageCircle } from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { meetingMapUrl, tourHasDetails } from '../../../core/catalog/tour-pages';
import { type CatalogTour, TOURS_PATH, tourPath } from '../../../core/catalog/tours';
import { I18nService } from '../../../core/i18n/i18n';
import { TranslatePipe } from '../../../core/i18n/translate-pipe';
import { faqLd, touristTripLd } from '../../../core/seo/json-ld';
import { usePageMeta } from '../../../core/seo/page-meta';
import { SeoService } from '../../../core/seo/seo';
import { absoluteUrl, localizedUrl } from '../../../core/seo/seo-urls';
import { BookingPanel } from '../../booking/booking-panel';
import { NotFound } from '../../not-found/not-found';
import { TourAssurances } from './tour-assurances';
import { TourFaqs } from './tour-faqs';
import { TourBook } from './tour-book';
import { TourFeatures } from './tour-features';
import { TourFullDetails } from './tour-full-details';
import { TourGallery } from './tour-gallery';
import { TourHeading } from './tour-heading';
import { TourTimeline } from './tour-timeline';
import { TourVideos } from './tour-videos';
import { buildAskWhatsappHref } from './tour-whatsapp';

@Component({
  selector: 'app-tour-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslatePipe,
    NgIcon,
    HlmButton,
    TourGallery,
    TourHeading,
    TourFeatures,
    TourAssurances,
    TourFaqs,
    TourBook,
    BookingPanel,
    TourTimeline,
    TourFullDetails,
    TourVideos,
    NotFound,
  ],
  templateUrl: './tour-detail.html',
  providers: [provideIcons({ lucideDownload, lucideMessageCircle })],
})
export class TourDetail {
  private readonly seo = inject(SeoService);
  private readonly analytics = inject(AnalyticsService);
  private viewed: string | null = null;

  readonly id = input.required<string>();
  protected readonly i18n = inject(I18nService);
  private readonly catalog = inject(CatalogService);
  protected readonly resolved = computed(() => this.catalog.resolvedTour(this.id()));
  protected readonly hasDetails = tourHasDetails;
  protected readonly mapUrl = meetingMapUrl;
  /** Online booking replaces the WhatsApp form only while the flag is on. */
  protected readonly bookingEngine = inject(PUBLIC_CONFIG).bookingEngineEnabled;

  /** WhatsApp link with a ready message about this tour; `null` while the tour is unknown. */
  protected readonly askHref = computed(() => {
    const data = this.resolved();
    const locale = this.i18n.locale();
    const whatsapp = this.catalog.contact().whatsapp;
    if (!data || !whatsapp) {
      return null;
    }

    const origin = this.seo.origin();
    return buildAskWhatsappHref(whatsapp, this.i18n.t('tour.askWhatsappMessage'), {
      tour: this.i18n.t(data.tour.titleKey),
      hours: String(data.tour.durationHours),
      price: String(data.tour.priceFrom),
      url: origin ? localizedUrl(origin, tourPath(data.tour.id), locale) : '',
    });
  });

  protected trackAsk(): void {
    this.analytics.track('click_whatsapp', { placement: 'tour_ask' });
  }

  constructor() {
    effect(() => {
      const data = this.resolved();
      this.i18n.locale();
      if (data) {
        untracked(() => this.trackView(data.tour));
      }
    });

    usePageMeta(() => {
      const data = this.resolved();
      this.i18n.locale();
      if (!data) {
        return null;
      }

      const { tour, page } = data;
      const origin = this.seo.origin();
      const description = this.i18n.t(page.seoDescriptionKey ?? page.leadKey);
      const image = page.gallery[0] ?? tour.image;
      return {
        title: this.i18n.t(page.seoTitleKey ?? tour.titleKey),
        description,
        image,
        breadcrumbs: [{ name: this.i18n.t('nav.tours'), path: TOURS_PATH }],
        jsonLd: origin
          ? [
              touristTripLd({
                name: this.i18n.t(tour.titleKey),
                description,
                url: localizedUrl(origin, tourPath(tour.id), this.i18n.locale()),
                image: [absoluteUrl(origin, image)],
                organizationId: `${origin}/#organization`,
                price: tour.priceFrom,
                currency: asCurrency(this.catalog.booking().currencyCode),
                inLanguage: page.languages,
                ...(page.latitude !== undefined && page.longitude !== undefined
                  ? {
                      meetingPoint: {
                        name: this.i18n.t(page.meetingKey),
                        latitude: page.latitude,
                        longitude: page.longitude,
                      },
                    }
                  : {}),
              }),
              // The questions are rendered on the page by `TourFaqs`, as Google requires.
              ...(page.faqs?.length
                ? [
                    faqLd(
                      page.faqs.map((faq) => ({
                        question: this.i18n.t(faq.questionKey),
                        answer: this.i18n.t(faq.answerKey),
                      })),
                    ),
                  ]
                : []),
            ]
          : [],
      };
    });
  }

  /** One `view_item` per tour per visit to the page, not per language switch. */
  private trackView(tour: CatalogTour): void {
    if (this.viewed === tour.id) {
      return;
    }

    this.viewed = tour.id;
    this.analytics.track('view_item', {
      currency: asCurrency(this.catalog.booking().currencyCode),
      value: tour.priceFrom,
      items: [tourItem(tour, this.i18n.t(tour.titleKey))],
    });
  }
}
