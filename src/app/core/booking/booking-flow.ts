import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import {
  BookingApi,
  type ApiResult,
  type Currency,
  type Hold,
  type PaymentOption,
  type Quote,
  type TourFormat,
} from '../api/booking-api';

/** What the visitor picked on the tour page, ready to become a booking. */
export type BookingSelection = {
  tourSlug: string;
  departureId: string;
  startsAt: string;
  meetingPoint: string | null;
  currency: Currency;
  format: TourFormat;
  language: string;
  adults: number;
  children: number;
  quote: Quote;
};

/** Kept for the rest of the visit so a reload on the payment or booking page still works. */
export type RememberedBooking = {
  accessToken: string;
  paymentOptions: PaymentOption[];
  format: TourFormat;
};

const CHECKOUT_KEY = 'desertica-checkout';
const BOOKING_KEY = 'desertica-booking:';

type StoredCheckout = { selection: BookingSelection; hold: Hold };

/**
 * State of the checkout: the chosen departure, the seat hold and its countdown, and the access
 * tokens of bookings created in this browser tab. Everything lives in sessionStorage, so it ends
 * with the tab and never reaches the server except through the API calls themselves.
 */
@Injectable({ providedIn: 'root' })
export class BookingFlow {
  private readonly api = inject(BookingApi);
  private readonly document = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly clock = signal(Date.now());
  private timer: ReturnType<typeof setInterval> | null = null;
  private restored = false;

  readonly selection = signal<BookingSelection | null>(null);
  readonly hold = signal<Hold | null>(null);
  readonly secondsLeft = computed(() => {
    const hold = this.hold();
    return hold ? Math.max(0, Math.ceil((Date.parse(hold.expiresAt) - this.clock()) / 1000)) : 0;
  });
  readonly expired = computed(() => this.hold() !== null && this.secondsLeft() === 0);

  /** Reads a saved checkout (browser only, once). A hold that already ran out is dropped. */
  restore(): void {
    if (!this.browser || this.restored) {
      return;
    }

    this.restored = true;
    const stored = this.read<StoredCheckout>(CHECKOUT_KEY);
    if (stored?.selection && stored.hold && Date.parse(stored.hold.expiresAt) > Date.now()) {
      this.selection.set(stored.selection);
      this.hold.set(stored.hold);
      this.startClock();
    } else {
      this.write(CHECKOUT_KEY, null);
    }
  }

  /** Holds the seats for `selection`, releasing any hold from an earlier choice first. */
  async reserve(selection: BookingSelection): Promise<ApiResult<Hold>> {
    const previous = this.hold();
    const result = await this.api.createHold({
      departureId: selection.departureId,
      seats: selection.adults + selection.children,
    });
    if (!result.ok) {
      return result;
    }

    if (previous) {
      void this.api.releaseHold(previous.token);
    }

    this.selection.set(selection);
    this.hold.set(result.data);
    this.write(CHECKOUT_KEY, { selection, hold: result.data });
    this.startClock();
    return result;
  }

  /** Gives the seats back (the visitor changed their mind or left the checkout). */
  async release(): Promise<void> {
    const hold = this.hold();
    this.clear();
    if (hold) {
      await this.api.releaseHold(hold.token);
    }
  }

  /** Forgets the selection and hold without calling the API (the hold became a booking). */
  clear(): void {
    this.stopClock();
    this.selection.set(null);
    this.hold.set(null);
    this.write(CHECKOUT_KEY, null);
  }

  remember(reference: string, booking: RememberedBooking): void {
    this.write(BOOKING_KEY + reference, booking);
  }

  remembered(reference: string): RememberedBooking | null {
    return this.read<RememberedBooking>(BOOKING_KEY + reference);
  }

  /** Stores a token that arrived through the e-mailed link. */
  rememberToken(reference: string, accessToken: string): void {
    const current = this.remembered(reference);
    this.remember(reference, {
      paymentOptions: [],
      format: 'SHARED',
      ...current,
      accessToken,
    });
  }

  private startClock(): void {
    this.stopClock();
    this.clock.set(Date.now());
    if (this.browser) {
      this.timer = setInterval(() => {
        this.clock.set(Date.now());
        if (this.secondsLeft() === 0) {
          this.stopClock();
        }
      }, 1000);
    }
  }

  private stopClock(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private read<T>(key: string): T | null {
    try {
      const raw = this.document.defaultView?.sessionStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  private write(key: string, value: unknown): void {
    try {
      const storage = this.document.defaultView?.sessionStorage;
      if (value === null) {
        storage?.removeItem(key);
      } else {
        storage?.setItem(key, JSON.stringify(value));
      }
    } catch {
      // Without storage the checkout still works until the page is reloaded.
    }
  }
}
