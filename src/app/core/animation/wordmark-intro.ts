type GsapCore = typeof import('gsap').default;
type GsapTimeline = ReturnType<GsapCore['timeline']>;

export const INTRO_OLIVE = '#5a6b3e';
export const INTRO_WHITE = '#ffffff';
export const INTRO_REST_SCALE = 0.85;
export const INTRO_FAILSAFE_MS = 12_000;

export type WordmarkStyle = { accent: string; restScale: number };

export const DEFAULT_WORDMARK_STYLE: WordmarkStyle = {
  accent: INTRO_OLIVE,
  restScale: INTRO_REST_SCALE,
};

export type WordmarkParts = {
  marks: NodeListOf<Element>;
  letters: NodeListOf<Element>;
  counters: NodeListOf<Element>;
  draws: NodeListOf<Element>;
  bird: Element | null;
  dune1: Element | null;
  dune2: Element | null;
};

export function queryWordmark(wordmark: SVGElement): WordmarkParts {
  return {
    marks: wordmark.querySelectorAll('#bird, #dune-1, #dune-2'),
    letters: wordmark.querySelectorAll('.letter, .accent'),
    counters: wordmark.querySelectorAll('.counter'),
    draws: wordmark.querySelectorAll('.draw'),
    bird: wordmark.querySelector('#bird'),
    dune1: wordmark.querySelector('#dune-1'),
    dune2: wordmark.querySelector('#dune-2'),
  };
}

export function paintWordmarkRest(
  gsap: GsapCore,
  parts: WordmarkParts,
  extras: {
    stage?: HTMLElement;
    copy?: HTMLElement;
    header?: Element | null;
    fab?: Element | null;
  } = {},
  style: WordmarkStyle = DEFAULT_WORDMARK_STYLE,
): void {
  gsap.set([parts.marks, parts.letters], {
    drawSVG: '100%',
    fill: 'currentColor',
    stroke: 'currentColor',
  });
  gsap.set(parts.counters, { drawSVG: '100%', fill: style.accent, stroke: style.accent });
  if (extras.stage) {
    gsap.set(extras.stage, { opacity: 1, scale: style.restScale });
  }
  if (extras.copy) {
    gsap.set(extras.copy, { autoAlpha: 1, y: 0 });
  }
  if (extras.header) {
    gsap.set(extras.header, { autoAlpha: 1 });
  }
  if (extras.fab) {
    gsap.set(extras.fab, { autoAlpha: 1 });
  }
}

export function prepareWordmarkDraw(
  gsap: GsapCore,
  parts: WordmarkParts,
  extras: {
    stage?: HTMLElement;
    copy?: HTMLElement;
    header?: Element | null;
    fab?: Element | null;
  } = {},
): void {
  gsap.set(parts.draws, { drawSVG: 0, fill: 'transparent', stroke: INTRO_WHITE });
  if (extras.stage) {
    gsap.set(extras.stage, { autoAlpha: 1, scale: 1 });
  }
  if (extras.copy) {
    gsap.set(extras.copy, { autoAlpha: 0, y: 16 });
  }
  if (extras.header) {
    gsap.set(extras.header, { autoAlpha: 0 });
  }
  if (extras.fab) {
    gsap.set(extras.fab, { autoAlpha: 0 });
  }
}

export function appendWordmarkDraw(
  tl: GsapTimeline,
  parts: WordmarkParts,
  style: WordmarkStyle = DEFAULT_WORDMARK_STYLE,
): void {
  if (parts.bird) {
    tl.fromTo(parts.bird, { drawSVG: 0 }, { drawSVG: '100%', duration: 2.4 });
  }
  if (parts.dune2) {
    tl.fromTo(parts.dune2, { drawSVG: 0 }, { drawSVG: '100%', duration: 1.15 }, '-=0.55');
  }
  if (parts.dune1) {
    tl.fromTo(parts.dune1, { drawSVG: 0 }, { drawSVG: '100%', duration: 1.25 }, '-=0.95');
  }

  tl.to(parts.marks, { fill: INTRO_WHITE, duration: 0.65, ease: 'power1.out' }, '-=0.2')
    .fromTo(parts.letters, { drawSVG: 0 }, { drawSVG: '100%', duration: 0.7, stagger: 0.08 }, '-=0.1')
    .fromTo(
      parts.counters,
      { drawSVG: 0 },
      { drawSVG: '100%', duration: 0.45, stagger: 0.12 },
      '-=0.55',
    )
    .to(parts.letters, { fill: INTRO_WHITE, duration: 0.4, stagger: 0.05, ease: 'power1.out' }, '-=0.35')
    .to(parts.counters, { fill: style.accent, stroke: style.accent, duration: 0.35, ease: 'none' }, '-=0.35');
}
