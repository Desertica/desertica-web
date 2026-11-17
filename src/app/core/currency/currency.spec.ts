import { TestBed } from '@angular/core/testing';
import { CurrencyService } from './currency';

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
