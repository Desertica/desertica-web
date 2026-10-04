import {
  INTRO_OLIVE,
  INTRO_REST_SCALE,
  INTRO_WHITE,
  appendWordmarkDraw,
  paintWordmarkRest,
  prepareWordmarkDraw,
  queryWordmark,
} from './wordmark-intro';

type Chain = {
  fromTo: ReturnType<typeof vi.fn>;
  to: ReturnType<typeof vi.fn>;
};

function chain(): Chain {
  const timeline: Chain = {
    fromTo: vi.fn(() => timeline),
    to: vi.fn(() => timeline),
  };
  return timeline;
}

function svg(): SVGElement {
  const root = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  root.innerHTML =
    '<path id="bird" class="draw mark"></path><path id="dune-1" class="draw mark"></path><path id="dune-2" class="draw mark"></path><path class="draw letter"></path><path class="draw counter"></path>';
  return root;
}

describe('wordmark intro', () => {
  it('queries marks, letters, counters, and named shapes', () => {
    const parts = queryWordmark(svg());

    expect(parts.marks).toHaveLength(3);
    expect(parts.letters).toHaveLength(1);
    expect(parts.counters).toHaveLength(1);
    expect(parts.draws).toHaveLength(5);
    expect(parts.bird).not.toBeNull();
    expect(parts.dune1).not.toBeNull();
    expect(parts.dune2).not.toBeNull();
  });

  it('paints the resting wordmark and optional chrome', () => {
    const gsap = { set: vi.fn() };
    const stage = document.createElement('div');
    const copy = document.createElement('div');
    const header = document.createElement('header');
    const fab = document.createElement('a');
    const parts = queryWordmark(svg());

    paintWordmarkRest(gsap as never, parts);
    paintWordmarkRest(gsap as never, parts, { stage, copy, header, fab });

    expect(gsap.set).toHaveBeenCalledWith([parts.marks, parts.letters], {
      drawSVG: '100%',
      fill: 'currentColor',
      stroke: 'currentColor',
    });
    expect(gsap.set).toHaveBeenCalledWith(parts.counters, {
      drawSVG: '100%',
      fill: INTRO_OLIVE,
      stroke: INTRO_OLIVE,
    });
    expect(gsap.set).toHaveBeenCalledWith(stage, { opacity: 1, scale: INTRO_REST_SCALE });
    expect(gsap.set).toHaveBeenCalledWith(copy, { autoAlpha: 1, y: 0 });
    expect(gsap.set).toHaveBeenCalledWith(header, { autoAlpha: 1 });
    expect(gsap.set).toHaveBeenCalledWith(fab, { autoAlpha: 1 });
  });

  it('prepares a hidden draw and skips missing chrome', () => {
    const gsap = { set: vi.fn() };
    const parts = queryWordmark(svg());

    prepareWordmarkDraw(gsap as never, parts);

    expect(gsap.set).toHaveBeenCalledWith(parts.draws, {
      drawSVG: 0,
      fill: 'transparent',
      stroke: INTRO_WHITE,
    });
    expect(gsap.set).toHaveBeenCalledTimes(1);
  });

  it('draws the bird and dunes when they exist', () => {
    const timeline = chain();
    const parts = queryWordmark(svg());

    appendWordmarkDraw(timeline as never, parts);

    expect(timeline.fromTo).toHaveBeenCalledWith(
      parts.bird,
      { drawSVG: 0 },
      { drawSVG: '100%', duration: 2.4 },
    );
    expect(timeline.fromTo).toHaveBeenCalledWith(
      parts.dune2,
      { drawSVG: 0 },
      { drawSVG: '100%', duration: 1.15 },
      '-=0.55',
    );
    expect(timeline.to).toHaveBeenCalledWith(
      parts.marks,
      { fill: INTRO_WHITE, duration: 0.65, ease: 'power1.out' },
      '-=0.2',
    );
  });

  it('skips shapes that are missing from the svg', () => {
    const timeline = chain();
    const root = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const parts = queryWordmark(root);

    appendWordmarkDraw(timeline as never, parts);

    expect(timeline.fromTo).not.toHaveBeenCalledWith(
      null,
      expect.anything(),
      expect.anything(),
    );
    expect(timeline.to).toHaveBeenCalled();
  });
});
