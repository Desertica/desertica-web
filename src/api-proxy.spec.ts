import express from 'express';
import { apiProxy } from './api-proxy';
import { type Started, startApp, startUpstream } from './testing-http';

describe('apiProxy', () => {
  const open: Started[] = [];
  afterEach(() => {
    open.splice(0).forEach((started) => started.close());
  });

  const setup = async (
    respond: Parameters<typeof startUpstream>[0],
    options: { enabled?: boolean; writeLimit?: number } = {},
  ) => {
    const upstream = await startUpstream(respond);
    const app = express();
    app.set('trust proxy', true);
    app.use('/api/public', apiProxy({ apiUrl: upstream.url, enabled: options.enabled ?? true, ...options }));
    const proxy = await startApp(app);
    open.push(upstream, proxy);
    return { upstream, proxy };
  };

  it('answers 404 for everything while the booking engine is off', async () => {
    const { upstream, proxy } = await setup(() => ({ status: 200, body: {} }), { enabled: false });

    const response = await fetch(`${proxy.url}/api/public/tours/dune-buggy/availability?month=2026-12`);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'booking_engine_disabled' });
    expect(upstream.received).toHaveLength(0);
  });

  it('forwards availability with its query to the API under /api/public', async () => {
    const { upstream, proxy } = await setup(() => ({ status: 200, body: { data: [] } }));

    const response = await fetch(
      `${proxy.url}/api/public/tours/dune-buggy/availability?month=2026-12&currency=USD`,
      { headers: { 'Accept-Language': 'es' } },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ data: [] });
    expect(upstream.received[0]?.method).toBe('GET');
    expect(upstream.received[0]?.url).toBe('/api/public/tours/dune-buggy/availability?month=2026-12&currency=USD');
    expect(upstream.received[0]?.headers['accept-language']).toBe('es');
  });

  it('forwards the idempotency key, booking token and visitor IP on writes', async () => {
    const { upstream, proxy } = await setup(() => ({ status: 201, body: { accessToken: 't' } }));

    const created = await fetch(`${proxy.url}/api/public/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': 'key-1',
        'X-Booking-Token': 'tok',
        'X-Forwarded-For': '203.0.113.9',
        Cookie: 'locale=es',
      },
      body: JSON.stringify({ holdToken: 'h' }),
    });

    expect(created.status).toBe(201);
    const sent = upstream.received[0];
    expect(sent?.body).toEqual({ holdToken: 'h' });
    expect(sent?.headers['idempotency-key']).toBe('key-1');
    expect(sent?.headers['x-booking-token']).toBe('tok');
    expect(String(sent?.headers['x-forwarded-for'])).toContain('203.0.113.9');
    expect(sent?.headers['cookie']).toBeUndefined();
  });

  it('passes API errors through with their status and body', async () => {
    const { proxy } = await setup(() => ({
      status: 409,
      body: { statusCode: 409, error: 'Conflict', message: 'No seats left' },
    }));

    const response = await fetch(`${proxy.url}/api/public/holds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ departureId: 'd', seats: 2 }),
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ message: 'No seats left' });
  });

  it('only reaches allow-listed operations: no payments, staff routes or other methods', async () => {
    const { upstream, proxy } = await setup(() => ({ status: 200, body: {} }));
    const attempt = (path: string, method = 'GET') =>
      fetch(`${proxy.url}/api/public${path}`, {
        method,
        ...(method === 'POST' ? { headers: { 'Content-Type': 'application/json' }, body: '{}' } : {}),
      }).then((response) => response.status);

    expect(await attempt('/bookings/DES-1/payments/stripe-intent', 'POST')).toBe(404);
    expect(await attempt('/complaints', 'POST')).toBe(404);
    expect(await attempt('/contact-messages', 'POST')).toBe(404);
    expect(await attempt('/payment-links/abc')).toBe(404);
    expect(await attempt('/bookings', 'GET')).toBe(404);
    expect(await attempt('/tours/../admin/availability')).toBe(404);
    expect(await attempt('/holds/abc', 'POST')).toBe(404);
    expect(upstream.received).toHaveLength(0);
  });

  it('rate-limits writes per IP', async () => {
    const { proxy } = await setup(() => ({ status: 201, body: {} }), { writeLimit: 2 });
    const hold = () =>
      fetch(`${proxy.url}/api/public/holds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      }).then((response) => response.status);

    expect([await hold(), await hold(), await hold()]).toEqual([201, 201, 429]);
  });

  it('answers 502 when the API is down', async () => {
    const proxy = express();
    proxy.use('/api/public', apiProxy({ apiUrl: 'http://127.0.0.1:1', enabled: true, timeoutMs: 500 }));
    const started = await startApp(proxy);
    open.push(started);

    const response = await fetch(`${started.url}/api/public/legal-documents/current?locale=es`);
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'api_unreachable' });
  });
});
