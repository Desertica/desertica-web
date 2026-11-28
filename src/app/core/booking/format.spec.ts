import es from '../../../locales/es.json';
import { depositText } from './format';

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
