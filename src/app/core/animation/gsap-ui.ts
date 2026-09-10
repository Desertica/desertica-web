import { afterNextRender, DestroyRef, inject } from '@angular/core';

type GsapCore = typeof import('gsap').default;
type GsapContext = { revert: () => void };

/**
 * SSR-safe GSAP core only — enough for hover timelines without ScrollTrigger.
 */
export function afterNextGsapUi(create: (gsap: GsapCore) => GsapContext | void): void {
  const destroyRef = inject(DestroyRef);
  let ctx: GsapContext | void;

  afterNextRender(() => {
    void (async () => {
      const { default: gsap } = await import('gsap');
      ctx = create(gsap);
    })();
  });

  destroyRef.onDestroy(() => ctx?.revert());
}
