export type IdDocType = 'DNI' | 'CE' | 'PASSPORT' | 'RUC';

export const ID_DOC_TYPES: readonly IdDocType[] = ['DNI', 'CE', 'PASSPORT', 'RUC'];

/** Peruvian formats: DNI 8 digits, RUC 11 digits, CE and passport alphanumeric of 6 to 12. */
const PATTERNS: Record<IdDocType, RegExp> = {
  DNI: /^\d{8}$/,
  RUC: /^(10|15|17|20)\d{9}$/,
  CE: /^[A-Za-z0-9]{9,12}$/,
  PASSPORT: /^[A-Za-z0-9]{6,12}$/,
};

export function isIdDocType(value: unknown): value is IdDocType {
  return typeof value === 'string' && (ID_DOC_TYPES as readonly string[]).includes(value);
}

export function isValidIdDocument(type: IdDocType, number: string): boolean {
  return PATTERNS[type].test(number.trim());
}

/** Documents a customer may give for a boleta or a factura (a factura needs a RUC). */
export function billingDocTypes(docType: 'BOLETA' | 'FACTURA'): readonly IdDocType[] {
  return docType === 'FACTURA' ? ['RUC'] : ['DNI', 'CE', 'PASSPORT'];
}
