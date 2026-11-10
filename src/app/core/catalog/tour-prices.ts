import { isPlatformServer } from '@angular/common';
import {
  Injectable,
  PLATFORM_ID,
  PendingTasks,
  TransferState,
  inject,
  makeStateKey,
  signal,
} from '@angular/core';
import { API_URL, ApiClient } from '../api/api-client';
import type { Currency } from '../api/booking-api';
import { priceIn } from '../currency/currency';
import type { CatalogTour } from './tours';

type FromPrices = Partial<Record<Currency, Record<string, number>>>;
const KEY = makeStateKey<FromPrices>('tour-prices');

/**
 * The "from" price of each tour comes from the booking system (`GET /public/tour-prices`), not from the CMS.
 * Loaded once per request on the server (the API URL never reaches the browser) and handed over in TransferState.
 * A tour without a price in the API keeps the CMS value, so nothing shows empty while prices are being loaded.
 */
@Injectable({ providedIn: 'root' })
export class TourPrices {
  private readonly prices = signal<FromPrices>({});

  constructor() {
    const state = inject(TransferState);
    if (!isPlatformServer(inject(PLATFORM_ID))) {
      this.prices.set(state.get(KEY, {}));
      return;
    }

    if (!inject(API_URL)) {
      return;
    }

    const api = inject(ApiClient).http;
    inject(PendingTasks).run(async () => {
      const loaded: FromPrices = {};
      await Promise.all(
        (['USD', 'PEN'] as const).map(async (currency) => {
          const { data } = await api
            .GET('/public/tour-prices', { params: { query: { currency } } })
            .catch(() => ({ data: undefined }));
          if (data) {
            loaded[currency] = Object.fromEntries(data.data.map((p) => [p.slug, p.fromCents]));
          }
        }),
      );
      state.set(KEY, loaded);
      this.prices.set(loaded);
    });
  }

  /** Price to show for `tour` in `currency`: the booking system's, else the CMS one (`priceIn`). */
  priceFor(tour: CatalogTour, currency: Currency): { currency: Currency; amount: number } {
    const cents = this.prices()[currency]?.[tour.id];
    return cents === undefined
      ? priceIn(tour, currency)
      : { currency, amount: Math.round(cents) / 100 };
  }
}
