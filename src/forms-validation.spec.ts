import {
  COMPLAINT_FIELDS,
  COMPLAINT_FLAGS,
  COMPLAINT_NUMBERS,
  CONTACT_FIELDS,
  complaintIsConsistent,
  sanitize as sanitizeResult,
} from './forms-validation';

describe('forms validation', () => {
  const sanitize = (...args: Parameters<typeof sanitizeResult>) => {
    const result = sanitizeResult(...args);
    return 'data' in result ? result.data : null;
  };
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

  it('names the first invalid field', () => {
    expect(sanitizeResult({ ...contact, message: 'x'.repeat(501) }, CONTACT_FIELDS, {})).toEqual({ invalid: 'message' });
    expect(sanitizeResult({ ...contact, name: '' }, CONTACT_FIELDS, {})).toEqual({ invalid: 'name' });
    expect(sanitizeResult(null, CONTACT_FIELDS, {})).toEqual({ invalid: 'body' });
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
        guardianName: ' Maria Perez ',
        turnstileToken: 'tt',
      });

      expect(data).toMatchObject({
        consumerName: 'Ana Perez',
        amountCents: 5000,
        currency: 'USD',
        isMinor: true,
        guardianName: 'Maria Perez',
        bookingRef: 'DES-2026-0001',
        turnstileToken: 'tt',
      });
      expect(data && complaintIsConsistent(data)).toBe(true);
      expect(complaintIsConsistent(clean({ ...complaint, isMinor: true })!)).toBe(false);
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

    it('accepts both kinds and both goods, and rejects a name with digits or symbols', () => {
      expect(clean({ ...complaint, kind: 'BOTH', goodType: 'BOTH' })).toMatchObject({ kind: 'BOTH', goodType: 'BOTH' });
      expect(clean({ ...complaint, consumerName: 'Ana 123' })).toBeNull();
      expect(clean({ ...complaint, consumerName: 'Ana <b>' })).toBeNull();
      expect(clean({ ...complaint, consumerName: "María-José D'Angelo" })).not.toBeNull();
    });

    it('checks the document number against its type and pairs an amount with a currency', () => {
      expect(complaintIsConsistent(clean(complaint)!)).toBe(true);
      expect(complaintIsConsistent(clean({ ...complaint, idDocType: 'DNI' })!)).toBe(false);
      expect(complaintIsConsistent(clean({ ...complaint, amountCents: 100 })!)).toBe(false);
    });
  });
});
