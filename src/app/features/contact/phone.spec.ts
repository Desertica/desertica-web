import {
  applyPhoneInput,
  DEFAULT_PHONE_COUNTRY,
  isValidWhatsapp,
  maxNationalDigits,
  parseGeojsCountry,
  phoneCountries,
  toE164,
} from './phone';

describe('phone helpers', () => {
  it('lists Peru first and includes calling codes', () => {
    const countries = phoneCountries('es');
    expect(countries[0]?.code).toBe(DEFAULT_PHONE_COUNTRY);
    expect(countries[0]?.callingCode).toBe('51');
    expect(countries.some((country) => country.code === 'ES')).toBe(true);
  });

  it('reads a GeoJS country payload and ignores unknown codes', () => {
    expect(parseGeojsCountry({ country: 'es', ip: '1.1.1.1' })).toBe('ES');
    expect(parseGeojsCountry('PE')).toBe('PE');
    expect(parseGeojsCountry({ country: 'ZZ' })).toBeNull();
    expect(parseGeojsCountry(null)).toBeNull();
  });

  it('keeps Peru when typing a national number and switches on an E.164 paste', () => {
    expect(applyPhoneInput('987654321', 'PE')).toEqual({
      country: 'PE',
      national: '987 654 321',
    });
    expect(applyPhoneInput('+34600111222', 'PE')).toEqual({
      country: 'ES',
      national: '600 11 12 22',
    });
    expect(applyPhoneInput('+34', 'PE').country).toBe('ES');
  });

  it('clamps extra digits to the country numbering plan', () => {
    expect(maxNationalDigits('PE')).toBe(9);
    expect(maxNationalDigits('ES')).toBe(9);
    expect(maxNationalDigits('US')).toBe(10);
    expect(applyPhoneInput('987654321999', 'PE')).toEqual({
      country: 'PE',
      national: '987 654 321',
    });
    expect(applyPhoneInput('+34600111222999', 'PE')).toEqual({
      country: 'ES',
      national: '600 11 12 22',
    });
    expect(isValidWhatsapp('987654321999', 'PE')).toBe(false);
  });

  it('validates WhatsApp numbers and builds E.164', () => {
    expect(isValidWhatsapp('', 'PE')).toBe(false);
    expect(isValidWhatsapp('abc', 'PE')).toBe(false);
    expect(isValidWhatsapp('987654321', 'PE')).toBe(true);
    expect(isValidWhatsapp('+34600111222', 'PE')).toBe(true);
    expect(toE164('987654321', 'PE')).toBe('+51987654321');
  });
});
