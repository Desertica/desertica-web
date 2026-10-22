import { InjectionToken, TransferState, inject, makeStateKey } from '@angular/core';

/**
 * Settings the browser needs but that differ per environment. The server reads them from
 * `process.env` and hands them over in TransferState, so none of them is baked into the bundle and
 * the browser never learns the CMS or API URL.
 */
export type PublicConfig = {
  /** Google Tag Manager container id (`GTM-XXXX`); `null` disables tracking altogether. */
  gtmId: string | null;
  /** Turns on the booking engine (API-backed checkout). Off keeps the WhatsApp + Strapi flow. */
  bookingEngineEnabled: boolean;
  /** Cloudflare Turnstile site key; `null` leaves the forms without the challenge. */
  turnstileSiteKey: string | null;
  /** Culqi public key (`pk_test_…` / `pk_live_…`); `null` hides Culqi at the payment step. */
  culqiPublicKey: string | null;
  /** Public origin of the site, used for canonical, hreflang, sitemap and JSON-LD. */
  siteUrl: string | null;
  /** Hosts whose images the server may resize and convert (`/_img`); everything else loads as is. */
  imageHosts: string[];
};

export const DEFAULT_PUBLIC_CONFIG: PublicConfig = {
  gtmId: null,
  bookingEngineEnabled: false,
  turnstileSiteKey: null,
  culqiPublicKey: null,
  siteUrl: null,
  imageHosts: [],
};

const CONFIG_KEY = makeStateKey<PublicConfig>('public-config');

export const PUBLIC_CONFIG = new InjectionToken<PublicConfig>('PUBLIC_CONFIG', {
  providedIn: 'root',
  factory: () => inject(TransferState).get(CONFIG_KEY, DEFAULT_PUBLIC_CONFIG),
});

/** Server-only provider factory: reads the environment and shares the result with the browser. */
export function publicConfigForServer(env: Record<string, string | undefined>): PublicConfig {
  const config = publicConfigFromEnv(env);
  inject(TransferState).set(CONFIG_KEY, config);
  return config;
}

export function publicConfigFromEnv(env: Record<string, string | undefined>): PublicConfig {
  const gtm = env['GTM_ID']?.trim();
  const culqi = env['CULQI_PUBLIC_KEY']?.trim();
  const siteUrl = env['SITE_URL']?.trim().replace(/\/+$/, '');
  return {
    gtmId: gtm && /^GTM-[A-Z0-9]+$/.test(gtm) ? gtm : null,
    bookingEngineEnabled: env['BOOKING_ENGINE_ENABLED']?.trim().toLowerCase() === 'true',
    turnstileSiteKey: env['TURNSTILE_SITE_KEY']?.trim() || null,
    // Public keys only: a secret key (`sk_…`) pasted here by mistake must never reach the browser.
    culqiPublicKey: culqi && /^pk_(test|live)_[A-Za-z0-9]+$/.test(culqi) ? culqi : null,
    siteUrl: siteUrl || null,
    imageHosts: imageHostsFromEnv(env),
  };
}

/** The public CMS media host (`STRAPI_PUBLIC_URL`; never the internal `STRAPI_URL`, which would reach the browser), `IMAGE_HOSTS` (for an R2 or CDN host) and Unsplash, which the static catalog uses. */
function imageHostsFromEnv(env: Record<string, string | undefined>): string[] {
  const hostOf = (value: string | undefined) => {
    try {
      return value?.trim() ? new URL(value.trim()).host : '';
    } catch {
      return '';
    }
  };
  const listed = (env['IMAGE_HOSTS'] ?? '').split(',').map((host) => host.trim());
  return [
    ...new Set(
      [...listed, hostOf(env['STRAPI_PUBLIC_URL']), 'images.unsplash.com'].filter(Boolean),
    ),
  ];
}

/** `API_URL` is the origin of desertica-api (no `/api`); only the server ever reads it. */
export function apiUrlFromEnv(env: Record<string, string | undefined>): string | null {
  const url = env['API_URL']?.trim().replace(/\/+$/, '');
  return url || null;
}

/** Production must know its own origin: without `SITE_URL` canonical, sitemap and robots would be built from the request `Host`, which any client can set. */
export function assertProductionConfig(env: Record<string, string | undefined>): void {
  if (env['NODE_ENV'] === 'production' && !publicConfigFromEnv(env).siteUrl) {
    throw new Error('SITE_URL is required in production (for example https://desertica.pe).');
  }
}
