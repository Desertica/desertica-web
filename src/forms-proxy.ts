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
  complaintIsConsistent,
  sanitize,
} from './forms-validation';
import { clientKey, createRateLimiter } from './rate-limit';

export type FormsProxyOptions = {
  /** Origin of desertica-api: contact messages, complaints and the provider data all go there. */
  apiUrl?: string | null;
  timeoutMs?: number;
  /** Submissions allowed per IP and form within `windowMs`. */
  limit?: number;
  windowMs?: number;
};

type FormDefinition = {
  /** `false` when no API is configured: the form is answered with 503. */
  enabled: boolean;
  path: string;
  fields: Record<string, FieldSpec>;
  numbers?: Record<string, NumberSpec>;
  flags?: Record<string, FlagSpec>;
  check?: (data: Cleaned) => boolean;
};

export function formsProxy(options: FormsProxyOptions): express.Router {
  const router = express.Router();
  const allowed = createRateLimiter(options.limit ?? 8, options.windowMs ?? 10 * 60 * 1000);
  const timeout = options.timeoutMs ?? 8000;

  router.use(express.json({ limit: '16kb' }));

  const forward =
    (form: string, definition: FormDefinition) =>
    async (req: express.Request, res: express.Response): Promise<void> => {
      if (!definition.enabled) {
        res.status(503).json({ error: 'api_disabled' });
        return;
      }

      const ip = req.ip ?? 'unknown';
      if (!allowed(`${form}|${clientKey(ip)}`)) {
        res.status(429).json({ error: 'rate_limited' });
        return;
      }

      const result = sanitize(req.body, definition.fields, definition.numbers ?? {}, definition.flags);
      if ('invalid' in result) {
        res.status(400).json({ error: 'invalid', field: result.invalid });
        return;
      }

      const data = result.data;
      if (definition.check && !definition.check(data)) {
        res.status(400).json({ error: 'invalid' });
        return;
      }

      // The API verifies the (single-use) Turnstile token itself.
      try {
        const response = await fetch(`${options.apiUrl}/api/public/${definition.path}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
          body: JSON.stringify(data),
          signal: AbortSignal.timeout(timeout),
        });

        if (response.ok) {
          const payload = await readJson(response);
          res.status(201).json({ ok: true, ...payload });
        } else if (response.status === 400 || response.status === 422) {
          res.status(400).json({ error: 'invalid' });
        } else if (response.status === 429) {
          res.status(429).json({ error: 'rate_limited' });
        } else {
          res.status(502).json({ error: 'api_error' });
        }
      } catch {
        res.status(502).json({ error: 'api_unreachable' });
      }
    };

  // The provider data on the hoja (razón social, RUC, domicilio fiscal) lives in the API; kept 5 minutes.
  const companyAllowed = createRateLimiter(60, options.windowMs ?? 10 * 60 * 1000);
  let company: { at: number; body: Record<string, unknown> } | null = null;
  router.get('/company', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (!options.apiUrl) {
      res.status(404).json({ error: 'api_disabled' });
      return;
    }

    if (!companyAllowed(`company|${clientKey(req.ip ?? 'unknown')}`)) {
      res.status(429).json({ error: 'rate_limited' });
      return;
    }

    if (company && Date.now() - company.at < 5 * 60 * 1000) {
      res.json(company.body);
      return;
    }

    try {
      const response = await fetch(`${options.apiUrl}/api/public/company`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(timeout),
      });
      const body = await readJson(response);
      if (!response.ok) {
        res.status(response.status === 404 ? 404 : 502).json({ error: response.status === 404 ? 'not_found' : 'api_error' });
        return;
      }

      const text = (key: string) => (typeof body[key] === 'string' ? body[key] : undefined);
      const picked = { legalName: text('legalName'), ruc: text('ruc'), fiscalAddress: text('fiscalAddress') };
      company = { at: Date.now(), body: picked };
      res.json(picked);
    } catch {
      res.status(502).json({ error: 'api_unreachable' });
    }
  });

  const enabled = Boolean(options.apiUrl);

  router.post(
    '/contact',
    forward('contact', {
      enabled,
      path: 'contact-messages',
      fields: CONTACT_FIELDS,
    }),
  );
  router.post(
    '/complaint',
    forward('complaint', {
      enabled,
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
