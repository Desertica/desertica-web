import { TestBed } from '@angular/core/testing';
import { CurrencyService, priceIn } from './currency';

describe('priceIn', () => {
  it('uses the soles price when there is one and soles are chosen', () => {
    expect(priceIn({ priceFrom: 79, pricePen: 290 }, 'PEN')).toEqual({ currency: 'PEN', amount: 290 });
    expect(priceIn({ priceFrom: 79, pricePen: 290 }, 'USD')).toEqual({ currency: 'USD', amount: 79 });
  });

  it('keeps dollars for a tour without a soles price', () => {
    expect(priceIn({ priceFrom: 79 }, 'PEN')).toEqual({ currency: 'USD', amount: 79 });
  });
});

describe('CurrencyService', () => {
  beforeEach(() => localStorage.removeItem('currency'));
  afterEach(() => localStorage.removeItem('currency'));

  it('starts with the CMS default and remembers the choice', () => {
    const service = TestBed.inject(CurrencyService);
    expect(service.currency()).toBe('USD');
    service.set('PEN');
    expect(service.currency()).toBe('PEN');
    expect(localStorage.getItem('currency')).toBe('PEN');
  });

  it('survives blocked storage', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const service = TestBed.inject(CurrencyService);
    service.set('PEN');
    expect(service.currency()).toBe('PEN');
    vi.restoreAllMocks();
  });
});
