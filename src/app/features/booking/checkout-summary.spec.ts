import { TestBed } from '@angular/core/testing';
import type { BookingSelection } from '../../core/booking/booking-flow';
import { DEPARTURE_ID, QUOTE } from '../../testing/booking-fixtures';
import { CheckoutSummary, amountToday } from './checkout-summary';

const selection = (depositCents = QUOTE.depositCents): BookingSelection => ({
  tourSlug: 'dune-buggy',
  departureId: DEPARTURE_ID,
  startsAt: '2026-12-01T14:00:00.000Z',
  meetingPoint: 'Plaza de Armas, Ica',
  currency: 'USD',
  format: 'PRIVATE',
  language: 'en',
  adults: 2,
  children: 0,
  quote: { ...QUOTE, depositCents },
});

describe('amountToday', () => {
  it('is the deposit only when chosen and offered', () => {
    expect(amountToday(selection(), 'FULL')).toBe(15800);
    expect(amountToday(selection(), 'DEPOSIT')).toBe(3160);
    expect(amountToday(selection(0), 'DEPOSIT')).toBe(15800);
  });
});

describe('CheckoutSummary', () => {
  const mount = (kind: 'FULL' | 'DEPOSIT') => {
    const fixture = TestBed.createComponent(CheckoutSummary);
    fixture.componentRef.setInput('selection', selection());
    fixture.componentRef.setInput('kind', kind);
    fixture.componentRef.setInput('primary', true);
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ') ?? '';
  };

  it('lists the tour, options, party, meeting point and price lines', () => {
    const text = mount('FULL');
    expect(text).toContain('Dune buggy');
    expect(text).toContain('Private');
    expect(text).toContain('English');
    expect(text).toContain('2 adults');
    expect(text).toContain('Plaza de Armas, Ica');
    expect(text).toContain('2 × $79.00');
    expect(text).toContain('$158.00');
    expect(text).not.toContain('You pay today');
  });

  it('splits today and the rest with a deposit', () => {
    const text = mount('DEPOSIT');
    expect(text).toMatch(/You pay today ?\$31\.60/);
    expect(text).toMatch(/Left to pay ?\$126\.40/);
  });
});
