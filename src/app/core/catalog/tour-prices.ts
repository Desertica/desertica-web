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
import { PUBLIC_API_TIMEOUT_MS } from '../api/public-data';

type FromPrices = Partial<Record<Currency, Record<string, number>>>;
const KEY = makeStateKey<FromPrices>('tour-prices');

/**
 * The "from" price of each tour comes from the booking system (`GET /public/tour-prices`), not from the CMS.
 * Loaded once per request on the server (the API URL never reaches the browser) and handed over in TransferState.
 * A tour without a price in the API shows no price: the CMS no longer has one.
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
            .GET('/public/tour-prices', {
              params: { query: { currency } },
              signal: AbortSignal.timeout(PUBLIC_API_TIMEOUT_MS),
            })
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

  /**
   * "From" price of the tour in `currency`. Without a soles price it answers the dollar one, so the card keeps
   * a price; `null` when the booking system has none (or is unreachable) and the price is left out.
   */
  priceFor(slug: string, currency: Currency): { currency: Currency; amount: number } | null {
    const prices = this.prices();
    for (const code of [currency, 'USD'] as const) {
      const cents = prices[code]?.[slug];
      if (cents !== undefined) {
        return { currency: code, amount: Math.round(cents) / 100 };
      }
    }

    return null;
  }

  /** The "from" amount in exactly that currency (JSON-LD, analytics, messages); `undefined` when there is none. */
  amount(slug: string, currency: Currency): number | undefined {
    const cents = this.prices()[currency]?.[slug];
    return cents === undefined ? undefined : Math.round(cents) / 100;
  }
}
