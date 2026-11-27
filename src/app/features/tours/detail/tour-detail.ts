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
import { lucideDownload } from '@ng-icons/lucide';
import { simpleWhatsapp } from '../../../core/layout/footer-social-icons';
import { HlmButton } from '@spartan-ng/helm/button';
import { PublicData, meetingMapUrl } from '../../../core/api/public-data';
import { tourHasDetails } from '../../../core/catalog/tour-pages';
import { TourPrices } from '../../../core/catalog/tour-prices';
import { type CatalogTour, TOURS_PATH, tourPath } from '../../../core/catalog/tours';
import { I18nService } from '../../../core/i18n/i18n';
import { TranslatePipe } from '../../../core/i18n/translate-pipe';
import { faqLd, touristTripLd } from '../../../core/seo/json-ld';
import { usePageMeta } from '../../../core/seo/page-meta';
import { snippet } from '../../../core/seo/snippet';
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
  providers: [provideIcons({ lucideDownload })],
})
export class TourDetail {
  private readonly seo = inject(SeoService);
  private readonly analytics = inject(AnalyticsService);
  private viewed: string | null = null;
  protected readonly whatsappIcon = simpleWhatsapp;

  readonly id = input.required<string>();
  protected readonly i18n = inject(I18nService);
  private readonly catalog = inject(CatalogService);
  protected readonly resolved = computed(() => this.catalog.resolvedTour(this.id()));
  protected readonly hasDetails = tourHasDetails;
  private readonly prices = inject(TourPrices);
  private readonly publicData = inject(PublicData);
  /** Meeting point of the booking system: its text in the page language and the map link, each only when set. */
  protected readonly meeting = computed(() => {
    const api = this.publicData.tour(this.id());
    const text = api?.meetingPoint?.[this.i18n.locale()] ?? '';
    const map = meetingMapUrl(api);
    return text || map ? { text, map } : null;
  });
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
    // The message names dollars; without both API values the plain message is sent instead of an invented one.
    const hours = this.publicData.tour(data.tour.id)?.durationHours;
    const price = this.prices.amount(data.tour.id, 'USD');
    const complete = !!hours && price !== undefined;
    return buildAskWhatsappHref(
      whatsapp,
      this.i18n.t(complete ? 'tour.askWhatsappMessage' : 'tour.askWhatsappMessagePlain'),
      {
        tour: this.i18n.t(data.tour.titleKey),
        hours: String(hours ?? ''),
        price: String(price ?? ''),
        url: origin ? localizedUrl(origin, tourPath(data.tour.id), locale) : '',
      },
    );
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
      const description = snippet(this.i18n.t(page.seoDescriptionKey ?? page.leadKey));
      const image = page.gallery[0] ?? tour.image;
      const currency = asCurrency(this.catalog.booking().currencyCode);
      const api = this.publicData.tour(tour.id);
      const meetingName = api?.meetingPoint?.[this.i18n.locale()];
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
                price: this.prices.amount(tour.id, currency),
                currency,
                inLanguage: api?.languages ?? [],
                ...(meetingName && typeof api?.latitude === 'number' && typeof api.longitude === 'number'
                  ? {
                      meetingPoint: {
                        name: meetingName,
                        latitude: api.latitude,
                        longitude: api.longitude,
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
    const currency = asCurrency(this.catalog.booking().currencyCode);
    const value = this.prices.amount(tour.id, currency);
    this.analytics.track('view_item', {
      currency,
      ...(value === undefined ? {} : { value }),
      items: [tourItem(tour, this.i18n.t(tour.titleKey), undefined, value)],
    });
  }
}
