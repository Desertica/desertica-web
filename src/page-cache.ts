import type { Request } from 'express';
import { stripLocale } from './app/core/i18n/catalogs';

export type CachedPage = { type: string; body: Buffer };

/** Pages that carry or lead to a credential or a person's booking: never shared between visitors. */
const PRIVATE_PAGE = /^\/(pay|waiver|booking|checkout|payment)(\/|$)/;

/**
 * A page can be shared when the host and path decide its content: public GET, no token or preview, no booking flow. The query is
 * left out of the key (tracking parameters would otherwise empty the cache), and the host is in it because the
 * canonical URL and the WhatsApp link are built from it when `SITE_URL` is missing.
 */
export function pageCacheKey(req: Pick<Request, 'method' | 'path' | 'hostname' | 'query'>): string | null {
  if (req.method !== 'GET' || 'token' in req.query || 'preview' in req.query || PRIVATE_PAGE.test(stripLocale(req.path))) {
    return null;
  }

  return `${req.hostname}${req.path}`;
}

/**
 * Short in-memory cache of rendered HTML. The language is in the URL, so every visitor gets the same page for the
 * same URL; the CMS content it shows is itself cached for 30 s. Only 200 responses are stored, so random URLs
 * cannot fill the memory with 404 pages.
 * shortcut: per process (a few hundred pages, tens of MB); with several instances put Cloudflare cache rules in front.
 */
export function createPageCache(ttlMs: number, maxEntries = 200) {
  const entries = new Map<string, CachedPage & { at: number }>();
  return {
    get(key: string): CachedPage | undefined {
      const entry = entries.get(key);
      if (!entry || Date.now() - entry.at >= ttlMs) {
        entries.delete(key);
        return undefined;
      }

      return entry;
    },
    set(key: string, page: CachedPage): void {
      if (ttlMs <= 0) {
        return;
      }

      entries.delete(key);
      entries.set(key, { ...page, at: Date.now() });
      if (entries.size > maxEntries) {
        entries.delete(entries.keys().next().value!);
      }
    },
  };
}
