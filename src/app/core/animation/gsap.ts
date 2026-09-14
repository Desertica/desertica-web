import { afterNextRender, DestroyRef, inject } from '@angular/core';

type GsapCore = typeof import('gsap').default;
type GsapScrollTrigger = (typeof import('gsap/ScrollTrigger'))['default'];
type GsapSplitText = (typeof import('gsap/SplitText'))['default'];
type GsapDrawSVG = (typeof import('gsap/DrawSVGPlugin'))['default'];
type GsapScrambleText = (typeof import('gsap/ScrambleTextPlugin'))['default'];
type GsapContext = { revert: () => void };

export type GsapPluginFlags = {
  morphSvg?: boolean;
  drawSvg?: boolean;
  splitText?: boolean;
  scrambleText?: boolean;
  scrollSmoother?: boolean;
};

export type GsapPlugins = {
  ScrollTrigger: GsapScrollTrigger;
  SplitText?: GsapSplitText;
  DrawSVG?: GsapDrawSVG;
  ScrambleText?: GsapScrambleText;
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

      let DrawSVG: GsapDrawSVG | undefined;
      if (flags.drawSvg) {
        const { default: DrawSVGPlugin } = await import('gsap/DrawSVGPlugin');
        gsap.registerPlugin(DrawSVGPlugin);
        DrawSVG = DrawSVGPlugin;
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

      let ScrambleText: GsapScrambleText | undefined;
      if (flags.scrambleText) {
        const { default: ScrambleTextPlugin } = await import('gsap/ScrambleTextPlugin');
        gsap.registerPlugin(ScrambleTextPlugin);
        ScrambleText = ScrambleTextPlugin;
      }

      if (destroyed) {
        return;
      }

      ctx = create(gsap, { ScrollTrigger, SplitText, DrawSVG, ScrambleText });
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
