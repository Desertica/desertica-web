import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  isSupportedCountry,
  Metadata,
  parseIncompletePhoneNumber,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js/min';

export const DEFAULT_PHONE_COUNTRY: CountryCode = 'PE';
export const GEOJS_COUNTRY_URL = 'https://get.geojs.io/v1/ip/country.json';
export const CONTACT_BAND_IMAGE =
  'https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?auto=format&fit=crop&w=1200&h=675&q=80';

const FALLBACK_MAX_NATIONAL_DIGITS = 15;

export type PhoneCountry = {
  code: CountryCode;
  callingCode: string;
  label: string;
  flagSrc: string;
};

export function flagSrc(code: string): string {
  return `https://flagcdn.com/w40/${code.toLowerCase()}.png`;
}

export function phoneCountries(locale: string): PhoneCountry[] {
  const names = new Intl.DisplayNames([locale], { type: 'region' });
  const items: PhoneCountry[] = [];

  for (const code of getCountries()) {
    try {
      items.push({
        code,
        callingCode: getCountryCallingCode(code),
        label: names.of(code) ?? code,
        flagSrc: flagSrc(code),
      });
    } catch {
      continue;
    }
  }

  items.sort((a, b) => {
    if (a.code === DEFAULT_PHONE_COUNTRY) {
      return -1;
    }
    if (b.code === DEFAULT_PHONE_COUNTRY) {
      return 1;
    }

    return a.label.localeCompare(b.label, locale);
  });

  return items;
}

export function parseGeojsCountry(payload: unknown): CountryCode | null {
  let code = '';
  if (typeof payload === 'string') {
    code = payload;
  } else if (typeof payload === 'object' && payload !== null && 'country' in payload) {
    code = String((payload as { country: unknown }).country);
  }

  code = code.trim().toUpperCase();
  return isSupportedCountry(code) ? code : null;
}

export function maxNationalDigits(country: CountryCode): number {
  const metadata = new Metadata();
  metadata.selectNumberingPlan(country);
  const lengths = metadata.numberingPlan?.possibleLengths() ?? [];
  return lengths.length ? Math.max(...lengths) : FALLBACK_MAX_NATIONAL_DIGITS;
}

function nationalDigitsOf(value: string): string {
  return parseIncompletePhoneNumber(value).replace(/\D/g, '');
}

function formatClampedNational(digits: string, country: CountryCode): string {
  const clamped = digits.slice(0, maxNationalDigits(country));
  return new AsYouType(country).input(clamped);
}

export function applyPhoneInput(
  raw: string,
  currentCountry: CountryCode,
): { country: CountryCode; national: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { country: currentCountry, national: '' };
  }

  if (trimmed.startsWith('+')) {
    const typed = new AsYouType();
    typed.input(trimmed);
    const parsed = parsePhoneNumberFromString(trimmed);
    const country = parsed?.country ?? typed.getCountry() ?? currentCountry;
    const nationalDigits = parsed?.nationalNumber ?? typed.getNumber()?.nationalNumber ?? '';

    if (nationalDigits) {
      return { country, national: formatClampedNational(nationalDigits, country) };
    }

    return { country, national: trimmed };
  }

  return {
    country: currentCountry,
    national: formatClampedNational(nationalDigitsOf(trimmed), currentCountry),
  };
}

export function isValidWhatsapp(national: string, country: CountryCode): boolean {
  const trimmed = national.trim();
  if (!trimmed) {
    return false;
  }

  const parsed = trimmed.startsWith('+')
    ? parsePhoneNumberFromString(trimmed)
    : parsePhoneNumberFromString(trimmed, country);

  return Boolean(parsed?.isValid());
}

export function toE164(national: string, country: CountryCode): string | null {
  const parsed = national.trim().startsWith('+')
    ? parsePhoneNumberFromString(national)
    : parsePhoneNumberFromString(national, country);

  return parsed?.number ?? null;
}
