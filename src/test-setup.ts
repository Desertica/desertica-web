import { settleMotion } from './app/testing/settle-motion';

/** jsdom has no ResizeObserver; form fields call it while rendering and would throw. */
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver ??= ResizeObserverStub;

/**
 * Runs before every spec. Specs can share one jsdom worker, so browser state set by one test
 * (locale cookie, stored theme, intro flag) must not leak into the next.
 */
beforeEach(() => {
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {
    // Storage may be stubbed to throw by the spec that runs next; it sets up its own.
  }

  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0]?.trim();
    if (name) {
      document.cookie = `${name}=; path=/; max-age=0`;
    }
  }

  const root = document.documentElement;
  root.lang = 'en';
  root.classList.remove('dark');
  delete root.dataset['intro'];
});

/**
 * Components start loading the GSAP plugins right after render. If a spec finishes first, Vitest
 * tears the environment down mid-import, the failed module is cached for the worker, and the next
 * spec that needs it fails. Let those imports settle before each test ends.
 */
afterEach(async () => {
  await settleMotion().catch(() => undefined);
  for (let tick = 0; tick < 8; tick += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
});
