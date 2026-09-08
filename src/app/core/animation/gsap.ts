import { afterNextRender, DestroyRef, inject } from '@angular/core';

type GsapCore = typeof import('gsap').default;
type GsapContext = { revert: () => void };

/**
 * Runs GSAP only after the first browser render. Dynamic imports keep ScrollTrigger
 * off the server bundle path so SSR and prerender never touch `window`.
 */
export function afterNextGsap(create: (gsap: GsapCore) => GsapContext | void): void {
  const destroyRef = inject(DestroyRef);
  let ctx: GsapContext | void;

  afterNextRender(() => {
    void (async () => {
      const { default: gsap } = await import('gsap');
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      gsap.registerPlugin(ScrollTrigger);
      ctx = create(gsap);
    })();
  });

  destroyRef.onDestroy(() => ctx?.revert());
}
