import { ApplicationRef, PLATFORM_ID, TransferState, makeStateKey } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '../api/api-client';
import { mockApi } from '../../testing/mock-api';
import { TourPrices } from './tour-prices';

describe('TourPrices', () => {
  let mock: ReturnType<typeof mockApi> | undefined;
  afterEach(() => mock?.restore());

  const setup = (platform: 'server' | 'browser', apiUrl: string | null = 'http://api.test') =>
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: platform },
        { provide: API_URL, useValue: apiUrl },
      ],
    });

  it('uses the booking system price on the server and hands it to the browser', async () => {
    mock = mockApi({
      'GET /public/tour-prices': (call) => ({
        body: {
          data:
            call.query.get('currency') === 'USD'
              ? [{ slug: 'dune-buggy', fromCents: 4500, unit: 'PER_PERSON' }]
              : [],
        },
      }),
    });
    setup('server');
    const prices = TestBed.inject(TourPrices);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(prices.priceFor('dune-buggy', 'USD')).toEqual({ currency: 'USD', amount: 45 });
    // No soles price: the card keeps the dollar one, and the exact amount in soles is unknown.
    expect(prices.priceFor('dune-buggy', 'PEN')).toEqual({ currency: 'USD', amount: 45 });
    expect(prices.amount('dune-buggy', 'PEN')).toBeUndefined();
    expect(TestBed.inject(TransferState).get(makeStateKey<object>('tour-prices'), {})).toEqual({
      USD: { 'dune-buggy': 4500 },
      PEN: {},
    });
  });

  it('has no price, and does not throw, when the API is down or not configured', async () => {
    mock = mockApi({ 'GET /public/tour-prices': () => ({ status: 503, body: {} }) });
    setup('server');
    const down = TestBed.inject(TourPrices);
    await TestBed.inject(ApplicationRef).whenStable();
    expect(down.priceFor('dune-buggy', 'USD')).toBeNull();
    expect(down.amount('dune-buggy', 'USD')).toBeUndefined();

    TestBed.resetTestingModule();
    setup('server', null);
    expect(TestBed.inject(TourPrices).priceFor('dune-buggy', 'USD')).toBeNull();
    expect(mock.calls).toHaveLength(2);

    TestBed.resetTestingModule();
    setup('browser');
    expect(TestBed.inject(TourPrices).priceFor('dune-buggy', 'USD')).toBeNull();
  });

  it('reads the server copy in the browser', () => {
    setup('browser');
    TestBed.inject(TransferState).set(makeStateKey<object>('tour-prices'), {
      USD: { 'dune-buggy': 3900 },
    });
    expect(TestBed.inject(TourPrices).priceFor('dune-buggy', 'USD')).toEqual({
      currency: 'USD',
      amount: 39,
    });
  });
});
