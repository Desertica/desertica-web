import { ApplicationRef, PLATFORM_ID, TransferState, makeStateKey } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '../api/api-client';
import { mockApi } from '../../testing/mock-api';
import { TourPrices } from './tour-prices';
import type { CatalogTour } from './tours';

const tour = { id: 'dune-buggy', priceFrom: 79, pricePen: 290 } as CatalogTour;

describe('TourPrices', () => {
  let mock: ReturnType<typeof mockApi> | undefined;
  afterEach(() => mock?.restore());

  const setup = (platform: 'server' | 'browser') =>
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: platform },
        { provide: API_URL, useValue: 'http://api.test' },
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

    expect(prices.priceFor(tour, 'USD')).toEqual({ currency: 'USD', amount: 45 });
    expect(prices.priceFor(tour, 'PEN')).toEqual({ currency: 'PEN', amount: 290 });
    expect(TestBed.inject(TransferState).get(makeStateKey<object>('tour-prices'), {})).toEqual({
      USD: { 'dune-buggy': 4500 },
      PEN: {},
    });
  });

  it('keeps the CMS price when the API has none', () => {
    setup('browser');
    expect(TestBed.inject(TourPrices).priceFor(tour, 'USD')).toEqual({
      currency: 'USD',
      amount: 79,
    });
  });

  it('reads the server copy in the browser', () => {
    setup('browser');
    TestBed.inject(TransferState).set(makeStateKey<object>('tour-prices'), {
      USD: { 'dune-buggy': 3900 },
    });
    expect(TestBed.inject(TourPrices).priceFor(tour, 'USD')).toEqual({
      currency: 'USD',
      amount: 39,
    });
  });
});
