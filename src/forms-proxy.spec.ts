import express from 'express';
import { formsProxy, type FormsProxyOptions } from './forms-proxy';
import { type Started, startApp, startUpstream } from './testing-http';

const complaint = {
  kind: 'RECLAMO',
  goodType: 'SERVICE',
  consumerName: 'Ana Perez',
  idDocType: 'DNI',
  idDocNumber: '12345678',
  address: 'Av. Lima 123, Ica',
  email: 'ana@example.com',
  description: 'Dune buggy tour on 2026-12-01',
  detail: 'The tour started two hours late.',
  request: 'Partial refund.',
};

const contact = {
  name: 'Ana',
  email: 'ana@example.com',
  whatsapp: '+51987654321',
  country: 'PE',
  message: 'Hola',
  locale: 'es',
};

describe('formsProxy', () => {
  const open: Started[] = [];
  afterEach(() => {
    open.splice(0).forEach((started) => started.close());
    vi.unstubAllGlobals();
  });

  const setup = async (
    options: Partial<FormsProxyOptions>,
    respond: Parameters<typeof startUpstream>[0] = () => ({ status: 201, body: {} }),
  ) => {
    const upstream = await startUpstream(respond);
    const app = express();
    app.use(
      '/api/forms',
      formsProxy({
        strapiUrl: upstream.url,
        apiUrl: upstream.url,
        ...options,
      }),
    );
    const proxy = await startApp(app);
    open.push(upstream, proxy);
    const post = (form: string, body: unknown) =>
      fetch(`${proxy.url}/api/forms/${form}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    return { upstream, post };
  };

  it('sends a complaint to POST /public/complaints and returns the correlative and due date', async () => {
    const { upstream, post } = await setup({}, () => ({
      status: 201,
      body: { correlative: 42, dueAt: '2026-12-31T00:00:00.000Z' },
    }));

    const response = await post('complaint', { ...complaint, isMinor: false, amountCents: 12000, currency: 'PEN', turnstileToken: 'tt' });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ok: true, correlative: 42, dueAt: '2026-12-31T00:00:00.000Z' });
    expect(upstream.received[0]?.url).toBe('/api/public/complaints');
    expect(upstream.received[0]?.body).toEqual({
      ...complaint,
      isMinor: false,
      amountCents: 12000,
      currency: 'PEN',
      turnstileToken: 'tt',
    });
  });

  it('rejects an invalid complaint before it reaches the API', async () => {
    const { upstream, post } = await setup({});

    for (const bad of [
      { ...complaint, idDocNumber: '123' },
      { ...complaint, idDocType: 'RUC', idDocNumber: '12345678' },
      { ...complaint, kind: 'OTHER' },
      { ...complaint, email: 'nope' },
      { ...complaint, detail: '' },
      { ...complaint, amountCents: 1.5, currency: 'USD' },
      { ...complaint, amountCents: 100 },
      { ...complaint, isMinor: 'yes' },
    ]) {
      expect((await post('complaint', bad)).status).toBe(400);
    }

    expect(upstream.received).toHaveLength(0);
  });

  it('drops unknown complaint fields', async () => {
    const { upstream, post } = await setup({});
    await post('complaint', { ...complaint, status: 'ANSWERED', handledBy: 'me' });

    expect(upstream.received[0]?.body).not.toHaveProperty('status');
    expect(upstream.received[0]?.body).not.toHaveProperty('handledBy');
  });

  it('answers 503 for complaints when no API is configured', async () => {
    const { post } = await setup({ apiUrl: null });
    const response = await post('complaint', complaint);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'api_disabled' });
  });

  it('keeps contact messages in Strapi while the booking engine is off', async () => {
    const { upstream, post } = await setup({ bookingEngine: false });
    expect((await post('contact', contact)).status).toBe(201);

    expect(upstream.received[0]?.url).toBe('/api/contact-messages');
    expect(upstream.received[0]?.body).toEqual({ data: contact });
  });

  it('sends contact messages to the API once the booking engine is on', async () => {
    const { upstream, post } = await setup({ bookingEngine: true });
    expect((await post('contact', { ...contact, turnstileToken: 'tt' })).status).toBe(201);

    expect(upstream.received[0]?.url).toBe('/api/public/contact-messages');
    expect(upstream.received[0]?.body).toEqual({ ...contact, turnstileToken: 'tt' });
  });

  it('verifies Turnstile for Strapi forms and never forwards the token', async () => {
    const real = globalThis.fetch;
    const siteverify = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      if (String(input).startsWith('https://challenges.cloudflare.com/')) {
        const response = new URLSearchParams(String(init?.body)).get('response');
        return new Response(JSON.stringify({ success: response === 'good' }));
      }

      return real(input, init);
    });
    vi.stubGlobal('fetch', siteverify);
    const { upstream, post } = await setup({ turnstileSecret: 'secret' });

    expect((await post('contact', contact)).status).toBe(400);
    expect((await post('contact', { ...contact, turnstileToken: 'bad' })).status).toBe(400);
    expect(upstream.received).toHaveLength(0);

    expect((await post('contact', { ...contact, turnstileToken: 'good' })).status).toBe(201);
    expect(upstream.received[0]?.body).toEqual({ data: contact });
  });

  it('leaves Turnstile to the API when the form goes there', async () => {
    const siteverify = vi.fn();
    const real = globalThis.fetch;
    vi.stubGlobal('fetch', (input: string | URL | Request, init?: RequestInit) => {
      if (String(input).includes('cloudflare')) {
        siteverify();
      }
      return real(input, init);
    });
    const { post } = await setup({ turnstileSecret: 'secret' });

    expect((await post('complaint', { ...complaint, turnstileToken: 'tt' })).status).toBe(201);
    expect(siteverify).not.toHaveBeenCalled();
  });

  it('maps upstream failures and rate limits', async () => {
    const down = await setup({ apiUrl: 'http://127.0.0.1:1', timeoutMs: 300 });
    const unreachable = await down.post('complaint', complaint);
    expect(unreachable.status).toBe(502);
    expect(await unreachable.json()).toEqual({ error: 'api_unreachable' });

    const limited = await setup({ limit: 1 });
    expect((await limited.post('complaint', complaint)).status).toBe(201);
    expect((await limited.post('complaint', complaint)).status).toBe(429);
  });
});
