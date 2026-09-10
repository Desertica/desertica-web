import { TestBed } from '@angular/core/testing';
import { THEME_STORAGE_KEY, ThemeService } from './theme';

describe('ThemeService', () => {
  let mediaMatches = false;
  let mediaListener: ((event: MediaQueryListEvent) => void) | undefined;

  beforeEach(() => {
    mediaMatches = false;
    mediaListener = undefined;
    localStorage.removeItem(THEME_STORAGE_KEY);
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = '';

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: (query: string) => ({
        matches: mediaMatches,
        media: query,
        addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
          mediaListener = listener;
        },
        removeEventListener: () => {
          mediaListener = undefined;
        },
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
        onchange: null,
      }),
    });

    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    localStorage.removeItem(THEME_STORAGE_KEY);
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = '';
  });

  it('follows the system scheme without writing localStorage', () => {
    mediaMatches = true;

    const service = TestBed.inject(ThemeService);

    expect(service.theme()).toBe('dark');
    expect(service.isDark()).toBe(true);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('uses a stored preference over the system scheme', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');

    const service = TestBed.inject(ThemeService);

    expect(service.theme()).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('toggles the theme and persists the choice', () => {
    const service = TestBed.inject(ThemeService);

    expect(service.theme()).toBe('light');

    service.toggle();

    expect(service.theme()).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('ignores system changes after the user picks a theme', () => {
    const service = TestBed.inject(ThemeService);
    service.toggle();

    mediaListener?.({ matches: false } as MediaQueryListEvent);

    expect(service.theme()).toBe('dark');
  });

  it('follows system changes when nothing is stored', () => {
    const service = TestBed.inject(ThemeService);

    mediaListener?.({ matches: true } as MediaQueryListEvent);

    expect(service.theme()).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });
});
