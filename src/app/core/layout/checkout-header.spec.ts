import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { CheckoutHeader } from './checkout-header';

describe('CheckoutHeader', () => {
  it('shows the logo, back and "secure payment" without the site menu', async () => {
    await TestBed.configureTestingModule({ providers: [provideRouter([]), provideSpartanHlm()] }).compileComponents();
    const fixture = TestBed.createComponent(CheckoutHeader);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('#checkout-back')?.getAttribute('aria-label')).toBe('Back');
    expect(root.querySelector('#checkout-secure')?.textContent).toContain('Secure payment');
    expect(root.querySelector('app-brand-mark')).not.toBeNull();
    expect(root.querySelector('nav')).toBeNull();
  });
});
