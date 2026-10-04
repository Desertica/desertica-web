import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, afterNextRender, computed, inject, signal } from '@angular/core';

export const INTRO_STORAGE_KEY = 'desertica-intro';

export type IntroStatus = 'pending' | 'playing' | 'done';

export function isHomePath(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, '') || '/';
  return path === '/';
}

@Injectable({ providedIn: 'root' })
export class IntroService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly openedOnHome = this.readIsHome();
  private readonly ready = signal(false);

  readonly status = signal<IntroStatus>(this.readInitialStatus());
  readonly showOverlay = computed(
    () => this.ready() && this.status() !== 'done' && !this.openedOnHome,
  );

  constructor() {
    afterNextRender(() => this.ready.set(true));
  }

  shouldPlay(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }

    if (this.prefersReducedMotion()) {
      return false;
    }

    try {
      return sessionStorage.getItem(INTRO_STORAGE_KEY) !== '1';
    } catch {
      return false;
    }
  }

  markPlaying(): void {
    if (this.status() === 'done') {
      return;
    }

    this.status.set('playing');
    this.document.documentElement.dataset['intro'] = 'playing';
  }

  complete(): void {
    if (this.status() === 'done') {
      return;
    }

    this.status.set('done');
    this.document.documentElement.dataset['intro'] = 'done';
    this.remember();
  }

  private readInitialStatus(): IntroStatus {
    if (!this.shouldPlay()) {
      return 'done';
    }

    return 'pending';
  }

  private readIsHome(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }

    return isHomePath(window.location.pathname);
  }

  private remember(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      sessionStorage.setItem(INTRO_STORAGE_KEY, '1');
    } catch {
      return;
    }
  }

  private prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}
