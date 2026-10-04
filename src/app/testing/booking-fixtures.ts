import type { components } from '../core/api/schema';

type Schemas = components['schemas'];

export const DEPARTURE_ID = '5b0b6a38-2b2f-4f0c-9a40-6f0b8a3d1f11';
export const LEGAL_IDS = {
  TERMS: '11111111-1111-4111-8111-111111111111',
  PRIVACY: '22222222-2222-4222-8222-222222222222',
  CANCELLATION: '33333333-3333-4333-8333-333333333333',
} as const;

/** Tomorrow at 14:00 UTC (09:00 in Lima), a day that is always inside the booking window. */
export function tomorrowDeparture(): { startsAt: string; date: Date; month: string } {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setUTCHours(14, 0, 0, 0);
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const month = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  return { startsAt: date.toISOString(), date: local, month };
}

export function departure(startsAt: string, seatsLeft = 6): Schemas['AvailableDeparture'] {
  return {
    departureId: DEPARTURE_ID,
    startsAt,
    language: 'es',
    format: 'SHARED',
    seatsLeft,
    meetingPoint: 'Plaza de Armas, Ica',
    price: { currency: 'USD', unit: 'PER_PERSON', adultCents: 7900, childCents: 5900 },
  };
}

export const QUOTE: Schemas['Quote'] = {
  currency: 'USD',
  totalCents: 15800,
  depositCents: 3160,
  lines: [{ label: 'Adults', quantity: 2, unitCents: 7900, totalCents: 15800 }],
  cancellationTiers: [
    { hoursBefore: 48, refundPercent: 100 },
    { hoursBefore: 24, refundPercent: 50 },
  ],
};

export const LEGAL_DOCUMENTS: Schemas['LegalDocument'][] = (['TERMS', 'PRIVACY', 'CANCELLATION'] as const).map(
  (kind, index) => ({
    id: LEGAL_IDS[kind],
    kind,
    locale: 'en',
    version: index + 2,
    cmsSlug: kind.toLowerCase(),
    publishedAt: '2026-01-01T00:00:00.000Z',
  }),
);

export function publicBooking(overrides: Partial<Schemas['PublicBooking']> = {}): Schemas['PublicBooking'] {
  return {
    reference: 'DES-2026-0001',
    status: 'PENDING_PAYMENT',
    tourSlug: 'dune-buggy',
    startsAt: '2026-12-01T14:00:00.000Z',
    meetingPoint: 'Plaza de Armas, Ica',
    adults: 2,
    children: 0,
    currency: 'USD',
    totalCents: 15800,
    paidCents: 0,
    pendingCents: 15800,
    depositCents: 3160,
    cancellationTiers: [{ hoursBefore: 48, refundPercent: 100 }],
    ...overrides,
  };
}
