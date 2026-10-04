import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { Router, Scroll } from '@angular/router';
import { filter } from 'rxjs';

type SmootherInstance = {
  kill: () => void;
  paused: (value?: boolean) => boolean;
  scrollTop: (position: number) => unknown;
  scrollTo: (target: string | number | Element, smooth?: boolean, position?: string) => unknown;
};

const JSDOM = /jsdom/i;
const FRAGMENT_OFFSET = 'top 96px';
const MAX_FRAGMENT_ATTEMPTS = 20;

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

    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      history.scrollRestoration = 'manual';
    } catch {
      // Some embedded browsers reject this assignment.
    }

    const navigation = this.router.events
      .pipe(filter((event): event is Scroll => event instanceof Scroll))
      .subscribe((event) => this.onRouterScroll(event));

    this.destroyRef.onDestroy(() => navigation.unsubscribe());
  }

  whenReady(): Promise<void> {
    return this.readyPromise;
  }

  active(): boolean {
    return this.instance !== null;
  }

  hold(): void {
    this.instance?.paused(true);
  }

  release(): void {
    this.instance?.paused(false);
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

  scrollToElement(target: HTMLElement): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (this.instance) {
      this.instance.scrollTo(target, true, FRAGMENT_OFFSET);
      return;
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({
      behavior: reduced ? 'auto' : 'smooth',
      block: 'start',
    });
  }

  scrollToId(id: string, immediate = false): boolean {
    if (!isPlatformBrowser(this.platformId) || !id) {
      return false;
    }

    const target = document.getElementById(id);
    if (!target) {
      return false;
    }

    if (this.instance) {
      this.instance.scrollTo(target, !immediate, FRAGMENT_OFFSET);
      return true;
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({
      behavior: immediate || reduced ? 'auto' : 'smooth',
      block: 'start',
    });
    return true;
  }

  private onRouterScroll(event: Scroll): void {
    if (event.position) {
      this.snap(event.position[1]);
      return;
    }

    if (event.anchor) {
      this.scrollToFragmentWhenReady(event.anchor, true);
      return;
    }

    this.snap(0);
  }

  private snap(top: number): void {
    this.applySnap(top);
    requestAnimationFrame(() => this.applySnap(top));
  }

  private applySnap(top: number): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (this.instance) {
      this.instance.scrollTo(top, false);
      return;
    }

    window.scrollTo({ top, left: 0, behavior: 'auto' });
  }

  scrollToFragmentWhenReady(id: string | null | undefined, immediate = false): void {
    if (!id) {
      return;
    }

    void this.whenReady().then(() => this.retryScroll(id, 0, immediate));
  }

  private retryScroll(id: string, attempt: number, immediate = false): void {
    if (this.scrollToId(id, immediate) || attempt >= MAX_FRAGMENT_ATTEMPTS) {
      return;
    }

    requestAnimationFrame(() => this.retryScroll(id, attempt + 1, immediate));
  }

  private async create(wrapper: HTMLElement, content: HTMLElement): Promise<void> {
    try {
      if (!this.canUse()) {
        document.documentElement.style.scrollBehavior = 'auto';
        return;
      }

      const { default: gsap } = await import('gsap');
      const { default: ScrollTrigger } = await import('gsap/ScrollTrigger');
      const { default: ScrollSmoother } = await import('gsap/ScrollSmoother');
      gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

      this.instance = ScrollSmoother.create({
        wrapper,
        content,
        smooth: 2.2,
        smoothTouch: 0.6,
        preventDefault: true,
        normalizeScroll: { allowNestedScroll: true },
        ignoreMobileResize: true,
        effects: false,
      } as Parameters<typeof ScrollSmoother.create>[0]) as SmootherInstance;

      ScrollTrigger.refresh();
    } finally {
      this.markReady();
    }
  }

  private canUse(): boolean {
    if (typeof navigator !== 'undefined' && JSDOM.test(navigator.userAgent)) {
      return false;
    }

    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}
