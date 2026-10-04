import {
  DEFAULT_BOOKING,
  DEFAULT_FORMS,
  DEFAULT_INTRO_STYLE,
  withBookingDefaults,
  withFormDefaults,
  withIntroDefaults,
} from './booking-defaults';

describe('CMS setting defaults', () => {
  it('keeps the previous hard-coded values', () => {
    expect(DEFAULT_BOOKING).toMatchObject({ depositRate: 0.2, peopleMax: 12, adultsMin: 1 });
    expect(DEFAULT_FORMS).toEqual({ nameMin: 2, nameMax: 80, emailMax: 254, messageMax: 500 });
    expect(DEFAULT_INTRO_STYLE.accent).toBe('#5a6b3e');
  });

  it('uses CMS values when valid and falls back when not', () => {
    expect(withBookingDefaults({ depositRate: 0.3, peopleMax: 8 })).toMatchObject({
      depositRate: 0.3,
      peopleMax: 8,
      adultsMin: 1,
    });
    expect(withBookingDefaults({ depositRate: 0, peopleMax: 0 })).toMatchObject({
      depositRate: 0.2,
      peopleMax: 12,
    });
    expect(withBookingDefaults(null).assurances).toHaveLength(3);
    expect(withBookingDefaults({ childrenMin: 0, childrenDefault: 0 }).childrenMin).toBe(0);
  });

  it('keeps form limits and intro settings sane', () => {
    expect(withFormDefaults({ messageMax: 800, nameMax: 0 })).toMatchObject({
      messageMax: 800,
      nameMax: 80,
    });
    expect(withIntroDefaults({ enabled: false, restScale: 0.9 })).toMatchObject({
      enabled: false,
      restScale: 0.9,
      accent: '#5a6b3e',
    });
    expect(withIntroDefaults(undefined).failsafeMs).toBe(12_000);
  });
});
