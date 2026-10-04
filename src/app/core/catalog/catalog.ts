import { isPlatformBrowser } from '@angular/common';
import {
  Injectable,
  PLATFORM_ID,
  TransferState,
  computed,
  inject,
  makeStateKey,
  signal,
} from '@angular/core';
import { withBookingDefaults, withFormDefaults, withIntroDefaults } from '../cms/booking-defaults';
import { CmsApi } from '../cms/cms-api';
import type { BlogPost, CmsPage, CmsSnapshot, MediaSlot, Product } from '../cms/cms-models';
import { contactFromSite, withSiteDefaults } from '../cms/site-defaults';
import { type AppLocale } from '../i18n/catalogs';
import { I18nService } from '../i18n/i18n';
import {
  buildFooterDestinations,
  buildFooterSocials,
  buildFooterStamps,
  footerBrandLinks,
  footerLegalLinks,
  footerLinksFrom,
} from '../layout/footer-nav';
import { buildPrimaryNavLinks, planTripLink } from '../layout/primary-nav';
import { CmsThemeStyles } from '../theme/cms-theme';
import { tourPage, type TourPage } from './tour-pages';
import { type CatalogDestination, type CatalogTour, tourDestinations } from './tours';

const SNAPSHOT_KEY = makeStateKey<CmsSnapshot | null>('cms-snapshot');

/**
 * Single source for destinations, tours, site settings, media and CMS pages. Content comes from
 * Strapi when `STRAPI_URL` is configured on the server and falls back to the bundled static
 * catalog otherwise, so the app keeps working without a CMS.
 */
@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly api = inject(CmsApi);
  private readonly i18n = inject(I18nService);
  private readonly transfer = inject(TransferState);
  private readonly themeStyles = inject(CmsThemeStyles);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly snapshot = signal<CmsSnapshot | null>(null);

  readonly destinations = computed<readonly CatalogDestination[]>(() => {
    const cms = this.snapshot()?.destinations;
    return cms?.length ? cms : tourDestinations;
  });
  readonly tours = computed<readonly CatalogTour[]>(() =>
    this.destinations().flatMap((destination) => destination.tours),
  );
  readonly featuredTours = computed(() => this.tours().filter((tour) => tour.featured));
  readonly site = computed(() => withSiteDefaults(this.snapshot()?.site));
  readonly contact = computed(() => contactFromSite(this.site()));
  readonly socials = computed(() => buildFooterSocials(this.site()));
  readonly navLinks = computed(() =>
    buildPrimaryNavLinks(this.destinations(), this.snapshot()?.navigation?.headerLinks),
  );
  readonly planTrip = computed<{ labelKey: string; path: string }>(
    () => this.snapshot()?.navigation?.planTrip ?? planTripLink,
  );
  readonly footerBrandLinks = computed(() => {
    const links = this.snapshot()?.navigation?.footerBrandLinks;
    return links?.length ? footerLinksFrom(links) : footerBrandLinks;
  });
  readonly footerLegalLinks = computed(() => {
    const links = this.snapshot()?.navigation?.footerLegalLinks;
    return links?.length ? footerLinksFrom(links) : footerLegalLinks;
  });
  readonly booking = computed(() => withBookingDefaults(this.snapshot()?.booking));
  readonly forms = computed(() => withFormDefaults(this.snapshot()?.forms));
  readonly introStyle = computed(() => withIntroDefaults(this.snapshot()?.theme?.intro));
  readonly footerDestinations = computed(() => buildFooterDestinations(this.destinations()));
  readonly footerStamps = computed(() => buildFooterStamps(this.snapshot()?.media ?? {}));
  readonly posts = computed<readonly BlogPost[]>(() => this.snapshot()?.posts ?? []);
  readonly products = computed<readonly Product[]>(() => this.snapshot()?.products ?? []);
  readonly enabled = computed(() => this.snapshot() !== null);

  /** Runs before the first render: server fetches from Strapi, browser reads TransferState. */
  async init(): Promise<void> {
    if (this.browser) {
      const transferred = this.transfer.get(SNAPSHOT_KEY, null);
      if (transferred) {
        this.apply(transferred);
      }

      return;
    }

    if (!this.api.enabled) {
      return;
    }

    const snapshot = await this.api.load({
      mediaBase: this.api.publicUrl,
      fallbackImage: (kind, slug) => this.fallbackImage(kind, slug),
    });
    if (snapshot) {
      this.transfer.set(SNAPSHOT_KEY, snapshot);
      this.apply(snapshot);
    }
  }

  destinationById(id: string): CatalogDestination | undefined {
    return this.destinations().find((destination) => destination.id === id);
  }

  tourById(id: string): CatalogTour | undefined {
    return this.tours().find((tour) => tour.id === id);
  }

  tourPage(tour: CatalogTour): TourPage {
    return this.snapshot()?.tourPages[tour.id] ?? tourPage(tour);
  }

  resolvedTour(id: string): { tour: CatalogTour; page: TourPage } | undefined {
    const tour = this.tourById(id);
    return tour ? { tour, page: this.tourPage(tour) } : undefined;
  }

  tourDestination(tour: CatalogTour): CatalogDestination | undefined {
    return this.destinationById(tour.destination);
  }

  /** CMS media slot (`tours.banner`, `about.trio`, ...) or `undefined` when unset. */
  media(slot: string): MediaSlot | undefined {
    return this.snapshot()?.media[slot];
  }

  mediaImage(slot: string, fallback: string): string {
    return this.media(slot)?.image ?? fallback;
  }

  page(slug: string): CmsPage | undefined {
    return this.snapshot()?.pages[slug];
  }

  post(slug: string): BlogPost | undefined {
    return this.posts().find((post) => post.slug === slug);
  }

  product(slug: string): Product | undefined {
    return this.products().find((product) => product.slug === slug);
  }

  /** Localized value of a CMS page/post/product block, falling back to English. */
  localized<T>(source: Partial<Record<AppLocale, T>>, locale: AppLocale): T | undefined {
    return source[locale] ?? source.en ?? Object.values(source)[0];
  }

  private apply(snapshot: CmsSnapshot): void {
    this.snapshot.set(snapshot);
    this.i18n.setOverlay(snapshot.messages);
    this.themeStyles.apply(snapshot.theme);
  }

  private fallbackImage(kind: 'destination' | 'tour', slug: string): string {
    if (kind === 'destination') {
      return tourDestinations.find((destination) => destination.id === slug)?.image ?? '';
    }

    return (
      tourDestinations.flatMap((item) => item.tours).find((tour) => tour.id === slug)?.image ?? ''
    );
  }
}
