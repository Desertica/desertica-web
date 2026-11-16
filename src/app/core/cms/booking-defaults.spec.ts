import {
  DEFAULT_BOOKING,
  DEFAULT_RULES,
  DEFAULT_FORMS,
  DEFAULT_INTRO_STYLE,
  withBookingDefaults,
  withFormDefaults,
  withIntroDefaults,
} from './booking-defaults';

describe('CMS setting defaults', () => {
  it('keeps the previous hard-coded values', () => {
    expect(DEFAULT_BOOKING).toMatchObject({ adultsDefault: 1, childrenDefault: 0, currencyCode: 'USD' });
    expect(DEFAULT_RULES).toEqual({ depositRate: null, adultsMin: 1, childrenMin: 0, peopleMax: 12, availabilityMonths: 3 });
    expect(DEFAULT_FORMS).toEqual({ nameMin: 2, nameMax: 80, emailMax: 254, messageMax: 500 });
    expect(DEFAULT_INTRO_STYLE.accent).toBe('#5a6b3e');
  });

  const rules = { depositPercent: 30, availabilityMonths: 6, adultsMin: 1, childrenMin: 0, peopleMax: 8 };

  it('takes limits and deposit from the API rules and falls back when they are missing or not valid', () => {
    expect(withBookingDefaults(null, rules)).toMatchObject({ depositRate: 0.3, peopleMax: 8, adultsMin: 1 });
    expect(withBookingDefaults(null, { ...rules, depositPercent: 0, peopleMax: 0 })).toMatchObject({
      depositRate: null,
      peopleMax: 12,
    });
    expect(withBookingDefaults(null)).toMatchObject({ ...DEFAULT_RULES });
    expect(withBookingDefaults(null).assurances).toHaveLength(3);
  });

  it('clamps the CMS starting party to the API limits', () => {
    expect(withBookingDefaults({ adultsDefault: 1, childrenDefault: 0 }, { ...rules, adultsMin: 2, childrenMin: 1 })).toMatchObject({
      adultsDefault: 2,
      childrenDefault: 1,
    });
    expect(withBookingDefaults({ adultsDefault: 20, childrenDefault: 5 }, rules)).toMatchObject({
      adultsDefault: 8,
      childrenDefault: 0,
    });
    expect(withBookingDefaults({ adultsDefault: 2, childrenDefault: 1 }, rules)).toMatchObject({
      adultsDefault: 2,
      childrenDefault: 1,
    });
  });

  it('keeps form limits and intro settings sane', () => {
    expect(withFormDefaults({ messageMax: 300, nameMax: 0 })).toMatchObject({
      messageMax: 300,
      nameMax: 80,
    });
    // The proxy rejects what is above its ceilings, so the CMS cannot raise them.
    expect(withFormDefaults({ messageMax: 800, nameMax: 200, emailMax: 500, nameMin: 300 })).toEqual({
      nameMin: 80,
      nameMax: 80,
      emailMax: 254,
      messageMax: 500,
    });
    expect(withIntroDefaults({ enabled: false, restScale: 0.9 })).toMatchObject({
      enabled: false,
      restScale: 0.9,
      accent: '#5a6b3e',
    });
    expect(withIntroDefaults(undefined).failsafeMs).toBe(12_000);
  });
});

describe('availability window', () => {
  it('defaults to three months and caps what the API can ask for', () => {
    const months = (availabilityMonths: number) =>
      withBookingDefaults({}, { depositPercent: 20, adultsMin: 1, childrenMin: 0, peopleMax: 12, availabilityMonths }).availabilityMonths;
    expect(withBookingDefaults({}).availabilityMonths).toBe(3);
    expect(months(6)).toBe(6);
    expect(months(0)).toBe(3);
    expect(months(99)).toBe(12);
  });
});
