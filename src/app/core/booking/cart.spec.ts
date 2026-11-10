import { TestBed } from '@angular/core/testing';
import { CartService } from './cart';
import type { BookingSelection } from './booking-flow';

const item = (departureId: string, totalCents: number, adults = 2, currency: 'USD' | 'PEN' = 'USD'): BookingSelection => ({
  tourSlug: 'dune-buggy',
  departureId,
  startsAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
  meetingPoint: null,
  currency,
  format: 'SHARED',
  language: 'es',
  adults,
  children: 0,
  quote: { currency, totalCents, depositCents: 0, lines: [] },
});

describe('CartService', () => {
  beforeEach(() => sessionStorage.clear());

  it('counts people and totals per currency', () => {
    const cart = TestBed.inject(CartService);
    cart.add(item('a', 15800, 2));
    cart.add(item('b', 60000, 3, 'PEN'));
    cart.add(item('c', 5000, 1));

    expect(cart.count()).toBe(6);
    expect(cart.totals()).toEqual([
      { currency: 'USD', cents: 20800 },
      { currency: 'PEN', cents: 60000 },
    ]);
  });

  it('replaces the same departure instead of duplicating it', () => {
    const cart = TestBed.inject(CartService);
    cart.add(item('a', 15800, 2));
    cart.add(item('a', 23700, 3));

    expect(cart.items()).toHaveLength(1);
    expect(cart.items()[0]?.adults).toBe(3);
  });

  it('removes and clears, and keeps the cart for the rest of the tab', () => {
    const cart = TestBed.inject(CartService);
    cart.add(item('a', 100));
    cart.add(item('b', 200));
    cart.remove('a');

    expect(cart.items().map((i) => i.departureId)).toEqual(['b']);
    expect(JSON.parse(sessionStorage.getItem('desertica-cart') ?? '[]')).toHaveLength(1);
    cart.clear();
    expect(cart.items()).toEqual([]);
  });

  it('drops stored items that are malformed or whose departure has left, and reports it is ready', () => {
    const good = item('a', 100);
    const past = { ...item('b', 100), startsAt: '2020-01-01T00:00:00.000Z' };
    sessionStorage.setItem('desertica-cart', JSON.stringify([good, past, { departureId: 'c' }, null, 'x']));

    const cart = TestBed.inject(CartService);
    expect(cart.ready()).toBe(false);
    TestBed.tick();

    expect(cart.ready()).toBe(true);
    expect(cart.items().map((i) => i.departureId)).toEqual(['a']);
  });
});
