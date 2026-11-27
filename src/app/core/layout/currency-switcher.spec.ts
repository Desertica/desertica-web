import { TestBed } from '@angular/core/testing';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { CurrencyService } from '../currency/currency';
import { CurrencySwitcher } from './currency-switcher';

describe('CurrencySwitcher', () => {
  beforeEach(async () => {
    localStorage.removeItem('currency');
    await TestBed.configureTestingModule({
      imports: [CurrencySwitcher],
      providers: [provideSpartanHlm()],
    }).compileComponents();
  });

  afterEach(() => localStorage.removeItem('currency'));

  async function render() {
    const fixture = TestBed.createComponent(CurrencySwitcher);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(el.querySelectorAll('button'));
    const byCode = (code: string) =>
      buttons.find((b) => b.getAttribute('aria-label')?.includes(code))!;
    return { fixture, el, pen: byCode('PEN'), usd: byCode('USD') };
  }

  it('shows S/ | $ as a labelled group with the active currency pressed', async () => {
    const { el, pen, usd } = await render();

    expect(el.querySelector('[role="group"]')?.getAttribute('aria-label')).toBe('Currency');
    expect(pen.textContent).toContain('S/');
    expect(usd.textContent).toContain('$');
    expect(usd.getAttribute('aria-pressed')).toBe('true');
    expect(pen.getAttribute('aria-pressed')).toBe('false');
  });

  it('sets the currency when the other one is pressed', async () => {
    const { fixture, pen, usd } = await render();

    pen.click();
    await fixture.whenStable();

    expect(TestBed.inject(CurrencyService).currency()).toBe('PEN');
    expect(pen.getAttribute('aria-pressed')).toBe('true');
    expect(usd.getAttribute('aria-pressed')).toBe('false');
  });

  it('does nothing when the active currency is pressed', async () => {
    const { fixture, usd } = await render();
    const set = vi.spyOn(TestBed.inject(CurrencyService), 'set');

    usd.click();
    await fixture.whenStable();

    expect(set).not.toHaveBeenCalled();
  });
});
