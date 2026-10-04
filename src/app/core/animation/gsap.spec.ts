import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterNextGsap, type GsapPluginFlags } from './gsap';
import { settleMotion } from '../../testing/settle-motion';
import { stubMatchMedia } from '../../testing/match-media';

@Component({
  selector: 'app-gsap-flags',
  template: '',
})
class GsapFlagsHost {
  loaded = false;
  reverted = false;

  constructor() {
    afterNextGsap(
      (_gsap, plugins) => {
        this.loaded =
          plugins.DrawSVG !== undefined &&
          plugins.SplitText !== undefined &&
          plugins.ScrambleText !== undefined;
        return {
          revert: () => {
            this.reverted = true;
          },
        };
      },
      {
        morphSvg: false,
        drawSvg: true,
        splitText: true,
        scrambleText: true,
        scrollSmoother: true,
      } satisfies GsapPluginFlags,
    );
  }
}

@Component({
  selector: 'app-gsap-cancel',
  template: '',
})
class GsapCancelHost {
  created = false;

  constructor() {
    afterNextGsap(() => {
      this.created = true;
      return { revert: () => undefined };
    });
  }
}

describe('afterNextGsap', () => {
  beforeEach(() => {
    stubMatchMedia(() => false);
  });
  it('registers optional plugins and reverts on destroy', async () => {
    await TestBed.configureTestingModule({ imports: [GsapFlagsHost] }).compileComponents();
    const fixture = TestBed.createComponent(GsapFlagsHost);
    await fixture.whenStable();
    await settleMotion();

    expect(fixture.componentInstance.loaded).toBe(true);

    fixture.destroy();

    expect(fixture.componentInstance.reverted).toBe(true);
  });

  it('skips creating a context when the view is already destroyed', async () => {
    await TestBed.configureTestingModule({ imports: [GsapCancelHost] }).compileComponents();
    const fixture = TestBed.createComponent(GsapCancelHost);
    fixture.destroy();
    await settleMotion();

    expect(fixture.componentInstance.created).toBe(false);
  });
});
