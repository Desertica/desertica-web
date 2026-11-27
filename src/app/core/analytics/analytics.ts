import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, Injector, PLATFORM_ID, effect, inject } from '@angular/core';
import { AttributionService } from './attribution';
import { ConsentService } from './consent';
import { dataLayerOf } from './data-layer';
import { GtmLoader } from './gtm';

export type Currency = 'USD' | 'PEN';
export type ItemVariant = 'SHARED' | 'PRIVATE';

export type AnalyticsItem = {
  /** Tour slug. */
  item_id: string;
  /** Tour title in the page language. */
  item_name: string;
  /** Destination slug. */
  item_category?: string;
  item_variant?: ItemVariant;
  /** Unit price in major units, VAT included. */
  price?: number;
  quantity?: number;
};

/** Mirrors `docs/analytics-events.md` in desertica-api. Amounts are major units, not cents. */
export type AnalyticsEvents = {
  view_item_list: { item_list_name: string; items: AnalyticsItem[] };
  select_item: { item_list_name: string; items: AnalyticsItem[] };
  /** `value` is left out when the booking system has no price for the tour. */
  view_item: { currency: Currency; value?: number; items: AnalyticsItem[] };
  begin_checkout: { currency: Currency; value: number; items: AnalyticsItem[]; event_id: string };
  add_payment_info: {
    currency: Currency;
    value: number;
    payment_type: 'culqi';
    event_id: string;
  };
  purchase: {
    transaction_id: string;
    currency: Currency;
    value: number;
    items: AnalyticsItem[];
    event_id: string;
  };
  generate_lead: { form: 'contact' };
  click_whatsapp: { placement: string };
  cancel_booking: { transaction_id: string };
};

export type AnalyticsEventName = keyof AnalyticsEvents;

/** The CMS stores the currency as free text; analytics only knows the two the API sells in. */
export function asCurrency(code: string): Currency {
  return code.trim().toUpperCase() === 'PEN' ? 'PEN' : 'USD';
}

/** Converts an API amount in minor units (`12350`) to the major units GA4 and Meta expect (`123.5`). */
export function centsToMajor(cents: number): number {
  return Math.round(cents) / 100;
}

/**
 * Typed publisher for the data layer. It never talks to Google or Meta itself: GTM does. The
 * container is only loaded after the visitor accepts analytics or marketing, and GTM then fires a
 * category's tags only when the matching Consent Mode signal is granted. Server rendering pushes
 * nothing.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly consent = inject(ConsentService);
  private readonly gtm = inject(GtmLoader);
  private readonly attribution = inject(AttributionService);
  private readonly injector = inject(Injector);

  /**
   * Browser only. Runs from the root component's constructor, before any page can publish an
   * event, so the denied Consent Mode default is always the first entry in the data layer. GTM
   * loads as soon as analytics or marketing is granted (a stored choice or the banner), without a
   * page reload; until then no request reaches Google.
   */
  start(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.consent.init();
    this.attribution.capture();
    effect(
      () => {
        if (this.consent.analytics() || this.consent.marketing()) {
          this.gtm.load();
        }
      },
      { injector: this.injector },
    );
  }

  track<E extends AnalyticsEventName>(event: E, params: AnalyticsEvents[E]): void {
    const layer = dataLayerOf(this.document, this.platformId);
    if (layer) {
      layer.push({ event, ...params });
    }
  }
}
