import {
  CONTACT_FIELDS,
  RESERVATION_FIELDS,
  RESERVATION_NUMBERS,
  sanitize,
} from './forms-validation';

describe('forms validation', () => {
  const contact = {
    name: ' Ana ',
    email: 'ana@desertica.pe',
    whatsapp: '+51999999999',
    country: 'PE',
    message: 'Hola',
    locale: 'es',
  };

  it('trims and keeps only known contact fields', () => {
    expect(sanitize({ ...contact, handled: true, status: 'x' }, CONTACT_FIELDS, {})).toEqual({
      ...contact,
      name: 'Ana',
    });
  });

  it('rejects missing, oversized or malformed values', () => {
    expect(sanitize({ ...contact, email: 'nope' }, CONTACT_FIELDS, {})).toBeNull();
    expect(sanitize({ ...contact, message: 'x'.repeat(501) }, CONTACT_FIELDS, {})).toBeNull();
    expect(sanitize({ ...contact, name: '' }, CONTACT_FIELDS, {})).toBeNull();
    expect(sanitize({ ...contact, locale: 'fr' }, CONTACT_FIELDS, {})).toBeNull();
    expect(sanitize(null, CONTACT_FIELDS, {})).toBeNull();
    expect(sanitize('x', CONTACT_FIELDS, {})).toBeNull();
  });

  it('validates reservations including numeric ranges', () => {
    const reservation = {
      tourSlug: 'dune-buggy',
      date: '2026-12-01',
      language: 'en',
      adults: 2,
      children: '1',
      amount: 79,
    };
    expect(sanitize(reservation, RESERVATION_FIELDS, RESERVATION_NUMBERS)).toEqual({
      tourSlug: 'dune-buggy',
      date: '2026-12-01',
      language: 'en',
      adults: 2,
      children: 1,
      amount: 79,
    });
    expect(
      sanitize({ ...reservation, adults: 0 }, RESERVATION_FIELDS, RESERVATION_NUMBERS),
    ).toBeNull();
    expect(
      sanitize({ ...reservation, adults: 51 }, RESERVATION_FIELDS, RESERVATION_NUMBERS),
    ).toBeNull();
    expect(
      sanitize({ ...reservation, tourSlug: '../x' }, RESERVATION_FIELDS, RESERVATION_NUMBERS),
    ).toBeNull();
    expect(
      sanitize({ ...reservation, date: '1/12/2026' }, RESERVATION_FIELDS, RESERVATION_NUMBERS),
    ).toBeNull();
    expect(
      sanitize({ ...reservation, adults: undefined }, RESERVATION_FIELDS, RESERVATION_NUMBERS),
    ).toBeNull();
  });
});
