export type TourWhatsappFields = {
  tour: string;
  date: string;
  language: string;
  adults: string;
  children: string;
  format: string;
  payment: string;
  amount: string;
};

export type AskWhatsappFields = { tour: string; hours: string; price: string; url: string };

/** "Ask for more information" message for a tour: the visitor edits it in WhatsApp before sending. */
export function buildAskWhatsappHref(base: string, template: string, fields: AskWhatsappFields): string {
  const text = Object.entries(fields).reduce((message, [key, value]) => message.replaceAll(`{${key}}`, value), template);
  return `${base}${base.includes('?') ? '&' : '?'}text=${encodeURIComponent(text)}`;
}

export function formatPickerDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}

export function formatTourDate(value: Date | string): string {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : formatPickerDate(value);
  }

  const [year, month, day] = value.split('-');
  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

export function buildTourWhatsappHref(
  base: string,
  template: string,
  fields: TourWhatsappFields,
): string {
  const text = template
    .replace('{tour}', fields.tour)
    .replace('{date}', fields.date)
    .replace('{language}', fields.language)
    .replace('{adults}', fields.adults)
    .replace('{children}', fields.children)
    .replace('{format}', fields.format)
    .replace('{payment}', fields.payment)
    .replace('{amount}', fields.amount);

  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}text=${encodeURIComponent(text)}`;
}

export function startOfLocalDay(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function localIsoDate(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
