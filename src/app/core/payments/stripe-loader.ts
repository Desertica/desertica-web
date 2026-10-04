import { Injectable } from '@angular/core';
import type { Stripe } from '@stripe/stripe-js';

/**
 * Loads Stripe.js (`js.stripe.com`) on demand. The `pure` entry point injects the script only when
 * `loadStripe` is called, so importing this file never contacts Stripe. Stripe asks that the script
 * always comes from `js.stripe.com`, which is why it is not bundled.
 */
@Injectable({ providedIn: 'root' })
export class StripeLoader {
  async load(publishableKey: string): Promise<Stripe | null> {
    const { loadStripe } = await import('@stripe/stripe-js/pure');
    return loadStripe(publishableKey);
  }
}
