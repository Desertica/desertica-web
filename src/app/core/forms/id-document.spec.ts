import { billingDocTypes, isIdDocType, isValidIdDocument } from './id-document';

describe('id documents', () => {
  it('validates each Peruvian document format', () => {
    expect(isValidIdDocument('DNI', '12345678')).toBe(true);
    expect(isValidIdDocument('DNI', '1234567')).toBe(false);
    expect(isValidIdDocument('DNI', '1234567a')).toBe(false);
    expect(isValidIdDocument('RUC', '20123456789')).toBe(true);
    expect(isValidIdDocument('RUC', '30123456789')).toBe(false);
    expect(isValidIdDocument('RUC', '2012345678')).toBe(false);
    expect(isValidIdDocument('CE', '001234567')).toBe(true);
    expect(isValidIdDocument('CE', '1234')).toBe(false);
    expect(isValidIdDocument('PASSPORT', 'AB123456')).toBe(true);
    expect(isValidIdDocument('PASSPORT', 'AB-123')).toBe(false);
    expect(isValidIdDocument('DNI', ' 12345678 ')).toBe(true);
  });

  it('offers a RUC for a factura and personal documents for a boleta', () => {
    expect(billingDocTypes('FACTURA')).toEqual(['RUC']);
    expect(billingDocTypes('BOLETA')).toEqual(['DNI', 'CE', 'PASSPORT']);
    expect(isIdDocType('DNI')).toBe(true);
    expect(isIdDocType('LE')).toBe(false);
  });
});
