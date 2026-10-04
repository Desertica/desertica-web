export type FieldSpec = {
  max: number;
  required?: boolean;
  pattern?: RegExp;
  enum?: readonly string[];
};
export type NumberSpec = { min: number; max: number; required?: boolean };

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
};

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
): Record<string, string | number> | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }

  const input = body as Record<string, unknown>;
  const output: Record<string, string | number> = {};

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
    if (!Number.isFinite(value) || value < spec.min || value > spec.max) {
      return null;
    }

    output[name] = value;
  }

  return output;
}
