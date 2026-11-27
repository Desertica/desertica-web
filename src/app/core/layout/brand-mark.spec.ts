import { TestBed } from '@angular/core/testing';
import { BrandMark } from './brand-mark';

describe('BrandMark', () => {
  it('draws the official horizontal logo (hummingbird + DESÉRTICA) in the text colour', () => {
    const fixture = TestBed.createComponent(BrandMark);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.getAttribute('aria-hidden')).toBe('true');
    expect(host.querySelector('g')?.getAttribute('fill')).toBe('currentColor');
    expect(host.querySelectorAll('path').length).toBe(12);
  });
});
