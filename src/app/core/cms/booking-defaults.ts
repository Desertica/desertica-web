import type { PublicBookingRules } from '../api/public-data';
import { CONTACT_LIMITS } from '../forms/contact-limits';
import type { TourFeature } from '../catalog/tour-pages';
import type { BookingSettings, FormSettings, IntroStyle } from './cms-models';

/** Values used until the CMS `booking-setting`, `form-setting` and `theme-setting` are published. */
/** Rules owned by the booking system. `depositRate` is a fraction of the total; `null` while it is unknown. */
export type BookingRules = {
  depositRate: number | null;
  adultsMin: number;
  childrenMin: number;
  peopleMax: number;
  /** How many months of availability the online booking calendar loads. */
  availabilityMonths: number;
};

/** Only for when the API is unreachable: the form keeps working with safe limits. */
export const DEFAULT_RULES: BookingRules = {
  depositRate: null,
  adultsMin: 1,
  childrenMin: 0,
  peopleMax: 12,
  availabilityMonths: 3,
};

export const DEFAULT_BOOKING: BookingSettings = {
  adultsDefault: 1,
  childrenDefault: 0,
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

/**
 * The CMS decides the starting party and the copy; the API (`rules`) decides the limits, and the starting party
 * is clamped to them. Numbers that came back as 0 or missing never break the UI.
 */
export function withBookingDefaults(
  booking: Partial<BookingSettings> | null | undefined,
  rules?: PublicBookingRules | null,
): BookingSettings & BookingRules {
  const positive = (value: number | undefined, fallback: number): number =>
    typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
  const atLeastZero = (value: number | undefined, fallback: number): number =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
  const deposit = rules?.depositPercent;
  const peopleMax = positive(rules?.peopleMax, DEFAULT_RULES.peopleMax);
  const adultsMin = Math.min(atLeastZero(rules?.adultsMin, DEFAULT_RULES.adultsMin), peopleMax);
  const childrenMin = Math.min(
    atLeastZero(rules?.childrenMin, DEFAULT_RULES.childrenMin),
    peopleMax - adultsMin,
  );
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));
  const adultsDefault = clamp(
    atLeastZero(booking?.adultsDefault, DEFAULT_BOOKING.adultsDefault),
    adultsMin,
    peopleMax - childrenMin,
  );
  return {
    depositRate:
      typeof deposit === 'number' && deposit > 0 && deposit <= 100
        ? deposit / 100
        : DEFAULT_RULES.depositRate,
    adultsMin,
    adultsDefault,
    childrenMin,
    childrenDefault: clamp(
      atLeastZero(booking?.childrenDefault, DEFAULT_BOOKING.childrenDefault),
      childrenMin,
      peopleMax - adultsDefault,
    ),
    peopleMax,
    availabilityMonths: Math.min(
      positive(rules?.availabilityMonths, DEFAULT_RULES.availabilityMonths),
      12,
    ),
    currencyCode: booking?.currencyCode?.trim() || DEFAULT_BOOKING.currencyCode,
    assurances: booking?.assurances?.length ? booking.assurances : DEFAULT_BOOKING.assurances,
  };
}

export function withFormDefaults(forms: Partial<FormSettings> | null | undefined): FormSettings {
  const positive = (value: number | undefined, fallback: number): number =>
    typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
  // The proxy rejects anything above its own ceilings, so the CMS may only lower them.
  const nameMax = Math.min(positive(forms?.nameMax, DEFAULT_FORMS.nameMax), CONTACT_LIMITS.name);
  return {
    nameMin: Math.min(positive(forms?.nameMin, DEFAULT_FORMS.nameMin), nameMax),
    nameMax,
    emailMax: Math.min(positive(forms?.emailMax, DEFAULT_FORMS.emailMax), CONTACT_LIMITS.email),
    messageMax: Math.min(positive(forms?.messageMax, DEFAULT_FORMS.messageMax), CONTACT_LIMITS.message),
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
