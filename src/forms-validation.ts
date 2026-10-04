import { ID_DOC_TYPES, type IdDocType, isIdDocType, isValidIdDocument } from './app/core/forms/id-document';

export type FieldSpec = {
  max: number;
  required?: boolean;
  pattern?: RegExp;
  enum?: readonly string[];
};
export type NumberSpec = { min: number; max: number; required?: boolean; integer?: boolean };
export type FlagSpec = { required?: boolean };
export type Cleaned = Record<string, string | number | boolean>;

/** Fields accepted from the browser. Everything else is dropped before reaching Strapi. */
export const RESERVATION_FIELDS: Record<string, FieldSpec> = {
  tourSlug: { max: 120, required: true, pattern: /^[a-z0-9-]+$/ },
  tourTitle: { max: 200 },
  date: { max: 10, required: true, pattern: /^\d{4}-\d{2}-\d{2}$/ },
  language: { max: 2, required: true, enum: ['es', 'en'] },
  format: { max: 10, enum: ['shared', 'private'] },
  payment: { max: 10, enum: ['full', 'deposit'] },
  locale: { max: 2, enum: ['es', 'en'] },
  name: { max: 80 },
  email: { max: 254, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  phone: { max: 32 },
  notes: { max: 500 },
};

export const CONTACT_FIELDS: Record<string, FieldSpec> = {
  name: { max: 80, required: true },
  email: { max: 254, required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  whatsapp: { max: 32, required: true },
  country: { max: 4 },
  message: { max: 500, required: true },
  locale: { max: 2, enum: ['es', 'en'] },
  /** Cloudflare Turnstile response; checked by the proxy (Strapi) or by the API. */
  turnstileToken: { max: 2048 },
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Libro de Reclamaciones: the fields of `CreateComplaint` in the API contract. */
export const COMPLAINT_FIELDS: Record<string, FieldSpec> = {
  kind: { max: 10, required: true, enum: ['RECLAMO', 'QUEJA'] },
  goodType: { max: 10, required: true, enum: ['PRODUCT', 'SERVICE'] },
  consumerName: { max: 120, required: true },
  idDocType: { max: 10, required: true, enum: ID_DOC_TYPES },
  idDocNumber: { max: 12, required: true },
  address: { max: 200, required: true },
  email: { max: 254, required: true, pattern: EMAIL },
  phone: { max: 32 },
  bookingRef: { max: 64, pattern: /^[A-Za-z0-9_-]+$/ },
  currency: { max: 3, enum: ['USD', 'PEN'] },
  description: { max: 500, required: true },
  detail: { max: 2000, required: true },
  request: { max: 1000, required: true },
  turnstileToken: { max: 2048 },
};

export const COMPLAINT_NUMBERS: Record<string, NumberSpec> = {
  amountCents: { min: 0, max: 1_000_000_000, integer: true },
};

export const COMPLAINT_FLAGS: Record<string, FlagSpec> = {
  isMinor: {},
};

/** Cross-field rule: the document number must fit the document type. */
export function complaintIsConsistent(data: Cleaned): boolean {
  const type = data['idDocType'];
  const number = data['idDocNumber'];
  if (!isIdDocType(type) || typeof number !== 'string') {
    return false;
  }

  // An amount needs its currency, otherwise the claim cannot be read.
  if (data['amountCents'] !== undefined && data['currency'] === undefined) {
    return false;
  }

  return isValidIdDocument(type as IdDocType, number);
}

export const RESERVATION_NUMBERS = {
  adults: { min: 1, max: 50, required: true },
  children: { min: 0, max: 50 },
  amount: { min: 0, max: 100_000 },
};

/** Returns the cleaned payload, or `null` when a required field is missing or malformed. */
export function sanitize(
  body: unknown,
  fields: Record<string, FieldSpec>,
  numbers: Record<string, NumberSpec>,
  flags: Record<string, FlagSpec> = {},
): Cleaned | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }

  const input = body as Record<string, unknown>;
  const output: Cleaned = {};

  for (const [name, spec] of Object.entries(fields)) {
    const raw = input[name];
    const value = typeof raw === 'string' ? raw.trim() : '';
    if (!value) {
      if (spec.required) {
        return null;
      }

      continue;
    }

    if (
      value.length > spec.max ||
      (spec.pattern && !spec.pattern.test(value)) ||
      (spec.enum && !spec.enum.includes(value))
    ) {
      return null;
    }

    output[name] = value;
  }

  for (const [name, spec] of Object.entries(numbers)) {
    const raw = input[name];
    if (raw === undefined || raw === null || raw === '') {
      if (spec.required) {
        return null;
      }

      continue;
    }

    const value = Number(raw);
    if (
      !Number.isFinite(value) ||
      value < spec.min ||
      value > spec.max ||
      (spec.integer && !Number.isInteger(value))
    ) {
      return null;
    }

    output[name] = value;
  }

  for (const [name, spec] of Object.entries(flags)) {
    const raw = input[name];
    if (raw === undefined || raw === null || raw === '') {
      if (spec.required) {
        return null;
      }

      continue;
    }

    if (typeof raw !== 'boolean') {
      return null;
    }

    output[name] = raw;
  }

  return output;
}
