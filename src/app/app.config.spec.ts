import { formatDate } from '@angular/common';
import './app.config';

describe('app config', () => {
  it('has Spanish locale data for the date pipe', () => {
    expect(formatDate(new Date(2026, 11, 1), 'longDate', 'es')).toBe('1 de diciembre de 2026');
  });
});
