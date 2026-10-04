import {
  COMPLAINT_FIELDS,
  COMPLAINT_FLAGS,
  COMPLAINT_NUMBERS,
  CONTACT_FIELDS,
  complaintIsConsistent,
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

  describe('complaints', () => {
    const complaint = {
      kind: 'QUEJA',
      goodType: 'PRODUCT',
      consumerName: 'Ana Perez',
      idDocType: 'CE',
      idDocNumber: '001234567',
      address: 'Calle 1',
      email: 'ana@example.com',
      description: 'Pisco bottle',
      detail: 'Broken seal',
      request: 'Replacement',
    };
    const clean = (input: unknown) =>
      sanitize(input, COMPLAINT_FIELDS, COMPLAINT_NUMBERS, COMPLAINT_FLAGS);

    it('accepts every CreateComplaint field and trims text', () => {
      const data = clean({
        ...complaint,
        consumerName: ' Ana Perez ',
        phone: '+51987654321',
        bookingRef: 'DES-2026-0001',
        amountCents: 5000,
        currency: 'USD',
        isMinor: true,
        turnstileToken: 'tt',
      });

      expect(data).toMatchObject({
        consumerName: 'Ana Perez',
        amountCents: 5000,
        currency: 'USD',
        isMinor: true,
        bookingRef: 'DES-2026-0001',
        turnstileToken: 'tt',
      });
      expect(data && complaintIsConsistent(data)).toBe(true);
    });

    it('requires the legal fields and rejects malformed enums, numbers and flags', () => {
      for (const missing of ['kind', 'goodType', 'consumerName', 'idDocType', 'idDocNumber', 'address', 'email', 'description', 'detail', 'request']) {
        expect(clean({ ...complaint, [missing]: '' })).toBeNull();
      }
      expect(clean({ ...complaint, goodType: 'OTHER' })).toBeNull();
      expect(clean({ ...complaint, amountCents: -1, currency: 'USD' })).toBeNull();
      expect(clean({ ...complaint, amountCents: 10.5, currency: 'USD' })).toBeNull();
      expect(clean({ ...complaint, isMinor: 'true' })).toBeNull();
    });

    it('checks the document number against its type and pairs an amount with a currency', () => {
      expect(complaintIsConsistent(clean(complaint)!)).toBe(true);
      expect(complaintIsConsistent(clean({ ...complaint, idDocType: 'DNI' })!)).toBe(false);
      expect(complaintIsConsistent(clean({ ...complaint, amountCents: 100 })!)).toBe(false);
    });
  });
});
