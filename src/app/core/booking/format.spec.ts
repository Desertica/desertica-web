import es from '../../../locales/es.json';
import { cancellationTierLines } from './format';

const t = (key: string): string =>
  key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], es) as string;

describe('cancellationTierLines', () => {
  it('reads each tier as a window and adds the closing no-refund window', () => {
    expect(
      cancellationTierLines(
        [
          { hoursBefore: 24, refundPercent: 50 },
          { hoursBefore: 48, refundPercent: 100 },
        ],
        t,
      ),
    ).toEqual([
      'Con 48 horas o más de anticipación: reembolso total',
      'Con 24 horas o más de anticipación: reembolso del 50%',
      'Menos de 24 horas antes: sin reembolso',
    ]);
  });

  it('turns a zero-hour tier into "less than" the previous one, never "0 hours"', () => {
    expect(
      cancellationTierLines(
        [
          { hoursBefore: 24, refundPercent: 100 },
          { hoursBefore: 0, refundPercent: 0 },
        ],
        t,
      ),
    ).toEqual(['Con 24 horas o más de anticipación: reembolso total', 'Menos de 24 horas antes: sin reembolso']);
    expect(cancellationTierLines([{ hoursBefore: 0, refundPercent: 0 }], t)).toEqual(['Hasta el inicio del tour: sin reembolso']);
  });
});
