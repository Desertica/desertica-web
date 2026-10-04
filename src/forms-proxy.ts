import express from 'express';
import {
  COMPLAINT_FIELDS,
  COMPLAINT_FLAGS,
  COMPLAINT_NUMBERS,
  CONTACT_FIELDS,
  type Cleaned,
  type FieldSpec,
  type FlagSpec,
  type NumberSpec,
  RESERVATION_FIELDS,
  RESERVATION_NUMBERS,
  complaintIsConsistent,
  sanitize,
} from './forms-validation';
import { createRateLimiter } from './rate-limit';

export type FormsProxyOptions = {
  strapiUrl: string | null;
  token?: string | null;
  /** Shared with Strapi so its rate limiter sees the visitor IP instead of this server's. */
  secret?: string | null;
  /** Origin of desertica-api. Complaints need it; contact messages use it only with `bookingEngine`. */
  apiUrl?: string | null;
  /** `BOOKING_ENGINE_ENABLED`: contact messages go to the API instead of Strapi. */
  bookingEngine?: boolean;
  /** Cloudflare Turnstile secret. When set, forms sent to Strapi must carry a valid token. */
  turnstileSecret?: string | null;
  timeoutMs?: number;
  /** Submissions allowed per IP and form within `windowMs`. */
  limit?: number;
  windowMs?: number;
};

type Target = 'strapi' | 'api';

type FormDefinition = {
  /** Where the submission goes for the current configuration; `null` when nowhere. */
  target: Target | null;
  path: string;
  fields: Record<string, FieldSpec>;
  numbers?: Record<string, NumberSpec>;
  flags?: Record<string, FlagSpec>;
  check?: (data: Cleaned) => boolean;
};

const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export function formsProxy(options: FormsProxyOptions): express.Router {
  const router = express.Router();
  const allowed = createRateLimiter(options.limit ?? 8, options.windowMs ?? 10 * 60 * 1000);
  const timeout = options.timeoutMs ?? 8000;

  router.use(express.json({ limit: '16kb' }));

  const verifyTurnstile = async (token: unknown, ip: string): Promise<'ok' | 'invalid' | 'down'> => {
    if (typeof token !== 'string' || !token) {
      return 'invalid';
    }

    try {
      const response = await fetch(SITEVERIFY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ secret: options.turnstileSecret ?? '', response: token, remoteip: ip }),
        signal: AbortSignal.timeout(timeout),
      });
      const body = (await response.json()) as { success?: boolean };
      return body.success === true ? 'ok' : 'invalid';
    } catch {
      return 'down';
    }
  };

  const forward =
    (form: string, definition: FormDefinition) =>
    async (req: express.Request, res: express.Response): Promise<void> => {
      if (!definition.target) {
        res.status(503).json({ error: form === 'complaint' ? 'api_disabled' : 'cms_disabled' });
        return;
      }

      const ip = req.ip ?? 'unknown';
      if (!allowed(`${form}|${ip}`)) {
        res.status(429).json({ error: 'rate_limited' });
        return;
      }

      const data = sanitize(req.body, definition.fields, definition.numbers ?? {}, definition.flags);
      if (!data || (definition.check && !definition.check(data))) {
        res.status(400).json({ error: 'invalid' });
        return;
      }

      // The API verifies the (single-use) token itself; for Strapi the proxy has to.
      if (definition.target === 'strapi') {
        if (options.turnstileSecret) {
          const outcome = await verifyTurnstile(data['turnstileToken'], ip);
          if (outcome !== 'ok') {
            res.status(outcome === 'down' ? 502 : 400).json({ error: outcome === 'down' ? 'captcha_unreachable' : 'captcha' });
            return;
          }
        }

        delete data['turnstileToken'];
      }

      const base = definition.target === 'api' ? `${options.apiUrl}/api/public` : `${options.strapiUrl}/api`;
      try {
        const response = await fetch(`${base}/${definition.path}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(definition.target === 'strapi' && options.token
              ? { Authorization: `Bearer ${options.token}` }
              : {}),
            ...(definition.target === 'strapi' && options.secret
              ? { 'X-Forms-Secret': options.secret, 'X-Client-IP': ip }
              : {}),
            ...(definition.target === 'api' ? { 'X-Forwarded-For': ip } : {}),
          },
          body: JSON.stringify(definition.target === 'api' ? data : { data }),
          signal: AbortSignal.timeout(timeout),
        });

        if (response.ok) {
          const payload = await readJson(response);
          res.status(201).json({ ok: true, ...(definition.target === 'api' ? payload : {}) });
        } else if (response.status === 400 || response.status === 422) {
          res.status(400).json({ error: 'invalid' });
        } else if (response.status === 429) {
          res.status(429).json({ error: 'rate_limited' });
        } else {
          res.status(502).json({ error: definition.target === 'api' ? 'api_error' : 'cms_error' });
        }
      } catch {
        res
          .status(502)
          .json({ error: definition.target === 'api' ? 'api_unreachable' : 'cms_unreachable' });
      }
    };

  const strapi: Target | null = options.strapiUrl ? 'strapi' : null;
  const api: Target | null = options.apiUrl ? 'api' : null;
  const contactTarget: Target | null = options.bookingEngine && api ? 'api' : strapi;

  router.post(
    '/reservation',
    forward('reservation', {
      target: strapi,
      path: 'reservations',
      fields: RESERVATION_FIELDS,
      numbers: RESERVATION_NUMBERS,
    }),
  );
  router.post(
    '/contact',
    forward('contact', {
      target: contactTarget,
      path: 'contact-messages',
      fields: CONTACT_FIELDS,
    }),
  );
  router.post(
    '/complaint',
    forward('complaint', {
      target: api,
      path: 'complaints',
      fields: COMPLAINT_FIELDS,
      numbers: COMPLAINT_NUMBERS,
      flags: COMPLAINT_FLAGS,
      check: complaintIsConsistent,
    }),
  );
  return router;
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await response.json();
    return typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
