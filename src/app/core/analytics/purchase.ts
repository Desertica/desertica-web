import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import type { PublicBooking } from '../api/booking-api';
import { CatalogService } from '../catalog/catalog';
import { I18nService } from '../i18n/i18n';
import { AnalyticsService, centsToMajor } from './analytics';
import { tourItem } from './items';

const KEY = 'desertica-purchase:';
const PAID_STATUSES: readonly string[] = ['CONFIRMED', 'COMPLETED'];

type Tracked = { paidCents: number; count: number };

/**
 * Publishes `purchase` once per payment the API has confirmed. The browser never decides that a
 * payment happened: this runs on a booking read back from the API whose `paidCents` grew. Each
 * payment gets its own `<reference>-<n>` (n = 1 for the full amount or the deposit, 2 for the
 * balance) so GA4 and Meta, which drop repeated ids, count the second payment too. What was already
 * reported lives in localStorage, so reloading or reopening "my booking" never repeats an event.
 */
@Injectable({ providedIn: 'root' })
export class PurchaseTracker {
  private readonly document = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly analytics = inject(AnalyticsService);
  private readonly catalog = inject(CatalogService);
  private readonly i18n = inject(I18nService);

  /** Returns true when an event was published. */
  record(booking: PublicBooking): boolean {
    if (!this.browser || !PAID_STATUSES.includes(booking.status) || booking.paidCents <= 0) {
      return false;
    }

    const storage = this.document.defaultView?.localStorage;
    const tracked = this.read(booking.reference);
    const collected = booking.paidCents - tracked.paidCents;
    if (collected <= 0) {
      return false;
    }

    const count = tracked.count + 1;
    try {
      storage?.setItem(
        KEY + booking.reference,
        JSON.stringify({ paidCents: booking.paidCents, count } satisfies Tracked),
      );
    } catch {
      // Without storage a reload could repeat the event, which the shared id lets GA4 drop.
    }

    const tour = this.catalog.tourById(booking.tourSlug);
    const id = `${booking.reference}-${count}`;
    this.analytics.track('purchase', {
      transaction_id: id,
      currency: booking.currency,
      value: centsToMajor(collected),
      items: tour
        ? [
            {
              ...tourItem(tour, this.i18n.t(tour.titleKey), booking.format),
              quantity: (booking.adults ?? 0) + (booking.children ?? 0),
            },
          ]
        : [{ item_id: booking.tourSlug, item_name: booking.tourSlug }],
      event_id: id,
    });
    return true;
  }

  private read(reference: string): Tracked {
    try {
      const raw = this.document.defaultView?.localStorage.getItem(KEY + reference);
      if (!raw) {
        return { paidCents: 0, count: 0 };
      }

      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed === 'number') {
        // Ola 1 stored only the cents already reported.
        return { paidCents: parsed, count: parsed > 0 ? 1 : 0 };
      }

      const value = parsed as Partial<Tracked>;
      return { paidCents: Number(value.paidCents) || 0, count: Number(value.count) || 0 };
    } catch {
      return { paidCents: 0, count: 0 };
    }
  }
}
