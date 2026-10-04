const svg = globalThis.SVGElement?.prototype as { getTotalLength?: () => number } | undefined;
if (svg && typeof svg.getTotalLength !== 'function') {
  svg.getTotalLength = () => 100;
}

export async function settleMotion(): Promise<void> {
  await Promise.all([
    import('gsap'),
    import('gsap/ScrollTrigger'),
    import('gsap/ScrollSmoother'),
    import('gsap/DrawSVGPlugin'),
    import('gsap/MorphSVGPlugin'),
    import('gsap/SplitText'),
    import('gsap/ScrambleTextPlugin'),
  ]);
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}
