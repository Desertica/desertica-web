import { createHmac, timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';

/**
 * Draft preview token from the CMS: `<exp>.<sig>`, `exp` = unix seconds, `sig` = hex HMAC-SHA256 of
 * `<exp>:<pathname>` keyed with `FORMS_PROXY_SECRET` (the secret shared with the CMS). Binding the path means a link for one page opens no other.
 * Without a secret the preview is off and nothing is valid.
 */
export function verifyPreviewToken(
  token: unknown,
  pathname: string,
  secret: string | undefined,
  now = Date.now(),
): boolean {
  const match = secret && typeof token === 'string' ? /^(\d{1,12})\.([0-9a-f]{64})$/i.exec(token) : null;
  if (!match || Number(match[1]) * 1000 <= now) {
    return false;
  }

  const expected = createHmac('sha256', secret!).update(`${match[1]}:${pathname}`).digest();
  return timingSafeEqual(expected, Buffer.from(match[2], 'hex'));
}

/**
 * Marks the request as a draft preview (`res.locals['preview']`) when `?preview=` verifies. The page must never
 * be stored by a browser, a proxy or a search engine; an invalid or expired token is ignored and the normal page is served.
 * The CMS shows the preview in an iframe, so a valid preview may be framed by `frameAncestor` (the CMS origin) and nobody else.
 */
export function previewGate(secret: string | undefined, frameAncestor?: string): RequestHandler {
  return (req, res, next) => {
    if ((req.method === 'GET' || req.method === 'HEAD') && verifyPreviewToken(req.query['preview'], req.path, secret)) {
      res.locals['preview'] = true;
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      if (frameAncestor) {
        res.setHeader('Content-Security-Policy', `frame-ancestors ${frameAncestor}`);
      }
    }

    next();
  };
}
