import { isPlatformBrowser } from '@angular/common';

/** Consent Mode v2 signals, in the order Google lists them. */
export type ConsentSignal =
  | 'ad_storage'
  | 'ad_user_data'
  | 'ad_personalization'
  | 'analytics_storage'
  | 'functionality_storage'
  | 'personalization_storage'
  | 'security_storage';

export type ConsentState = Record<ConsentSignal, 'granted' | 'denied'>;

export type DataLayerWindow = Window & { dataLayer?: unknown[] };

/** The page's data layer, or `null` on the server (nothing is ever published during SSR). */
export function dataLayerOf(document: Document, platformId: object): unknown[] | null {
  const view = isPlatformBrowser(platformId) ? document.defaultView : null;
  if (!view) {
    return null;
  }

  const target = view as DataLayerWindow;
  target.dataLayer ??= [];
  return target.dataLayer;
}

/**
 * Builds a `gtag()` bound to `layer`. GTM only recognises `Arguments` objects for `consent`,
 * `config` and `set`, so the command has to be pushed as `arguments`, not as an array.
 */
export function gtagFor(layer: unknown[]): (...args: unknown[]) => void {
  return function gtag(): void {
    // eslint-disable-next-line prefer-rest-params
    layer.push(arguments);
  };
}
