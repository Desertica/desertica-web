import { createHash } from 'node:crypto';

/** Bodies of the executable inline scripts (no `src`, not JSON data): the theme bootstrap and Angular's event-dispatch scripts. */
function inlineScripts(html: string): string[] {
  return [...html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(([, attributes]) => !/type="(?!text\/javascript|module)/i.test(attributes ?? ''))
    .map(([, , body]) => body ?? '');
}

/**
 * `Content-Security-Policy-Report-Only` for one rendered page. The inline scripts are allowed by hash, computed from the
 * page itself so a change in index.html or in Angular's generated scripts needs no manual update. Report-only until the
 * browser console shows no violations; see docs/DEPLOY.md for the switch to `Content-Security-Policy`.
 * @param assetOrigins origins that serve CMS images and video (public CMS URL, `IMAGE_HOSTS`).
 */
export function cspReportOnly(html: string, assetOrigins: readonly string[]): string {
  const hashes = inlineScripts(html).map((script) => `'sha256-${createHash('sha256').update(script).digest('base64')}'`);
  const assets = ['https://images.unsplash.com', 'https://flagcdn.com', ...assetOrigins];
  const stripe = ['https://js.stripe.com', 'https://hooks.stripe.com'];
  const culqi = 'https://*.culqi.com';
  const turnstile = 'https://challenges.cloudflare.com';
  const google = ['https://www.googletagmanager.com', 'https://*.google-analytics.com', 'https://*.analytics.google.com'];
  const directives = {
    'default-src': ["'self'"],
    'script-src': ["'self'", ...hashes, google[0]!, turnstile, stripe[0]!, culqi],
    // Angular inlines the critical CSS and component styles.
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', ...assets, ...google],
    'media-src': ["'self'", ...assets],
    'font-src': ["'self'", 'data:'],
    'connect-src': ["'self'", 'https://api.stripe.com', ...google],
    'frame-src': [...stripe, culqi, turnstile, google[0]!],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  };
  return Object.entries(directives)
    .map(([name, sources]) => `${name} ${[...new Set(sources)].join(' ')}`)
    .join('; ');
}
