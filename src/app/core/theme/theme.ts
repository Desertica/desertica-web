import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';

export type ColorScheme = 'light' | 'dark';

export const DEFAULT_THEME: ColorScheme = 'light';
export const THEME_STORAGE_KEY = 'theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);

  readonly theme = signal<ColorScheme>(this.readInitialTheme());
  readonly isDark = computed(() => this.theme() === 'dark');

  constructor() {
    this.apply(this.theme());
  }

  toggle(): void {
    const next: ColorScheme = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(next);
    this.persist(next);
    this.apply(next);
  }

  private readInitialTheme(): ColorScheme {
    if (!isPlatformBrowser(this.platformId)) {
      return DEFAULT_THEME;
    }

    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') {
      return stored;
    }

    return DEFAULT_THEME;
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
}
