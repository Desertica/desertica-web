import { createHash } from 'node:crypto';

/** Bodies of the executable inline scripts (no `src`, not JSON data): the theme bootstrap and Angular's event-dispatch scripts. */
function inlineScripts(html: string): string[] {
  return [...html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(([, attributes]) => !/type="(?!text\/javascript|module)/i.test(attributes ?? ''))
    .map(([, , body]) => body ?? '');
}

const sha256 = (source: string) => `'sha256-${createHash('sha256').update(source).digest('base64')}'`;

/** Angular's critical-CSS inlining loads the full stylesheet with `<link media="print" onload="this.media='all'">`. */
const STYLESHEET_ONLOAD = "this.media='all'";

const google = ['https://*.googletagmanager.com', 'https://*.google-analytics.com', 'https://*.analytics.google.com'];
/** GA4 with Google Signals pings these; GTM's preview mode (Tag Assistant) needs the last three. */
const googleBeacons = ['https://*.g.doubleclick.net', 'https://www.google.com'];
const gtmPreview = ['https://tagmanager.google.com', 'https://www.gstatic.com', 'https://ssl.gstatic.com'];
/** Meta pixel through its GTM template (not a Custom HTML tag: inline scripts are blocked). */
const meta = ['https://connect.facebook.net', 'https://www.facebook.com'];
const stripeJs = ['https://js.stripe.com', 'https://*.js.stripe.com'];
const culqi = 'https://*.culqi.com';
/** Culqi 3DS: device profiling scripts it injects, and the Cardinal frames and forms it posts to. */
const culqi3dsScripts = ['https://*.online-metrix.net', 'https://m.vnforapps.com'];
const cardinal = ['https://*.cardinalcommerce.com', 'https://*.cardinaltrusted.com'];
const turnstile = 'https://challenges.cloudflare.com';

/**
 * Content Security Policy for one rendered page: `enforce` goes out as `Content-Security-Policy`, `reportOnly` as
 * `Content-Security-Policy-Report-Only`. Inline scripts are allowed by hash, computed from the page itself, so a change
 * in index.html or in Angular's generated scripts needs no manual update.
 *
 * Scripts, styles, fonts, media, objects and `<base>` are enforced with an exact host list. Frames, form posts,
 * `connect-src` and images also accept any `https:` origin in the enforced policy, because Culqi's 3-D Secure flow
 * posts to and frames hosts chosen at run time (Cardinal, the card issuer, device profiling) that cannot be listed
 * in advance; the exact list rides in `reportOnly`, so the console shows any host that would need adding before
 * those four directives drop `https:`. See docs/DEPLOY.md.
 * @param assetOrigins origins that serve CMS images and video (public CMS URL, `IMAGE_HOSTS`).
 */
export function contentSecurityPolicy(
  html: string,
  assetOrigins: readonly string[],
): { enforce: string; reportOnly: string } {
  const hashes = inlineScripts(html).map(sha256);
  const assets = ['https://images.unsplash.com', 'https://flagcdn.com', ...assetOrigins];
  const strict = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      ...hashes,
      "'unsafe-hashes'",
      sha256(STYLESHEET_ONLOAD),
      ...google,
      gtmPreview[0]!,
      meta[0]!,
      turnstile,
      ...stripeJs,
      culqi,
      ...culqi3dsScripts,
    ],
    // Angular inlines the critical CSS and component styles; Culqi 3DS adds animate.css from cdnjs.
    'style-src': ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com', gtmPreview[0]!],
    'img-src': ["'self'", 'data:', ...assets, ...google, ...googleBeacons, ...gtmPreview, ...meta, culqi, ...culqi3dsScripts],
    'media-src': ["'self'", ...assets],
    'font-src': ["'self'", 'data:'],
    'connect-src': [
      "'self'",
      'https://api.stripe.com',
      ...google,
      ...googleBeacons,
      ...meta,
      culqi,
      ...culqi3dsScripts,
      ...cardinal,
    ],
    'frame-src': [...stripeJs, 'https://hooks.stripe.com', culqi, ...cardinal, turnstile, 'https://www.googletagmanager.com'],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'", culqi, ...cardinal],
    'frame-ancestors': ["'none'"],
  };
  const open = new Set(['img-src', 'connect-src', 'frame-src', 'form-action']);
  const serialize = (directives: Record<string, string[]>) =>
    Object.entries(directives)
      .map(([name, sources]) => `${name} ${[...new Set(sources)].join(' ')}`)
      .join('; ');
  return {
    enforce: serialize(
      Object.fromEntries(
        Object.entries(strict).map(([name, sources]) => [name, open.has(name) ? [...sources, 'https:'] : sources]),
      ),
    ),
    reportOnly: serialize(strict),
  };
}
