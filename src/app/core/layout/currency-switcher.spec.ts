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

  it('shows the symbol and code of the chosen currency, with an accessible name', async () => {
    const fixture = TestBed.createComponent(CurrencySwitcher);
    await fixture.whenStable();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    expect(button.textContent).toContain('USD');
    expect(button.querySelector('ng-icon')).not.toBeNull();
    expect(button.getAttribute('aria-label')).toBeTruthy();

    TestBed.inject(CurrencyService).set('PEN');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(button.textContent).toContain('PEN');
    expect(button.textContent).toContain('S/');
  });
});
