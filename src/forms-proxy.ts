import express from 'express';
import {
  CONTACT_FIELDS,
  type FieldSpec,
  type NumberSpec,
  RESERVATION_FIELDS,
  RESERVATION_NUMBERS,
  sanitize,
} from './forms-validation';

export type FormsProxyOptions = {
  strapiUrl: string | null;
  token?: string | null;
  /** Shared with Strapi so its rate limiter sees the visitor IP instead of this server's. */
  secret?: string | null;
  timeoutMs?: number;
  /** Submissions allowed per IP and form within `windowMs`. */
  limit?: number;
  windowMs?: number;
};

export function formsProxy(options: FormsProxyOptions): express.Router {
  const router = express.Router();
  const hits = new Map<string, number[]>();
  const limit = options.limit ?? 8;
  const windowMs = options.windowMs ?? 10 * 60 * 1000;

  router.use(express.json({ limit: '16kb' }));

  const allowed = (key: string): boolean => {
    const now = Date.now();
    const recent = (hits.get(key) ?? []).filter((stamp) => now - stamp < windowMs);
    if (recent.length >= limit) {
      hits.set(key, recent);
      return false;
    }

    hits.set(key, [...recent, now]);
    if (hits.size > 5000) {
      for (const [entry, stamps] of hits) {
        if (stamps.every((stamp) => now - stamp >= windowMs)) {
          hits.delete(entry);
        }
      }
    }

    return true;
  };

  const forward =
    (
      path: string,
      form: string,
      fields: Record<string, FieldSpec>,
      numbers: Record<string, NumberSpec> = {},
    ) =>
    async (req: express.Request, res: express.Response): Promise<void> => {
      if (!options.strapiUrl) {
        res.status(503).json({ error: 'cms_disabled' });
        return;
      }

      const ip = req.ip ?? 'unknown';
      if (!allowed(`${form}|${ip}`)) {
        res.status(429).json({ error: 'rate_limited' });
        return;
      }

      const data = sanitize(req.body, fields, numbers);
      if (!data) {
        res.status(400).json({ error: 'invalid' });
        return;
      }

      try {
        const response = await fetch(`${options.strapiUrl}/api/${path}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
            ...(options.secret ? { 'X-Forms-Secret': options.secret, 'X-Client-IP': ip } : {}),
          },
          body: JSON.stringify({ data }),
          signal: AbortSignal.timeout(options.timeoutMs ?? 8000),
        });

        if (response.ok) {
          res.status(201).json({ ok: true });
        } else if (response.status === 400 || response.status === 422) {
          res.status(400).json({ error: 'invalid' });
        } else if (response.status === 429) {
          res.status(429).json({ error: 'rate_limited' });
        } else {
          res.status(502).json({ error: 'cms_error' });
        }
      } catch {
        res.status(502).json({ error: 'cms_unreachable' });
      }
    };

  router.post(
    '/reservation',
    forward('reservations', 'reservation', RESERVATION_FIELDS, RESERVATION_NUMBERS),
  );
  router.post('/contact', forward('contact-messages', 'contact', CONTACT_FIELDS));
  return router;
}
