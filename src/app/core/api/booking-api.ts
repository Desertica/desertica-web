import { Injectable, inject } from '@angular/core';
import { ApiClient } from './api-client';
import type { components, paths } from './schema';

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
export type PaymentOption = PublicBooking['paymentOptions'][number];
export type PaymentKind = Schemas['PaymentKind'];
export type StripeIntent = Schemas['StripeIntent'];
export type CulqiChargeResult = Schemas['CulqiChargeResult'];
export type PaymentLinkInfo = Schemas['PaymentLinkInfo'];
export type WaiverForm = Schemas['WaiverForm'];
export type SignWaiver = NonNullable<
  paths['/public/waivers/{token}/sign']['post']['requestBody']
>['content']['application/json'];

/**
 * What a payment is made against: a booking (the visitor holds its access token) or a payment link
 * from an e-mail (the link token itself is the credential).
 */
export type PayTarget =
  | { type: 'booking'; reference: string; accessToken: string }
  | { type: 'link'; token: string };

/**
 * Culqi's 3DS step needs the device id and the browser's authentication parameters on a second
 * charge. The contract's `CulqiChargeRequest` has neither yet (see "Contract change requests" in
 * the PR), so they travel as extra properties that the typed client would otherwise reject.
 */
export type CulqiChargeInput = {
  kind: PaymentKind;
  token: string;
  email: string;
  deviceId?: string;
  authentication3DS?: Record<string, unknown>;
};

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

  /** The same token goes in the header for bookings and in the path for payment links. */
  stripeIntent(
    target: PayTarget,
    kind: PaymentKind,
    idempotencyKey: string,
  ): Promise<ApiResult<StripeIntent>> {
    if (target.type === 'link') {
      return settle(
        this.api.POST('/public/payment-links/{token}/stripe-intent', {
          params: { path: { token: target.token }, header: { 'Idempotency-Key': idempotencyKey } },
        }),
      );
    }

    return settle(
      this.api.POST('/public/bookings/{reference}/payments/stripe-intent', {
        body: { kind },
        params: {
          path: { reference: target.reference },
          header: { 'Idempotency-Key': idempotencyKey },
        },
        headers: { 'X-Booking-Token': target.accessToken },
      }),
    );
  }

  culqiCharge(
    target: PayTarget,
    input: CulqiChargeInput,
    idempotencyKey: string,
  ): Promise<ApiResult<CulqiChargeResult>> {
    const header = { 'Idempotency-Key': idempotencyKey };
    if (target.type === 'link') {
      const { kind: _kind, ...body } = input;
      return settle(
        this.api.POST('/public/payment-links/{token}/culqi-charge', {
          body,
          params: { path: { token: target.token }, header },
        }),
      );
    }

    return settle(
      this.api.POST('/public/bookings/{reference}/payments/culqi-charge', {
        body: input,
        params: { path: { reference: target.reference }, header },
        headers: { 'X-Booking-Token': target.accessToken },
      }),
    );
  }

  paymentLink(token: string): Promise<ApiResult<PaymentLinkInfo>> {
    return settle(
      this.api.GET('/public/payment-links/{token}', { params: { path: { token } } }),
    );
  }

  waiver(token: string): Promise<ApiResult<WaiverForm>> {
    return settle(this.api.GET('/public/waivers/{token}', { params: { path: { token } } }));
  }

  signWaiver(token: string, body: SignWaiver): Promise<ApiResult<WaiverForm>> {
    return settle(
      this.api.POST('/public/waivers/{token}/sign', { body, params: { path: { token } } }),
    );
  }

  recordConsent(body: {
    anonymousId: string;
    categories: Record<string, boolean>;
    policyVersion: number;
  }): Promise<ApiResult<void>> {
    return settle(this.api.POST('/public/consents', { body }));
  }
}
