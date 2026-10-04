import { IMAGE_LOADER } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { remoteImageLoader } from '../../core/images/remote-image-loader';
import { Products } from './products';

describe('Products', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Products],
      providers: [
        provideRouter([]),
        { provide: IMAGE_LOADER, useValue: remoteImageLoader },
      ],
    }).compileComponents();
  });

  it('shows a coming soon screen that links to tours', async () => {
    const fixture = TestBed.createComponent(Products);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('h1')?.textContent?.trim()).toBe('Coming soon');
    expect(compiled.textContent).toContain('Pisco, tejas, and ceramics');
    const link = compiled.querySelector('a');
    expect(link?.getAttribute('href')).toBe('/tours');
    expect(link?.textContent?.trim()).toBe('Tours');
    expect(compiled.querySelector('img')?.className).toContain('rounded-none');
    expect(compiled.querySelector('button')).toBeNull();
  });
});
