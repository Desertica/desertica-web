import { TestBed } from '@angular/core/testing';
import { RequiredNote } from './required-note';

describe('RequiredNote', () => {
  it('explains the mark with the asterisk in the accent colour', () => {
    const fixture = TestBed.createComponent(RequiredNote);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.textContent).toBe('Fields marked * are required.');
    expect(root.querySelector('.text-tierra')?.textContent).toBe('*');
  });
});
