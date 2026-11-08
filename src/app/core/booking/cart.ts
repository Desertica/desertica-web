import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, afterNextRender, computed, inject, signal } from '@angular/core';
import type { Currency } from '../api/booking-api';
import type { BookingSelection } from './booking-flow';

const KEY = 'desertica-cart';

/** A stored item with the shape the cart needs and a departure that has not left; anything else is dropped. */
function isUsable(value: unknown): value is BookingSelection {
  const item = value as Partial<BookingSelection> | null;
  return (
    !!item &&
    typeof item.departureId === 'string' &&
    typeof item.tourSlug === 'string' &&
    typeof item.startsAt === 'string' &&
    Date.parse(item.startsAt) > Date.now() &&
    (item.currency === 'USD' || item.currency === 'PEN') &&
    Number.isInteger(item.adults) &&
    Number.isInteger(item.children) &&
    typeof item.quote?.totalCents === 'number'
  );
}

/**
 * Tours the visitor picked and has not reserved yet. A selection is stored without seat hold: the seats are
 * held only when one of them goes to checkout, so a cart left open never blocks other visitors.
 * Kept in sessionStorage (it ends with the tab); the first render is empty and the saved cart appears after hydration.
 */
@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly items = signal<readonly BookingSelection[]>([]);
  /** `false` until the saved cart has been read after hydration, so the page does not flash an empty cart. */
  readonly ready = signal(false);

  /** People in the cart, shown on the header badge. */
  readonly count = computed(() => this.items().reduce((sum, item) => sum + item.adults + item.children, 0));
  /** One total per currency: items chosen in another currency are not converted. */
  readonly totals = computed(() => {
    const byCurrency = new Map<Currency, number>();
    for (const item of this.items()) {
      byCurrency.set(item.currency, (byCurrency.get(item.currency) ?? 0) + item.quote.totalCents);
    }

    return [...byCurrency].map(([currency, cents]) => ({ currency, cents }));
  });

  constructor() {
    afterNextRender(() => {
      const saved = this.read();
      if (saved.length) {
        this.items.set(saved);
      }

      this.ready.set(true);
    });
  }

  /** Adding a departure that is already in the cart replaces it, so changing the group does not duplicate it. */
  add(selection: BookingSelection): void {
    this.set([...this.items().filter((item) => item.departureId !== selection.departureId), selection]);
  }

  remove(departureId: string): void {
    this.set(this.items().filter((item) => item.departureId !== departureId));
  }

  clear(): void {
    this.set([]);
  }

  private set(items: readonly BookingSelection[]): void {
    this.items.set(items);
    if (!this.browser) {
      return;
    }

    try {
      sessionStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      // Storage can be blocked: the cart still works for this page.
    }
  }

  private read(): BookingSelection[] {
    try {
      const parsed: unknown = JSON.parse(sessionStorage.getItem(KEY) ?? '[]');
      return Array.isArray(parsed) ? parsed.filter(isUsable) : [];
    } catch {
      return [];
    }
  }
}
