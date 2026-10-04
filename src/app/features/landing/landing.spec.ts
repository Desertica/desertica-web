import { IMAGE_LOADER } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { INTRO_STORAGE_KEY } from '../../core/animation/intro';
import { remoteImageLoader } from '../../core/images/remote-image-loader';
import { Landing } from './landing';

describe('Landing', () => {
  beforeEach(async () => {
    sessionStorage.setItem(INTRO_STORAGE_KEY, '1');
    document.documentElement.dataset['intro'] = 'done';
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
      imports: [Landing],
      providers: [
        provideRouter([]),
        provideSpartanHlm(),
        { provide: IMAGE_LOADER, useValue: remoteImageLoader },
      ],
    }).compileComponents();
  });

  it('rests on the dune photo with the wordmark marked aside', async () => {
    const fixture = TestBed.createComponent(Landing);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const hero = compiled.querySelector('[data-hero]');
    const photo = hero?.querySelector('[data-hero-photo]');

    expect(hero?.querySelector('h1')?.textContent?.trim()).toBe('Desert days in Ica');
    expect(hero?.textContent).toContain(
      'Dune buggies, vineyard sunsets, and nights by the oasis — planned around your pace.',
    );
    expect(photo?.getAttribute('alt')).toBe('');
    expect(photo?.className).toContain('object-[center_40%]');
    expect(photo?.className).toContain('rounded-none');
    expect(photo?.getAttribute('src') ?? photo?.getAttribute('ngsrc')).toContain(
      'photo-1509316785289-025f5b846b35',
    );
    expect(compiled.querySelector('.wordmark-stage')?.className).toContain('hero-rest');
    expect(hero?.querySelector('a[href="/tours"]')).not.toBeNull();
    expect(compiled.querySelector('a[href="/tours#huacachina"]')).not.toBeNull();
    expect(compiled.querySelector('a[href="/tours#paracas"]')).not.toBeNull();
    expect(compiled.querySelector('a[href="/tours#nazca"]')).not.toBeNull();
  });
});