import es from '../../../locales/es.json';
import { depositText, limaCardDay } from './format';

const money = (cents: number): string => `$${cents / 100}`;

describe('depositText', () => {
  it('says the percent, what is paid today and what is left, from the API amounts', () => {
    expect(depositText(es.booking.depositOption, 9000, 2700, money)).toBe(
      'Reserva con el 30 % hoy ($27) y paga el resto ($63) el día del tour',
    );
  });

  it('never divides by zero', () => {
    expect(depositText('{percent}', 0, 0, money)).toBe('0');
  });
});

describe('limaCardDay', () => {
  it('names the day in Lima, short and without dots', () => {
    // 01:00 UTC on the 16th is still the 15th in Lima.
    expect(limaCardDay('2026-12-16T01:00:00Z', 'es')).toBe('mar 15 dic');
    expect(limaCardDay('2026-12-16T01:00:00Z', 'en')).toBe('Tue, Dec 15');
  });
});
