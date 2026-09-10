import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { DestroyRef, Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';

export type ColorScheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  readonly theme = signal<ColorScheme>(this.readInitialTheme());
  readonly isDark = computed(() => this.theme() === 'dark');

  constructor() {
    this.apply(this.theme());
    this.watchSystemPreference();
  }

  toggle(): void {
    const next: ColorScheme = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(next);
    this.persist(next);
    this.apply(next);
  }

  private readInitialTheme(): ColorScheme {
    if (!isPlatformBrowser(this.platformId)) {
      return 'light';
    }

    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') {
      return stored;
    }

    return this.prefersDark() ? 'dark' : 'light';
  }

  private persist(theme: ColorScheme): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }

  private apply(theme: ColorScheme): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const root = this.document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
  }

  private watchSystemPreference(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => {
      if (localStorage.getItem(THEME_STORAGE_KEY)) {
        return;
      }

      const next: ColorScheme = event.matches ? 'dark' : 'light';
      this.theme.set(next);
      this.apply(next);
    };

    media.addEventListener('change', onChange);
    this.destroyRef.onDestroy(() => media.removeEventListener('change', onChange));
  }

  private prefersDark(): boolean {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
}
