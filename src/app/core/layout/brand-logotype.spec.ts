import { TestBed } from '@angular/core/testing';
import { BrandLogotype } from './brand-logotype';

describe('BrandLogotype', () => {
  it('draws the nine DESÉRTICA letter paths in the text colour, hidden from screen readers', () => {
    const fixture = TestBed.createComponent(BrandLogotype);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.getAttribute('aria-hidden')).toBe('true');
    expect(host.querySelector('g')?.getAttribute('fill')).toBe('currentColor');
    expect(host.querySelectorAll('path').length).toBe(9);
  });
});
