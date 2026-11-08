import { isPlatformBrowser } from '@angular/common';
import { afterNextRender, computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { asCurrency } from '../analytics/analytics';
import type { Currency } from '../api/booking-api';
import { CatalogService } from '../catalog/catalog';
import type { CatalogTour } from '../catalog/tours';

export const CURRENCIES: readonly Currency[] = ['USD', 'PEN'];
const KEY = 'currency';

/**
 * The currency the visitor looks at, chosen in the header and shared by prices and the booking panel.
 * Kept in the browser only: pages are cached per URL on the server (`page-cache.ts`), so the first render uses the
 * CMS default and the remembered choice is applied right after hydration.
 */
@Injectable({ providedIn: 'root' })
export class CurrencyService {
  private readonly catalog = inject(CatalogService);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly chosen = signal<Currency | null>(null);

  readonly currency = computed<Currency>(
    () => this.chosen() ?? asCurrency(this.catalog.booking().currencyCode),
  );

  constructor() {
    afterNextRender(() => {
      const stored = this.read();
      if (stored) {
        this.chosen.set(stored);
      }
    });
  }

  set(currency: Currency): void {
    this.chosen.set(currency);
    if (this.browser) {
      try {
        localStorage.setItem(KEY, currency);
      } catch {
        // storage blocked: the choice lasts for this visit only
      }
    }
  }

  private read(): Currency | null {
    try {
      const value = localStorage.getItem(KEY);
      return value === 'USD' || value === 'PEN' ? value : null;
    } catch {
      return null;
    }
  }
}

/**
 * The price shown for a tour. Soles need an explicit `pricePen` from the CMS (there is no exchange rate in the site);
 * a tour without one keeps showing dollars so the card never loses its price.
 */
export function priceIn(
  tour: Pick<CatalogTour, 'priceFrom' | 'pricePen'>,
  currency: Currency,
): { currency: Currency; amount: number } {
  return currency === 'PEN' && tour.pricePen
    ? { currency: 'PEN', amount: tour.pricePen }
    : { currency: 'USD', amount: tour.priceFrom };
}
