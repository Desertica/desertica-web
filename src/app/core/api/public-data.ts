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
import { API_URL, ApiClient } from './api-client';
import type { components } from './schema';

export type PublicTour = components['schemas']['PublicTour'];
export type PublicBookingRules = components['schemas']['PublicBookingRules'];
export type PublicCompany = components['schemas']['PublicCompany'];

type State = {
  tours: Record<string, PublicTour>;
  rules: PublicBookingRules | null;
  company: PublicCompany | null;
};
const EMPTY: State = { tours: {}, rules: null, company: null };
const KEY = makeStateKey<State>('api-public-data');
/** An API that does not answer must not hold the page render. */
export const PUBLIC_API_TIMEOUT_MS = 4000;

/**
 * Data whose owner is the booking system, not the CMS: each tour's operational data (`GET /public/tours`), the
 * booking rules (`GET /public/booking-rules`) and the fiscal identity (`GET /public/company`).
 * Loaded once per request on the server (the API URL never reaches the browser) and handed over in TransferState.
 * Without an API, or when it fails, every reader answers "nothing" and the page hides that element.
 */
@Injectable({ providedIn: 'root' })
export class PublicData {
  private readonly state = signal<State>(EMPTY);

  constructor() {
    const transfer = inject(TransferState);
    if (!isPlatformServer(inject(PLATFORM_ID))) {
      this.state.set(transfer.get(KEY, EMPTY));
      return;
    }

    if (!inject(API_URL)) {
      return;
    }

    const api = inject(ApiClient).http;
    inject(PendingTasks).run(async () => {
      const none = () => ({ data: undefined });
      const signal = AbortSignal.timeout(PUBLIC_API_TIMEOUT_MS);
      const [tours, rules, company] = await Promise.all([
        api.GET('/public/tours', { signal }).catch(none),
        api.GET('/public/booking-rules', { signal }).catch(none),
        api.GET('/public/company', { signal }).catch(none),
      ]);
      const loaded: State = {
        tours: Object.fromEntries((tours.data?.data ?? []).map((tour) => [tour.slug, tour])),
        rules: rules.data ?? null,
        company: company.data ?? null,
      };
      transfer.set(KEY, loaded);
      this.state.set(loaded);
    });
  }

  /** Operational data of the tour with that slug; `undefined` when the API does not know it. */
  tour(slug: string): PublicTour | undefined {
    return this.state().tours[slug];
  }

  rules(): PublicBookingRules | null {
    return this.state().rules;
  }

  /** Razón social and RUC; `null` when the API has no company configured. */
  company(): PublicCompany | null {
    return this.state().company;
  }
}

/** Map link of the meeting point: the API link when there is one, otherwise a Google Maps search from the coordinates. */
export function meetingMapUrl(tour: PublicTour | undefined): string | null {
  if (tour?.meetingPointUrl) {
    return tour.meetingPointUrl;
  }

  return typeof tour?.latitude === 'number' && typeof tour.longitude === 'number'
    ? `https://www.google.com/maps/search/?api=1&query=${tour.latitude},${tour.longitude}`
    : null;
}
