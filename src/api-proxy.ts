import express from 'express';
import { createRateLimiter } from './rate-limit';

export type ApiProxyOptions = {
  /** Origin of desertica-api (`API_URL`), without `/api`. `null` answers 404. */
  apiUrl: string | null;
  /** Mirrors `BOOKING_ENGINE_ENABLED`: off keeps every call out of the API. */
  enabled: boolean;
  timeoutMs?: number;
  /** Requests allowed per IP within `windowMs`, for reads and for writes. */
  readLimit?: number;
  writeLimit?: number;
  windowMs?: number;
};

type Route = { method: string; pattern: RegExp; write: boolean };

const ID = '[A-Za-z0-9_-]{1,128}';

/**
 * The only API operations a browser may reach. Payments stay out until Ola 2, and complaints and
 * contact messages go through `/api/forms/*` where they are validated first.
 */
const ROUTES: readonly Route[] = [
  { method: 'GET', pattern: /^\/tours\/[a-z0-9-]{1,120}\/availability$/, write: false },
  { method: 'POST', pattern: /^\/quotes$/, write: false },
  { method: 'POST', pattern: /^\/holds$/, write: true },
  { method: 'DELETE', pattern: new RegExp(`^/holds/${ID}$`), write: true },
  { method: 'POST', pattern: /^\/bookings$/, write: true },
  { method: 'POST', pattern: /^\/bookings\/access$/, write: true },
  { method: 'GET', pattern: new RegExp(`^/bookings/${ID}$`), write: false },
  { method: 'GET', pattern: /^\/legal-documents\/current$/, write: false },
  { method: 'POST', pattern: /^\/consents$/, write: true },
];

const FORWARDED_HEADERS = ['idempotency-key', 'x-booking-token', 'accept-language'] as const;

/** Forwards the allow-listed `/api/public/*` calls to the API so the browser never sees its URL. */
export function apiProxy(options: ApiProxyOptions): express.Router {
  const router = express.Router();
  const window = options.windowMs ?? 10 * 60 * 1000;
  const readAllowed = createRateLimiter(options.readLimit ?? 300, window);
  const writeAllowed = createRateLimiter(options.writeLimit ?? 60, window);

  router.use(express.json({ limit: '32kb' }));

  router.use(async (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (!options.enabled || !options.apiUrl) {
      res.status(404).json({ error: 'booking_engine_disabled' });
      return;
    }

    const path = req.path;
    const route = ROUTES.find((entry) => entry.method === req.method && entry.pattern.test(path));
    if (!route) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    const ip = req.ip ?? 'unknown';
    if (!(route.write ? writeAllowed : readAllowed)(`${route.write ? 'w' : 'r'}|${ip}`)) {
      res.status(429).set('Retry-After', '60').json({ error: 'rate_limited' });
      return;
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'X-Forwarded-For': ip,
    };
    for (const name of FORWARDED_HEADERS) {
      const value = req.get(name);
      if (value) {
        headers[name] = value;
      }
    }

    const hasBody = req.method === 'POST';
    if (hasBody) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const upstream = await fetch(`${options.apiUrl}/api/public${req.url}`, {
        method: req.method,
        headers,
        body: hasBody ? JSON.stringify(req.body ?? {}) : undefined,
        signal: AbortSignal.timeout(options.timeoutMs ?? 10_000),
      });
      const retryAfter = upstream.headers.get('retry-after');
      if (retryAfter) {
        res.set('Retry-After', retryAfter);
      }

      res.status(upstream.status);
      const text = await upstream.text();
      if (!text) {
        res.end();
        return;
      }

      res.type(upstream.headers.get('content-type') ?? 'application/json').send(text);
    } catch {
      res.status(502).json({ error: 'api_unreachable' });
    }
  });

  return router;
}
