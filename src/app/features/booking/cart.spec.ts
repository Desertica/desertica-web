import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { BookingFlow, type BookingSelection } from '../../core/booking/booking-flow';
import { CartService } from '../../core/booking/cart';
import { DEPARTURE_ID, QUOTE, tomorrowDeparture } from '../../testing/booking-fixtures';
import { mockApi } from '../../testing/mock-api';
import { settle } from '../../testing/settle';
import { Cart } from './cart';

const selection = (totalCents = QUOTE.totalCents): BookingSelection => ({
  tourSlug: 'dune-buggy',
  departureId: DEPARTURE_ID,
  startsAt: tomorrowDeparture().startsAt,
  meetingPoint: 'Plaza de Armas, Ica',
  currency: 'USD',
  format: 'SHARED',
  language: 'es',
  adults: 2,
  children: 0,
  quote: { ...QUOTE, totalCents },
});

const hold = {
  token: 'hold-1',
  departureId: DEPARTURE_ID,
  seats: 2,
  expiresAt: new Date(Date.now() + 600_000).toISOString(),
};

describe('Cart page', () => {
  let mock: ReturnType<typeof mockApi>;

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'checkout', children: [] }]), provideSpartanHlm()],
    }).compileComponents();
  });

  afterEach(() => mock?.restore());

  const mount = async (items: BookingSelection[], routes: Parameters<typeof mockApi>[0] = {}) => {
    mock = mockApi({ 'POST /public/quotes': () => ({ body: QUOTE }), 'POST /public/holds': () => ({ status: 201, body: hold }), ...routes });
    const cart = TestBed.inject(CartService);
    items.forEach((item) => cart.add(item));
    const fixture = TestBed.createComponent(Cart);
    TestBed.tick();
    await settle(fixture);
    return { fixture, cart, el: fixture.nativeElement as HTMLElement };
  };

  const click = async (fixture: { detectChanges: () => void }, el: HTMLElement, label: RegExp) => {
    const button = [...el.querySelectorAll('button')].find((b) => label.test(b.textContent ?? ''));
    (button as HTMLButtonElement).click();
    for (let i = 0; i < 6; i += 1) {
      await new Promise((r) => setTimeout(r, 0));
      fixture.detectChanges();
    }
  };

  it('says the cart is empty only once the saved cart has been read', async () => {
    const { el } = await mount([]);
    expect(el.querySelector('#cart-empty')).not.toBeNull();
  });

  it('holds the seats and goes to checkout when the price has not changed, keeping the item in the cart', async () => {
    const { fixture, cart, el } = await mount([selection()]);
    await click(fixture, el, /Continue to checkout|Continuar al pago/i);

    expect(mock.calls.find((call) => call.path === '/public/holds')?.body).toEqual({ departureId: DEPARTURE_ID, seats: 2 });
    expect(TestBed.inject(BookingFlow).hold()?.token).toBe('hold-1');
    expect(TestBed.inject(Router).url).toBe('/checkout');
    expect(cart.items()).toHaveLength(1);
  });

  it('shows the new price instead of reserving when the quote changed', async () => {
    const { fixture, cart, el } = await mount([selection(100)]);
    await click(fixture, el, /Continue to checkout|Continuar al pago/i);

    expect(mock.calls.some((call) => call.path === '/public/holds')).toBe(false);
    expect(cart.items()[0]?.quote.totalCents).toBe(QUOTE.totalCents);
    expect(el.querySelector('[role=alert]')).not.toBeNull();
    expect(TestBed.inject(Router).url).not.toBe('/checkout');
  });

  it('tells the visitor when the departure is gone', async () => {
    const { fixture, el } = await mount([selection()], { 'POST /public/quotes': () => ({ status: 404, body: {} }) });
    await click(fixture, el, /Continue to checkout|Continuar al pago/i);

    expect(el.querySelector('[role=alert]')?.textContent).toMatch(/no longer available|ya no está disponible/);
    expect(mock.calls.some((call) => call.path === '/public/holds')).toBe(false);
  });

  it('offers one reserve button per tour and no single pay button when there are several', async () => {
    const other = { ...selection(), departureId: 'other-departure' };
    const { el } = await mount([selection(), other]);

    expect([...el.querySelectorAll('button')].filter((b) => /Reserve this tour|Reservar este tour/.test(b.textContent ?? ''))).toHaveLength(2);
    expect(el.querySelector('#cart-multi-note')).not.toBeNull();
  });
});
