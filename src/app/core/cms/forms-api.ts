import { HttpClient } from '@angular/common/http';
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
};

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

  private async post(form: string, body: object): Promise<boolean> {
    try {
      await firstValueFrom(this.http.post(`/api/forms/${form}`, body));
      return true;
    } catch {
      return false;
    }
  }
}
