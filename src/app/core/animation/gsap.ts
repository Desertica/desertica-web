import { afterNextRender, DestroyRef, inject } from '@angular/core';

type GsapCore = typeof import('gsap').default;
type GsapScrollTrigger = typeof import('gsap/ScrollTrigger').ScrollTrigger;
type GsapContext = { revert: () => void };

/**
 * SSR-safe GSAP + ScrollTrigger. Dynamic imports keep plugins off the server bundle path.
 */
export function afterNextGsap(
  create: (
    gsap: GsapCore,
    plugins: { ScrollTrigger: GsapScrollTrigger },
  ) => GsapContext | void,
): void {
  const destroyRef = inject(DestroyRef);
  let ctx: GsapContext | void;

  afterNextRender(() => {
    void (async () => {
      const { default: gsap } = await import('gsap');
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      const { MorphSVGPlugin } = await import('gsap/MorphSVGPlugin');
      gsap.registerPlugin(ScrollTrigger, MorphSVGPlugin);
      ctx = create(gsap, { ScrollTrigger });
    })();
  });

  destroyRef.onDestroy(() => ctx?.revert());
}
