import { Injectable, inject } from '@angular/core';
import { ApiClient } from './api-client';
import type { components } from './schema';

type Schemas = components['schemas'];

export type Currency = Schemas['Currency'];
export type TourFormat = Schemas['TourFormat'];
export type IdDocType = Schemas['IdDocType'];
export type AvailableDeparture = Schemas['AvailableDeparture'];
export type Quote = Schemas['Quote'];
export type QuoteRequest = Schemas['QuoteRequest'];
export type Hold = Schemas['Hold'];
export type CreatePublicBooking = Schemas['CreatePublicBooking'];
export type PublicBooking = Schemas['PublicBooking'];
export type PublicBookingCreated = Schemas['PublicBookingCreated'];
export type LegalDocument = Schemas['LegalDocument'];
export type PaymentOption = NonNullable<PublicBookingCreated['paymentOptions']>[number];

export type ApiFailure = {
  ok: false;
  /** HTTP status, or `0` when the request never got an answer. */
  status: number;
  message: string;
  /** Seconds, from `Retry-After`, when the API asks the client to wait. */
  retryAfter?: number;
};
export type ApiResult<T> = { ok: true; data: T } | ApiFailure;

type Raw<T> = { data?: T; error?: unknown; response: Response };

/** Maps an `openapi-fetch` answer (or a network error) onto `ApiResult`. */
async function settle<T>(call: Promise<Raw<T>>): Promise<ApiResult<T>> {
  try {
    const { data, error, response } = await call;
    if (response.ok && data !== undefined) {
      return { ok: true, data };
    }

    if (response.ok) {
      // 202/204 carry no body: success without data.
      return { ok: true, data: undefined as T };
    }

    const retry = Number(response.headers.get('retry-after'));
    return {
      ok: false,
      status: response.status,
      message: messageOf(error),
      ...(Number.isFinite(retry) && retry > 0 ? { retryAfter: retry } : {}),
    };
  } catch {
    return { ok: false, status: 0, message: 'network' };
  }
}

function messageOf(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message: unknown }).message;
    return Array.isArray(message) ? message.join(', ') : String(message);
  }

  return 'error';
}

/**
 * Thin wrapper over the public operations of the API contract. Every method keeps the operation's
 * own request and response types; money stays in minor units (`*Cents`) until a view formats it.
 */
@Injectable({ providedIn: 'root' })
export class BookingApi {
  private readonly api = inject(ApiClient).http;

  availability(
    slug: string,
    query: { month: string; currency: Currency; format?: TourFormat; language?: string },
  ): Promise<ApiResult<{ data: AvailableDeparture[] }>> {
    return settle(
      this.api.GET('/public/tours/{slug}/availability', {
        params: { path: { slug }, query },
      }),
    );
  }

  quote(body: QuoteRequest): Promise<ApiResult<Quote>> {
    return settle(this.api.POST('/public/quotes', { body }));
  }

  createHold(body: { departureId: string; seats: number }): Promise<ApiResult<Hold>> {
    return settle(this.api.POST('/public/holds', { body }));
  }

  releaseHold(token: string): Promise<ApiResult<void>> {
    return settle(this.api.DELETE('/public/holds/{token}', { params: { path: { token } } }));
  }

  createBooking(
    body: CreatePublicBooking,
    idempotencyKey: string,
  ): Promise<ApiResult<PublicBookingCreated>> {
    return settle(
      this.api.POST('/public/bookings', {
        body,
        params: { header: { 'Idempotency-Key': idempotencyKey } },
      }),
    );
  }

  requestBookingAccess(body: { reference: string; email: string }): Promise<ApiResult<void>> {
    return settle(this.api.POST('/public/bookings/access', { body }));
  }

  booking(reference: string, accessToken: string): Promise<ApiResult<PublicBooking>> {
    return settle(
      this.api.GET('/public/bookings/{reference}', {
        params: { path: { reference } },
        // The booking token is a security scheme, so the contract does not type it as a parameter.
        headers: { 'X-Booking-Token': accessToken },
      }),
    );
  }

  legalDocuments(locale: string): Promise<ApiResult<{ data: LegalDocument[] }>> {
    return settle(
      this.api.GET('/public/legal-documents/current', { params: { query: { locale } } }),
    );
  }
}
