import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideNativeDateAdapter } from '@spartan-ng/brain/date-time';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { BookingFlow } from '../../core/booking/booking-flow';
import { CartService } from '../../core/booking/cart';
import { CatalogService } from '../../core/catalog/catalog';
import { CurrencyService } from '../../core/currency/currency';
import { DEPARTURE_ID, QUOTE, departure, tomorrowDeparture } from '../../testing/booking-fixtures';
import { stubMatchMedia } from '../../testing/match-media';
import { mockApi } from '../../testing/mock-api';
import { loadPublicApi, publicTour } from '../../testing/public-api';
import { settle } from '../../testing/settle';
import { BookingPanel } from './booking-panel';

type PanelInternals = {
  onDate: (date: Date | undefined) => void;
  adults: () => number;
  bump: (kind: 'adults' | 'children', delta: 1 | -1) => void;
};

type PublicApi = Parameters<typeof loadPublicApi>[1];
/** What the booking system says about the tour and the party. */
const API: PublicApi = {
  tours: [publicTour({ format: 'BOTH', languages: ['es', 'en'] })],
  rules: { depositPercent: 20, availabilityMonths: 3, adultsMin: 1, childrenMin: 0, peopleMax: 12 },
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

  const mount = async (overrides: Parameters<typeof mockApi>[0] = {}, api: PublicApi | null = API) => {
    mock = mockApi({
      'GET /public/tours/*/availability': (call) => ({
        body: { data: call.query.get('month') === day.month ? [departure(day.startsAt)] : [] },
      }),
      'POST /public/quotes': () => ({ body: QUOTE }),
      'POST /public/holds': () => ({
        status: 201,
        body: {
          token: 'hold-1',
          departureId: DEPARTURE_ID,
          seats: 2,
          expiresAt: new Date(Date.now() + 600_000).toISOString(),
        },
      }),
      ...overrides,
    });
    if (api) {
      loadPublicApi(TestBed, api);
    }

    const catalog = TestBed.inject(CatalogService);
    const fixture = TestBed.createComponent(BookingPanel);
    const resolved = catalog.resolvedTour('dune-buggy')!;
    fixture.componentRef.setInput('tour', resolved.tour);
    await settle(fixture);
    return { fixture, internals: fixture.componentInstance as unknown as PanelInternals };
  };

  const text = (element: HTMLElement) => element.textContent?.replace(/\s+/g, ' ') ?? '';

  it('loads each month of availability in the chosen currency, format and language', async () => {
    await mount();

    const calls = mock.calls.filter(
      (call) => call.path === '/public/tours/dune-buggy/availability',
    );
    expect(calls).toHaveLength(3);
    expect(calls.map((call) => call.query.get('currency'))).toEqual(['USD', 'USD', 'USD']);
    expect(calls[0]?.query.get('format')).toBe('SHARED');
    expect(calls[0]?.query.get('language')).toBe('en');
    expect(new Set(calls.map((call) => call.query.get('month'))).size).toBe(3);
  });

  it('takes the calendar months and party limits from the booking rules, and hides filters the API does not list', async () => {
    const { fixture, internals } = await mount(
      {},
      {
        tours: [publicTour({ format: 'PRIVATE' })],
        rules: { depositPercent: 20, availabilityMonths: 2, adultsMin: 2, childrenMin: 0, peopleMax: 3 },
      },
    );
    const calls = mock.calls.filter((call) => call.path === '/public/tours/dune-buggy/availability');
    expect(calls).toHaveLength(2);
    expect(calls[0]?.query.get('format')).toBe('PRIVATE');
    // The CMS starts at 1 adult; the API minimum is 2 and the party stops at 3.
    expect(internals.adults()).toBe(2);
    internals.bump('adults', -1);
    expect(internals.adults()).toBe(2);
    internals.bump('adults', 1);
    internals.bump('adults', 1);
    expect(internals.adults()).toBe(3);
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('#booking-language-label')).toBeNull();
    expect(root.querySelector('#booking-format-label')).toBeNull();
  });

  it('marks the seat count in the accent colour only when three or fewer are left', async () => {
    const { internals } = await mount();
    const few = internals as unknown as { fewSeats: (d: ReturnType<typeof departure>) => boolean };
    expect(few.fewSeats(departure(day.startsAt, 3))).toBe(true);
    expect(few.fewSeats(departure(day.startsAt, 1))).toBe(true);
    expect(few.fewSeats(departure(day.startsAt, 4))).toBe(false);
  });

  it('keeps working with the built-in limits when the API has no public data', async () => {
    const { fixture, internals } = await mount({}, null);
    const calls = mock.calls.filter((call) => call.path === '/public/tours/dune-buggy/availability');
    expect(calls).toHaveLength(3);
    expect(internals.adults()).toBe(1);
    expect((fixture.nativeElement as HTMLElement).querySelector('#booking-language-label')).toBeNull();
  });

  it('reloads prices when the visitor switches to soles', async () => {
    const { fixture } = await mount();
    TestBed.inject(CurrencyService).set('PEN');
    await settle(fixture);

    const currencies = mock.calls
      .filter((call) => call.path.endsWith('/availability'))
      .map((call) => call.query.get('currency'));
    expect(currencies.slice(-3)).toEqual(['PEN', 'PEN', 'PEN']);
  });

  it('quotes the group for the single departure of the picked day', async () => {
    const { fixture, internals } = await mount();
    internals.onDate(day.date);
    await settle(fixture);

    const quote = mock.calls.find((call) => call.path === '/public/quotes');
    expect(quote?.body).toEqual({
      departureId: DEPARTURE_ID,
      adults: 1,
      children: 0,
      currency: 'USD',
    });
    const total = fixture.nativeElement.querySelector('#booking-total') as HTMLElement;
    expect(total.textContent).toContain('$USD 158');
    expect(text(fixture.nativeElement)).toContain('09:00');
    expect(text(fixture.nativeElement)).toContain('Plaza de Armas, Ica');

    internals.bump('adults', 1);
    await settle(fixture);
    expect(mock.calls.filter((call) => call.path === '/public/quotes').at(-1)?.body).toMatchObject({
      adults: 2,
    });
  });

  it('adds the picked departure to the cart without holding seats, and has no currency buttons of its own', async () => {
    const { fixture, internals } = await mount();
    internals.onDate(day.date);
    await settle(fixture);

    expect(fixture.nativeElement.querySelector('#booking-currency-label')).toBeNull();
    (fixture.nativeElement.querySelector('#booking-add') as HTMLButtonElement).click();
    await settle(fixture);

    const cart = TestBed.inject(CartService);
    expect(cart.items()).toHaveLength(1);
    expect(cart.items()[0]).toMatchObject({ tourSlug: 'dune-buggy', departureId: DEPARTURE_ID, currency: 'USD', adults: 1 });
    expect(mock.calls.some((call) => call.path === '/public/holds')).toBe(false);
    expect(fixture.nativeElement.querySelector('#booking-added')).not.toBeNull();

    internals.bump('adults', 1);
    await settle(fixture);
    expect(fixture.nativeElement.querySelector('#booking-added')).toBeNull();
  });

  it('holds the seats and moves on to the checkout', async () => {
    const { fixture, internals } = await mount();
    internals.onDate(day.date);
    await settle(fixture);

    (fixture.nativeElement.querySelector('#booking-continue') as HTMLButtonElement).click();
    await settle(fixture);

    expect(mock.calls.find((call) => call.path === '/public/holds')?.body).toEqual({
      departureId: DEPARTURE_ID,
      seats: 1,
    });
    const flow = TestBed.inject(BookingFlow);
    expect(flow.hold()?.token).toBe('hold-1');
    expect(flow.selection()).toMatchObject({ tourSlug: 'dune-buggy', currency: 'USD', adults: 1 });
    expect(TestBed.inject(Router).url).toBe('/checkout');
  });

  it('starts with the full payment and carries the deposit choice to the checkout', async () => {
    const { fixture, internals } = await mount();
    internals.onDate(day.date);
    await settle(fixture);
    const root = fixture.nativeElement as HTMLElement;
    const full = root.querySelector('#booking-pay-full') as HTMLInputElement;
    const deposit = root.querySelector('#booking-pay-deposit') as HTMLInputElement;
    expect(full.checked).toBe(true);
    expect(deposit.checked).toBe(false);
    expect(root.querySelector('#booking-deposit')?.textContent).toContain('$USD 31.60');
    expect(root.querySelector('label[for="booking-pay-deposit"]')?.textContent).toContain('Book with 20% today');
    expect(root.querySelector('#booking-deposit-rest')?.textContent).toContain('The rest ($USD 126.40) is paid later.');
    // Tax footnote: hidden asterisk on each price, the note described by both radios.
    expect(root.querySelector('#booking-deposit [aria-hidden="true"]')?.textContent).toBe('*');
    expect(full.getAttribute('aria-describedby')).toBe('booking-tax-note');
    expect(deposit.getAttribute('aria-describedby')).toBe('booking-tax-note');
    expect(root.querySelector('#booking-tax-note')?.textContent).toContain('(*)');

    deposit.click();
    await settle(fixture);
    expect(deposit.checked).toBe(true);
    (root.querySelector('#booking-continue') as HTMLButtonElement).click();
    await settle(fixture);

    expect(TestBed.inject(BookingFlow).selection()?.paymentKind).toBe('DEPOSIT');
  });

  it('offers only the full payment when the quote has no deposit', async () => {
    const { fixture, internals } = await mount({ 'POST /public/quotes': () => ({ body: { ...QUOTE, depositCents: 0 } }) });
    internals.onDate(day.date);
    await settle(fixture);
    const root = fixture.nativeElement as HTMLElement;

    expect((root.querySelector('#booking-pay-full') as HTMLInputElement).checked).toBe(true);
    expect(root.querySelector('#booking-pay-deposit')).toBeNull();
    (root.querySelector('#booking-continue') as HTMLButtonElement).click();
    await settle(fixture);
    expect(TestBed.inject(BookingFlow).selection()?.paymentKind).toBe('FULL');
  });

  it('explains a full departure and refreshes availability', async () => {
    const { fixture, internals } = await mount({
      'POST /public/holds': () => ({
        status: 409,
        body: { statusCode: 409, error: 'Conflict', message: 'No seats' },
      }),
    });
    internals.onDate(day.date);
    await settle(fixture);
    const before = mock.calls.filter((call) => call.path.endsWith('/availability')).length;

    (fixture.nativeElement.querySelector('#booking-continue') as HTMLButtonElement).click();
    await settle(fixture);

    expect(text(fixture.nativeElement.querySelector('#booking-error'))).toContain(
      'not enough seats',
    );
    expect(mock.calls.filter((call) => call.path.endsWith('/availability')).length).toBeGreaterThan(
      before,
    );
    expect(TestBed.inject(BookingFlow).hold()).toBeNull();
  });

  it('says so when nothing is available and when the API is down', async () => {
    const empty = await mount({
      'GET /public/tours/*/availability': () => ({ body: { data: [] } }),
    });
    expect(text(empty.fixture.nativeElement)).toContain('No departures');
    mock.restore();
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      providers: [provideRouter([]), provideSpartanHlm(), provideNativeDateAdapter()],
    }).compileComponents();
    const down = await mount({
      'GET /public/tours/*/availability': () => ({
        status: 500,
        body: { statusCode: 500, error: 'x', message: 'x' },
      }),
    });
    expect(text(down.fixture.nativeElement)).toContain('could not load availability');
  });
});
