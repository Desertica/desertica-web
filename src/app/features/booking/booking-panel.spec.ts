import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideNativeDateAdapter } from '@spartan-ng/brain/date-time';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { BookingFlow } from '../../core/booking/booking-flow';
import { CatalogService } from '../../core/catalog/catalog';
import { DEPARTURE_ID, QUOTE, departure, tomorrowDeparture } from '../../testing/booking-fixtures';
import { stubMatchMedia } from '../../testing/match-media';
import { mockApi } from '../../testing/mock-api';
import { settle } from '../../testing/settle';
import { BookingPanel } from './booking-panel';

type PanelInternals = {
  onDate: (date: Date | undefined) => void;
  onCurrency: (value: unknown) => void;
  adults: () => number;
  bump: (kind: 'adults' | 'children', delta: 1 | -1) => void;
};

describe('BookingPanel', () => {
  let mock: ReturnType<typeof mockApi>;
  const day = tomorrowDeparture();

  beforeEach(async () => {
    stubMatchMedia(() => false);
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'checkout', children: [] }]),
        provideSpartanHlm(),
        provideNativeDateAdapter(),
      ],
    }).compileComponents();
  });

  afterEach(() => mock?.restore());

  const mount = async (overrides: Parameters<typeof mockApi>[0] = {}) => {
    mock = mockApi({
      'GET /public/tours/*/availability': (call) => ({
        body: { data: call.query.get('month') === day.month ? [departure(day.startsAt)] : [] },
      }),
      'POST /public/quotes': () => ({ body: QUOTE }),
      'POST /public/holds': () => ({
        status: 201,
        body: { token: 'hold-1', departureId: DEPARTURE_ID, seats: 2, expiresAt: new Date(Date.now() + 600_000).toISOString() },
      }),
      ...overrides,
    });
    const catalog = TestBed.inject(CatalogService);
    const fixture = TestBed.createComponent(BookingPanel);
    const resolved = catalog.resolvedTour('dune-buggy')!;
    fixture.componentRef.setInput('tour', resolved.tour);
    fixture.componentRef.setInput('page', resolved.page);
    await settle(fixture);
    return { fixture, internals: fixture.componentInstance as unknown as PanelInternals };
  };

  const text = (element: HTMLElement) => element.textContent?.replace(/\s+/g, ' ') ?? '';

  it('loads each month of availability in the chosen currency, format and language', async () => {
    await mount();

    const calls = mock.calls.filter((call) => call.path === '/public/tours/dune-buggy/availability');
    expect(calls).toHaveLength(3);
    expect(calls.map((call) => call.query.get('currency'))).toEqual(['USD', 'USD', 'USD']);
    expect(calls[0]?.query.get('format')).toBe('SHARED');
    expect(calls[0]?.query.get('language')).toBe('en');
    expect(new Set(calls.map((call) => call.query.get('month'))).size).toBe(3);
  });

  it('reloads prices when the visitor switches to soles', async () => {
    const { fixture, internals } = await mount();
    internals.onCurrency('PEN');
    await settle(fixture);

    const currencies = mock.calls
      .filter((call) => call.path.endsWith('/availability'))
      .map((call) => call.query.get('currency'));
    expect(currencies.slice(-3)).toEqual(['PEN', 'PEN', 'PEN']);
    expect(text(fixture.nativeElement)).toContain('PEN');
  });

  it('quotes the group for the single departure of the picked day', async () => {
    const { fixture, internals } = await mount();
    internals.onDate(day.date);
    await settle(fixture);

    const quote = mock.calls.find((call) => call.path === '/public/quotes');
    expect(quote?.body).toEqual({ departureId: DEPARTURE_ID, adults: 1, children: 0, currency: 'USD' });
    const total = fixture.nativeElement.querySelector('#booking-total') as HTMLElement;
    expect(total.textContent).toContain('$158.00');
    expect(text(fixture.nativeElement)).toContain('09:00');
    expect(text(fixture.nativeElement)).toContain('Plaza de Armas, Ica');

    internals.bump('adults', 1);
    await settle(fixture);
    expect(mock.calls.filter((call) => call.path === '/public/quotes').at(-1)?.body).toMatchObject({ adults: 2 });
  });

  it('holds the seats and moves on to the checkout', async () => {
    const { fixture, internals } = await mount();
    internals.onDate(day.date);
    await settle(fixture);

    (fixture.nativeElement.querySelector('#booking-continue') as HTMLButtonElement).click();
    await settle(fixture);

    expect(mock.calls.find((call) => call.path === '/public/holds')?.body).toEqual({ departureId: DEPARTURE_ID, seats: 1 });
    const flow = TestBed.inject(BookingFlow);
    expect(flow.hold()?.token).toBe('hold-1');
    expect(flow.selection()).toMatchObject({ tourSlug: 'dune-buggy', currency: 'USD', adults: 1 });
    expect(TestBed.inject(Router).url).toBe('/checkout');
  });

  it('explains a full departure and refreshes availability', async () => {
    const { fixture, internals } = await mount({
      'POST /public/holds': () => ({ status: 409, body: { statusCode: 409, error: 'Conflict', message: 'No seats' } }),
    });
    internals.onDate(day.date);
    await settle(fixture);
    const before = mock.calls.filter((call) => call.path.endsWith('/availability')).length;

    (fixture.nativeElement.querySelector('#booking-continue') as HTMLButtonElement).click();
    await settle(fixture);

    expect(text(fixture.nativeElement.querySelector('#booking-error'))).toContain('not enough seats');
    expect(mock.calls.filter((call) => call.path.endsWith('/availability')).length).toBeGreaterThan(before);
    expect(TestBed.inject(BookingFlow).hold()).toBeNull();
  });

  it('says so when nothing is available and when the API is down', async () => {
    const empty = await mount({ 'GET /public/tours/*/availability': () => ({ body: { data: [] } }) });
    expect(text(empty.fixture.nativeElement)).toContain('No departures');
    mock.restore();
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      providers: [provideRouter([]), provideSpartanHlm(), provideNativeDateAdapter()],
    }).compileComponents();
    const down = await mount({ 'GET /public/tours/*/availability': () => ({ status: 500, body: { statusCode: 500, error: 'x', message: 'x' } }) });
    expect(text(down.fixture.nativeElement)).toContain('could not load availability');
  });
});
