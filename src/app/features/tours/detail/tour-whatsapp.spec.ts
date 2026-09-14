import {
  buildTourWhatsappHref,
  formatPickerDate,
  formatTourDate,
  localIsoDate,
  startOfLocalDay,
} from './tour-whatsapp';

describe('tour WhatsApp helpers', () => {
  it('builds a wa.me link with adults and children', () => {
    const href = buildTourWhatsappHref(
      'https://wa.me/519XXXXXXXX',
      'Hi, I want to book {tour}.\nDate: {date}\nLanguage: {language}\nAdults: {adults}\nChildren: {children}\nFormat: {format}\nPayment: {payment}\nAmount: $USD {amount}',
      {
        tour: 'Dune buggy',
        date: '20/09/2026',
        language: 'English',
        adults: '3',
        children: '1',
        format: 'Group',
        payment: 'Book now, pay later',
        amount: '27',
      },
    );

    expect(href.startsWith('https://wa.me/519XXXXXXXX?text=')).toBe(true);
    const text = decodeURIComponent(href.split('text=')[1] ?? '');
    expect(text).toContain('Dune buggy');
    expect(text).toContain('20/09/2026');
    expect(text).toContain('English');
    expect(text).toContain('Adults: 3');
    expect(text).toContain('Children: 1');
    expect(text).not.toContain('People: 4');
    expect(text).toContain('Group');
    expect(text).toContain('Book now, pay later');
    expect(text).toContain('$USD 27');
    expect(text).not.toContain('Ana');
  });

  it('formats dates without Luxon', () => {
    expect(formatPickerDate(new Date(2026, 8, 20))).toBe('20/09/2026');
    expect(formatTourDate(new Date(2026, 8, 20))).toBe('20/09/2026');
    expect(formatTourDate('2026-09-20')).toBe('20/09/2026');
    expect(localIsoDate(new Date(2026, 8, 13))).toBe('2026-09-13');
    expect(startOfLocalDay(new Date(2026, 8, 13, 19, 30)).getHours()).toBe(0);
  });
});
