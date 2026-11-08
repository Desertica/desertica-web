import { Injectable, signal } from '@angular/core';
import { asCurrency, type Currency } from '../analytics/analytics';

/** The currency the visitor picked in the header; the booking panel starts from it. */
@Injectable({ providedIn: 'root' })
export class CurrencyService {
  // shortcut: not persisted across reloads, add safe-storage like ThemeService if it should stick.
  readonly code = signal<Currency>('USD');

  set(code: string): void {
    this.code.set(asCurrency(code));
  }
}
