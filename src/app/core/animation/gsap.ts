import { afterNextRender, DestroyRef, inject } from '@angular/core';

type GsapCore = typeof import('gsap').default;
type GsapScrollTrigger = (typeof import('gsap/ScrollTrigger'))['default'];
type GsapSplitText = (typeof import('gsap/SplitText'))['default'];
type GsapContext = { revert: () => void };

export type GsapPluginFlags = {
  morphSvg?: boolean;
  drawSvg?: boolean;
  splitText?: boolean;
  scrollSmoother?: boolean;
};

export type GsapPlugins = {
  ScrollTrigger: GsapScrollTrigger;
  SplitText?: GsapSplitText;
};

/**
 * SSR-safe GSAP + ScrollTrigger. Extra plugins are opt-in so the footer bounce
 * does not pull DrawSVG/SplitText. ScrollSmoother is created once in SmoothScroll.
 */
export function afterNextGsap(
  create: (gsap: GsapCore, plugins: GsapPlugins) => GsapContext | void,
  flags: GsapPluginFlags = { morphSvg: true },
): void {
  const destroyRef = inject(DestroyRef);
  let ctx: GsapContext | void;
  let destroyed = false;

  afterNextRender(() => {
    void (async () => {
      const { default: gsap } = await import('gsap');
      const { default: ScrollTrigger } = await import('gsap/ScrollTrigger');
      gsap.registerPlugin(ScrollTrigger);

      if (flags.morphSvg !== false) {
        const { default: MorphSVGPlugin } = await import('gsap/MorphSVGPlugin');
        gsap.registerPlugin(MorphSVGPlugin);
      }

      if (flags.drawSvg) {
        const { default: DrawSVGPlugin } = await import('gsap/DrawSVGPlugin');
        gsap.registerPlugin(DrawSVGPlugin);
      }

      if (flags.scrollSmoother) {
        const { default: ScrollSmoother } = await import('gsap/ScrollSmoother');
        gsap.registerPlugin(ScrollSmoother);
      }

      let SplitText: GsapSplitText | undefined;
      if (flags.splitText) {
        const splitModule = await import('gsap/SplitText');
        SplitText = splitModule.default;
        gsap.registerPlugin(SplitText);
      }

      if (destroyed) {
        return;
      }

      ctx = create(gsap, { ScrollTrigger, SplitText });
      if (destroyed) {
        ctx?.revert();
      }
    })();
  });

  destroyRef.onDestroy(() => {
    destroyed = true;
    ctx?.revert();
  });
}
