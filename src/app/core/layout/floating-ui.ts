import { Injectable, signal } from '@angular/core';

/** Lets a page hide the floating WhatsApp button while it would cover that page's own actions. */
@Injectable({ providedIn: 'root' })
export class FloatingUi {
  readonly whatsappHidden = signal(false);
}
