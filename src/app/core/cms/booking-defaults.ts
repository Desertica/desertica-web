import type { TourFeature } from '../catalog/tour-pages';
import type { BookingSettings, FormSettings, IntroStyle } from './cms-models';

/** Values used until the CMS `booking-setting`, `form-setting` and `theme-setting` are published. */
export const DEFAULT_BOOKING: BookingSettings = {
  depositRate: 0.2,
  adultsMin: 1,
  adultsDefault: 1,
  childrenMin: 0,
  childrenDefault: 0,
  peopleMax: 12,
  availabilityMonths: 3,
  currencyCode: 'USD',
  assurances: [
    {
      icon: 'lucideCalendar',
      titleKey: 'tour.assure.payLater',
      bodyKey: 'tour.assure.payLaterBody',
    },
    { icon: 'lucideClock', titleKey: 'tour.assure.cancel', bodyKey: 'tour.assure.cancelBody' },
    {
      icon: 'lucideCircleDollarSign',
      titleKey: 'tour.assure.price',
      bodyKey: 'tour.assure.priceBody',
    },
  ] satisfies readonly TourFeature[],
};

export const DEFAULT_FORMS: FormSettings = {
  nameMin: 2,
  nameMax: 80,
  emailMax: 254,
  messageMax: 500,
};

export const DEFAULT_INTRO_STYLE: IntroStyle = {
  enabled: true,
  accent: '#5a6b3e',
  restScale: 0.85,
  failsafeMs: 12_000,
};

/** Keeps CMS numbers that came back as 0 or missing from breaking the UI. */
export function withBookingDefaults(
  booking: Partial<BookingSettings> | null | undefined,
): BookingSettings {
  const positive = (value: number | undefined, fallback: number): number =>
    typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
  const atLeastZero = (value: number | undefined, fallback: number): number =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
  const deposit = booking?.depositRate;
  return {
    depositRate:
      typeof deposit === 'number' && deposit > 0 && deposit <= 1
        ? deposit
        : DEFAULT_BOOKING.depositRate,
    adultsMin: atLeastZero(booking?.adultsMin, DEFAULT_BOOKING.adultsMin),
    adultsDefault: atLeastZero(booking?.adultsDefault, DEFAULT_BOOKING.adultsDefault),
    childrenMin: atLeastZero(booking?.childrenMin, DEFAULT_BOOKING.childrenMin),
    childrenDefault: atLeastZero(booking?.childrenDefault, DEFAULT_BOOKING.childrenDefault),
    peopleMax: positive(booking?.peopleMax, DEFAULT_BOOKING.peopleMax),
    availabilityMonths: Math.min(
      positive(booking?.availabilityMonths, DEFAULT_BOOKING.availabilityMonths),
      12,
    ),
    currencyCode: booking?.currencyCode?.trim() || DEFAULT_BOOKING.currencyCode,
    assurances: booking?.assurances?.length ? booking.assurances : DEFAULT_BOOKING.assurances,
  };
}

export function withFormDefaults(forms: Partial<FormSettings> | null | undefined): FormSettings {
  const positive = (value: number | undefined, fallback: number): number =>
    typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
  return {
    nameMin: positive(forms?.nameMin, DEFAULT_FORMS.nameMin),
    nameMax: positive(forms?.nameMax, DEFAULT_FORMS.nameMax),
    emailMax: positive(forms?.emailMax, DEFAULT_FORMS.emailMax),
    messageMax: positive(forms?.messageMax, DEFAULT_FORMS.messageMax),
  };
}

export function withIntroDefaults(intro: Partial<IntroStyle> | null | undefined): IntroStyle {
  return {
    enabled: intro?.enabled ?? DEFAULT_INTRO_STYLE.enabled,
    accent: intro?.accent || DEFAULT_INTRO_STYLE.accent,
    restScale:
      typeof intro?.restScale === 'number' && intro.restScale > 0
        ? intro.restScale
        : DEFAULT_INTRO_STYLE.restScale,
    failsafeMs:
      typeof intro?.failsafeMs === 'number' && intro.failsafeMs > 0
        ? intro.failsafeMs
        : DEFAULT_INTRO_STYLE.failsafeMs,
  };
}
