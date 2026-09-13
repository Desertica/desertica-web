import { IMAGE_LOADER } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { remoteImageLoader } from '../../core/images/remote-image-loader';
import { Tours } from './tours';

describe('Tours', () => {
  beforeEach(async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
        onchange: null,
      }),
    });

    await TestBed.configureTestingModule({
      imports: [Tours],
      providers: [
        provideRouter([]),
        provideSpartanHlm(),
        { provide: IMAGE_LOADER, useValue: remoteImageLoader },
      ],
    }).compileComponents();
  });

  it('renders a full-bleed banner with the page title and lead over the photo', async () => {
    const fixture = TestBed.createComponent(Tours);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('h1')?.textContent?.trim()).toBe('Tours');
    expect(compiled.textContent).toContain('Huacachina, Paracas, and Nazca, by destination.');
    const overlay = compiled.querySelector('.tours-banner-overlay');
    expect(overlay).not.toBeNull();
    expect(overlay?.className).toContain('items-center');
    expect(overlay?.className).toContain('justify-end');
    expect(overlay?.className).toContain('text-center');
    expect(overlay?.querySelector('h1')).not.toBeNull();
    expect(overlay?.querySelector('p')?.textContent).toContain(
      'Huacachina, Paracas, and Nazca, by destination.',
    );

    const photo = compiled.querySelector('img[src*="photo-1511919471431-35002133f316"]');
    expect(photo).not.toBeNull();
    expect(photo?.getAttribute('sizes')).toBe('100vw');
    expect(photo?.className).toContain('object-cover');
    expect(photo?.closest('section')?.className).toContain('w-full');
    expect(photo?.closest('.max-w-6xl')).toBeNull();
  });
});
