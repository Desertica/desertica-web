import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { loadScript } from './third-party-script';

export const CULQI_CHECKOUT_SRC = 'https://checkout.culqi.com/js/v4';
export const CULQI_3DS_SRC = 'https://3ds.culqi.com';

/** The slice of `Culqi` (Checkout v4) that this site uses, as shown in Culqi's official demos. */
export type CulqiCheckout = {
  publicKey: string;
  settings(settings: { title: string; currency: string; amount: number }): void;
  options(options: Record<string, unknown>): void;
  open(): void;
  close(): void;
  token?: { id: string; email: string };
  error?: { user_message?: string; merchant_message?: string };
};

/** The slice of `Culqi3DS` that this site uses. */
export type Culqi3DS = {
  publicKey: string;
  options: Record<string, unknown>;
  settings: { charge: { totalAmount: number; returnUrl: string }; card: { email: string } };
  generateDevice(): Promise<string | undefined>;
  initAuthentication(tokenId: string): void;
  reset(): void;
};

export type CulqiGlobals = { checkout: CulqiCheckout; threeDS: Culqi3DS };

type CulqiWindow = Window & {
  Culqi?: CulqiCheckout;
  Culqi3DS?: Culqi3DS;
  culqi?: () => void;
};

/**
 * Loads Culqi.js (Checkout v4) and Culqi 3DS when the visitor picks Culqi at the payment step.
 * Card data is typed into Culqi's own modal and goes straight to Culqi: this site only ever sees
 * the resulting token.
 */
@Injectable({ providedIn: 'root' })
export class CulqiLoader {
  private readonly document = inject(DOCUMENT);

  async load(): Promise<CulqiGlobals> {
    await Promise.all([
      loadScript(this.document, CULQI_CHECKOUT_SRC),
      loadScript(this.document, CULQI_3DS_SRC),
    ]);
    const view = this.document.defaultView as CulqiWindow | null;
    if (!view?.Culqi || !view.Culqi3DS) {
      throw new Error('culqi_unavailable');
    }

    return { checkout: view.Culqi, threeDS: view.Culqi3DS };
  }

  /** Culqi.js calls this global when the modal produces a token or an error. */
  onResult(handler: () => void): () => void {
    const view = this.document.defaultView as CulqiWindow | null;
    if (view) {
      view.culqi = handler;
    }

    return () => {
      if (view?.culqi === handler) {
        delete view.culqi;
      }
    };
  }
}
