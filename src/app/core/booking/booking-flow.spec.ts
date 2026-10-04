import { TestBed } from '@angular/core/testing';
import { mockApi } from '../../testing/mock-api';
import { DEPARTURE_ID, QUOTE } from '../../testing/booking-fixtures';
import { BookingFlow, type BookingSelection } from './booking-flow';

const selection = (): BookingSelection => ({
  tourSlug: 'dune-buggy',
  departureId: DEPARTURE_ID,
  startsAt: '2026-12-01T14:00:00.000Z',
  meetingPoint: null,
  currency: 'USD',
  format: 'SHARED',
  language: 'es',
  adults: 2,
  children: 0,
  quote: QUOTE,
});

describe('BookingFlow', () => {
  let mock: ReturnType<typeof mockApi> | undefined;

  beforeEach(() => vi.useFakeTimers({ now: new Date('2026-12-01T10:00:00.000Z') }));
  afterEach(() => {
    mock?.restore();
    mock = undefined;
    vi.useRealTimers();
  });

  const expiresIn = (seconds: number) => new Date(Date.now() + seconds * 1000).toISOString();

  it('holds the seats, counts down and expires', async () => {
    mock = mockApi({
      'POST /public/holds': () => ({
        status: 201,
        body: { token: 'hold-1', departureId: DEPARTURE_ID, seats: 2, expiresAt: expiresIn(90) },
      }),
    });
    const flow = TestBed.inject(BookingFlow);

    const result = await flow.reserve(selection());

    expect(result.ok).toBe(true);
    expect(mock.calls[0]?.body).toEqual({ departureId: DEPARTURE_ID, seats: 2 });
    expect(flow.secondsLeft()).toBe(90);
    expect(flow.expired()).toBe(false);
    vi.advanceTimersByTime(30_000);
    expect(flow.secondsLeft()).toBe(60);
    vi.advanceTimersByTime(61_000);
    expect(flow.secondsLeft()).toBe(0);
    expect(flow.expired()).toBe(true);
  });

  it('releases the earlier hold when a new one is created and keeps nothing on failure', async () => {
    let count = 0;
    mock = mockApi({
      'POST /public/holds': () =>
        ++count === 3
          ? { status: 409, body: { statusCode: 409, error: 'Conflict', message: 'No seats' } }
          : { status: 201, body: { token: `hold-${count}`, departureId: DEPARTURE_ID, seats: 2, expiresAt: expiresIn(300) } },
      'DELETE /public/holds/*': () => ({ status: 204 }),
    });
    const flow = TestBed.inject(BookingFlow);

    await flow.reserve(selection());
    await flow.reserve(selection());
    expect(mock.calls.filter((call) => call.method === 'DELETE').map((call) => call.path)).toEqual(['/public/holds/hold-1']);
    expect(flow.hold()?.token).toBe('hold-2');

    const failed = await flow.reserve(selection());
    expect(failed).toMatchObject({ ok: false, status: 409 });
    expect(flow.hold()?.token).toBe('hold-2');
  });

  it('survives a reload within the hold, and drops a hold that already ran out', async () => {
    mock = mockApi({
      'POST /public/holds': () => ({
        status: 201,
        body: { token: 'hold-1', departureId: DEPARTURE_ID, seats: 2, expiresAt: expiresIn(120) },
      }),
    });
    await TestBed.inject(BookingFlow).reserve(selection());

    TestBed.resetTestingModule();
    const reloaded = TestBed.inject(BookingFlow);
    reloaded.restore();
    expect(reloaded.hold()?.token).toBe('hold-1');
    expect(reloaded.selection()?.tourSlug).toBe('dune-buggy');

    vi.advanceTimersByTime(121_000);
    TestBed.resetTestingModule();
    const late = TestBed.inject(BookingFlow);
    late.restore();
    expect(late.hold()).toBeNull();
    expect(sessionStorage.getItem('desertica-checkout')).toBeNull();
  });

  it('releases on request and keeps booking tokens for the tab', async () => {
    mock = mockApi({
      'POST /public/holds': () => ({
        status: 201,
        body: { token: 'hold-1', departureId: DEPARTURE_ID, seats: 2, expiresAt: expiresIn(120) },
      }),
      'DELETE /public/holds/*': () => ({ status: 204 }),
    });
    const flow = TestBed.inject(BookingFlow);
    await flow.reserve(selection());
    await flow.release();

    expect(flow.hold()).toBeNull();
    expect(mock.calls.at(-1)?.path).toBe('/public/holds/hold-1');

    flow.remember('DES-1', { accessToken: 'tok', paymentOptions: [], format: 'PRIVATE' });
    expect(flow.remembered('DES-1')).toEqual({ accessToken: 'tok', paymentOptions: [], format: 'PRIVATE' });
    flow.rememberToken('DES-1', 'new');
    expect(flow.remembered('DES-1')?.accessToken).toBe('new');
    expect(flow.remembered('DES-1')?.format).toBe('PRIVATE');
  });
});
