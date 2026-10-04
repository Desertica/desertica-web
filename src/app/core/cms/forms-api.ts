import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export type ReservationPayload = {
  tourSlug: string;
  tourTitle: string;
  /** `YYYY-MM-DD`. */
  date: string;
  language: 'es' | 'en';
  format?: 'shared' | 'private';
  adults: number;
  children: number;
  payment: 'full' | 'deposit';
  amount: number;
  locale: 'es' | 'en';
};

export type ContactPayload = {
  name: string;
  email: string;
  whatsapp: string;
  country: string;
  message: string;
  locale: 'es' | 'en';
  /** Cloudflare Turnstile token, when the challenge is configured. */
  turnstileToken?: string;
};

/** Libro de Reclamaciones: the fields of `CreateComplaint` in the API contract. */
export type ComplaintPayload = {
  kind: 'RECLAMO' | 'QUEJA';
  goodType: 'PRODUCT' | 'SERVICE';
  consumerName: string;
  idDocType: 'DNI' | 'CE' | 'PASSPORT' | 'RUC';
  idDocNumber: string;
  address: string;
  email: string;
  phone?: string;
  isMinor?: boolean;
  bookingRef?: string;
  /** Minor units, with `currency`. */
  amountCents?: number;
  currency?: 'USD' | 'PEN';
  description: string;
  detail: string;
  request: string;
  turnstileToken?: string;
};

export type ComplaintResult =
  | { ok: true; correlative: number; dueAt: string }
  | { ok: false; reason: 'invalid' | 'captcha' | 'rate_limited' | 'unavailable' | 'error' };

/** Sends form submissions to the Express `/api/forms/*` proxy, which stores them in Strapi. */
@Injectable({ providedIn: 'root' })
export class FormsApi {
  private readonly http = inject(HttpClient);

  submitReservation(payload: ReservationPayload): Promise<boolean> {
    return this.post('reservation', payload);
  }

  submitContact(payload: ContactPayload): Promise<boolean> {
    return this.post('contact', payload);
  }

  /** Files a complaint; the answer carries the correlative number and the legal reply deadline. */
  async submitComplaint(payload: ComplaintPayload): Promise<ComplaintResult> {
    try {
      const response = await firstValueFrom(
        this.http.post<{ correlative?: number; dueAt?: string }>('/api/forms/complaint', payload),
      );
      if (typeof response.correlative === 'number' && typeof response.dueAt === 'string') {
        return { ok: true, correlative: response.correlative, dueAt: response.dueAt };
      }

      return { ok: false, reason: 'error' };
    } catch (error) {
      const status = error instanceof HttpErrorResponse ? error.status : 0;
      const code = error instanceof HttpErrorResponse ? (error.error as { error?: string } | null)?.error : undefined;
      if (status === 400) {
        return { ok: false, reason: code === 'captcha' ? 'captcha' : 'invalid' };
      }

      if (status === 429) {
        return { ok: false, reason: 'rate_limited' };
      }

      return { ok: false, reason: status === 503 ? 'unavailable' : 'error' };
    }
  }

  private async post(form: string, body: object): Promise<boolean> {
    try {
      await firstValueFrom(this.http.post(`/api/forms/${form}`, body));
      return true;
    } catch {
      return false;
    }
  }
}
