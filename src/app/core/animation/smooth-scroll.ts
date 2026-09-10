import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

type SmootherInstance = {
  kill: () => void;
  scrollTop: (position: number) => unknown;
};

const JSDOM = /jsdom/i;

@Injectable({ providedIn: 'root' })
export class SmoothScroll {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private instance: SmootherInstance | null = null;
  private started = false;
  private resolveReady: () => void = () => undefined;
  private readonly readyPromise = new Promise<void>((resolve) => {
    this.resolveReady = resolve;
  });
  private marked = false;

  constructor() {
    this.destroyRef.onDestroy(() => this.instance?.kill());
  }

  whenReady(): Promise<void> {
    return this.readyPromise;
  }

  active(): boolean {
    return this.instance !== null;
  }

  markReady(): void {
    if (this.marked) {
      return;
    }
    this.marked = true;
    this.resolveReady();
  }

  start(wrapper: HTMLElement, content: HTMLElement): void {
    if (this.started) {
      return;
    }
    this.started = true;

    if (!isPlatformBrowser(this.platformId)) {
      this.markReady();
      return;
    }

    void this.create(wrapper, content);
  }

  private async create(wrapper: HTMLElement, content: HTMLElement): Promise<void> {
    try {
      if (!this.canUse()) {
        return;
      }

      const { default: gsap } = await import('gsap');
      const { default: ScrollTrigger } = await import('gsap/ScrollTrigger');
      const { default: ScrollSmoother } = await import('gsap/ScrollSmoother');
      gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

      this.instance = ScrollSmoother.create({
        wrapper,
        content,
        smooth: 2,
        preventDefault: true,
        normalizeScroll: true,
        ignoreMobileResize: true,
        effects: false,
      } as Parameters<typeof ScrollSmoother.create>[0]);

      ScrollTrigger.refresh();

      const navigation = this.router.events
        .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
        .subscribe(() => {
          this.instance?.scrollTop(0);
          ScrollTrigger.refresh();
        });

      this.destroyRef.onDestroy(() => navigation.unsubscribe());
    } finally {
      this.markReady();
    }
  }

  private canUse(): boolean {
    if (typeof navigator !== 'undefined' && JSDOM.test(navigator.userAgent)) {
      return false;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return false;
    }

    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const narrow = window.matchMedia('(max-width: 767px)').matches;
    return !(coarse && narrow);
  }
}
