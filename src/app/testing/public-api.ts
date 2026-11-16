import { TransferState, makeStateKey } from '@angular/core';
import type { TestBed as TestBedType } from '@angular/core/testing';
import type { PublicBookingRules, PublicCompany, PublicTour } from '../core/api/public-data';

/** A tour as `GET /public/tours` answers it, with nothing set; a spec fills what it needs. */
export const publicTour = (extra: Partial<PublicTour> = {}): PublicTour => ({
  slug: 'dune-buggy',
  durationHours: null,
  format: null,
  languages: [],
  meetingPoint: null,
  meetingPointUrl: null,
  latitude: null,
  longitude: null,
  minAge: null,
  minHeightCm: null,
  ...extra,
});

/**
 * Hands the booking system's public data to the app the way the server does, through TransferState.
 * Call it before anything injects `PublicData`, `TourPrices` or `CatalogService`. Prices are in cents by slug.
 */
export function loadPublicApi(
  testBed: typeof TestBedType,
  data: {
    tours?: PublicTour[];
    rules?: PublicBookingRules | null;
    company?: PublicCompany | null;
    prices?: { USD?: Record<string, number>; PEN?: Record<string, number> };
  },
): void {
  const state = testBed.inject(TransferState);
  state.set(makeStateKey<object>('api-public-data'), {
    tours: Object.fromEntries((data.tours ?? []).map((tour) => [tour.slug, tour])),
    rules: data.rules ?? null,
    company: data.company ?? null,
  });
  state.set(makeStateKey<object>('tour-prices'), data.prices ?? {});
}
