import { TestBed } from '@angular/core/testing';
import { mockApi } from '../../testing/mock-api';
import { BookingApi } from './booking-api';

describe('BookingApi against the mocked contract', () => {
  let api: BookingApi;
  let mock: ReturnType<typeof mockApi>;

  afterEach(() => mock?.restore());

  const setup = (routes: Parameters<typeof mockApi>[0]) => {
    mock = mockApi(routes);
    api = TestBed.inject(BookingApi);
  };

  it('asks for a month of availability in a currency, in the browser through /api', async () => {
    setup({
      'GET /public/tours/*/availability': () => ({
        body: {
          data: [
            {
              departureId: '5b0b6a38-2b2f-4f0c-9a40-6f0b8a3d1f11',
              startsAt: '2026-12-01T14:00:00.000Z',
              language: 'es',
              format: 'SHARED',
              seatsLeft: 6,
              price: { currency: 'USD', unit: 'PER_PERSON', adultCents: 7900, childCents: 5900 },
            },
          ],
        },
      }),
    });

    const result = await api.availability('dune-buggy', { month: '2026-12', currency: 'USD', format: 'SHARED', language: 'es' });

    expect(result.ok && result.data.data[0]?.price.adultCents).toBe(7900);
    expect(mock.calls[0]?.path).toBe('/public/tours/dune-buggy/availability');
    expect(Object.fromEntries(mock.calls[0]?.query ?? [])).toEqual({ month: '2026-12', currency: 'USD', format: 'SHARED', language: 'es' });
    expect(mock.calls[0]?.headers.get('x-booking-token')).toBeNull();
  });

  it('quotes, holds and releases', async () => {
    setup({
      'POST /public/quotes': () => ({
        body: { currency: 'USD', totalCents: 15800, depositCents: 3160, lines: [{ label: 'Adults', quantity: 2, unitCents: 7900, totalCents: 15800 }] },
      }),
      'POST /public/holds': () => ({
        status: 201,
        body: { token: 'hold-1', departureId: 'd1', seats: 2, expiresAt: '2026-12-01T10:15:00.000Z' },
      }),
      'DELETE /public/holds/*': () => ({ status: 204 }),
    });

    const quote = await api.quote({ departureId: 'd1', adults: 2, children: 0, currency: 'USD' });
    expect(quote.ok && quote.data.totalCents).toBe(15800);
    expect(mock.calls[0]?.body).toEqual({ departureId: 'd1', adults: 2, children: 0, currency: 'USD' });

    const hold = await api.createHold({ departureId: 'd1', seats: 2 });
    expect(hold.ok && hold.data.token).toBe('hold-1');

    expect((await api.releaseHold('hold-1')).ok).toBe(true);
    expect(mock.calls[2]?.path).toBe('/public/holds/hold-1');
  });

  it('creates a booking with an idempotency key', async () => {
    setup({
      'POST /public/bookings': () => ({
        status: 201,
        body: {
          booking: { reference: 'DES-1', status: 'PENDING_PAYMENT', tourSlug: 'dune-buggy', startsAt: '2026-12-01T14:00:00.000Z', currency: 'USD', totalCents: 15800, paidCents: 0, pendingCents: 15800 },
          accessToken: 'access-1',
          paymentOptions: [{ provider: 'STRIPE', kinds: ['FULL', 'DEPOSIT'] }],
        },
      }),
    });

    const created = await api.createBooking(
      {
        holdToken: 'hold-1',
        currency: 'USD',
        adults: 2,
        customer: { email: 'ana@example.com', firstName: 'Ana', lastName: 'Perez' },
        billing: { docType: 'BOLETA', name: 'Ana Perez', idDocType: 'DNI', idDocNumber: '12345678' },
        paymentKind: 'FULL',
        acceptedLegalDocumentIds: ['5b0b6a38-2b2f-4f0c-9a40-6f0b8a3d1f11'],
      },
      'idem-1',
    );

    expect(created.ok && created.data.accessToken).toBe('access-1');
    expect(mock.calls[0]?.headers.get('idempotency-key')).toBe('idem-1');
  });

  it('sends the access token on "my booking" and maps API errors', async () => {
    setup({
      'GET /public/bookings/*': (call) =>
        call.headers.get('x-booking-token') === 'ok'
          ? { body: { reference: 'DES-1', status: 'CONFIRMED', tourSlug: 'dune-buggy', startsAt: '2026-12-01T14:00:00.000Z', currency: 'USD', totalCents: 100, paidCents: 100, pendingCents: 0 } }
          : { status: 401, body: { statusCode: 401, error: 'Unauthorized', message: 'Invalid token' } },
      'POST /public/holds': () => ({
        status: 409,
        body: { statusCode: 409, error: 'Conflict', message: ['No seats left'] },
        headers: { 'retry-after': '30' },
      }),
    });

    const good = await api.booking('DES-1', 'ok');
    expect(good.ok && good.data.status).toBe('CONFIRMED');

    const bad = await api.booking('DES-1', 'nope');
    expect(bad).toMatchObject({ ok: false, status: 401, message: 'Invalid token' });

    const conflict = await api.createHold({ departureId: 'd1', seats: 9 });
    expect(conflict).toMatchObject({ ok: false, status: 409, message: 'No seats left', retryAfter: 30 });
  });

  it('turns a network failure into status 0 and an empty 202 into success', async () => {
    setup({ 'POST /public/bookings/access': () => ({ status: 202 }) });
    expect((await api.requestBookingAccess({ reference: 'DES-1', email: 'a@b.co' })).ok).toBe(true);

    mock.restore();
    globalThis.fetch = (async () => {
      throw new TypeError('offline');
    }) as typeof fetch;
    expect(await api.legalDocuments('es')).toEqual({ ok: false, status: 0, message: 'network' });
  });
});
