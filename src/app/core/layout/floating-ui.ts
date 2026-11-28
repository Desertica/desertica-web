import { Injectable, signal } from '@angular/core';

/** Lets a page hide the floating WhatsApp button while it would cover that page's own actions. */
@Injectable({ providedIn: 'root' })
export class FloatingUi {
  readonly whatsappHidden = signal(false);
  /** A page has a fixed bar at the bottom on phones: the page keeps room for it and the WhatsApp button rises above it. */
  readonly bottomBar = signal(false);
}
