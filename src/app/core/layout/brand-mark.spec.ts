import { TestBed } from '@angular/core/testing';
import { BrandMark } from './brand-mark';

describe('BrandMark', () => {
  it('paints the official logo: white hummingbird on the olive brand square', () => {
    const fixture = TestBed.createComponent(BrandMark);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.classList).toContain('bg-brand');
    expect(host.classList).toContain('text-brand-foreground');
    expect(host.getAttribute('aria-hidden')).toBe('true');
    expect(host.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 320 320');
  });
});
