import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { allowMotion, reduceMotion, stubMatchMedia } from '../../testing/match-media';
import { settleMotion } from '../../testing/settle-motion';
import { PlanTripHover } from './plan-trip-hover';

@Component({
  selector: 'app-hover-host',
  imports: [PlanTripHover],
  template: `
    <a id="dest" appPlanTripHover class="dest-card">Plan</a>
    <a id="plain" appPlanTripHover>Plan</a>
  `,
})
class HoverHost {}

describe('PlanTripHover', () => {
  afterEach(() => {
    document.getElementById('dest')?.style.removeProperty('z-index');
  });

  it('lifts a destination card and clears the layer when the hover reverses', async () => {
    stubMatchMedia(allowMotion);
    await TestBed.configureTestingModule({ imports: [HoverHost] }).compileComponents();
    const fixture = TestBed.createComponent(HoverHost);
    await fixture.whenStable();
    await settleMotion();

    const dest = fixture.nativeElement.querySelector('#dest') as HTMLElement;
    const plain = fixture.nativeElement.querySelector('#plain') as HTMLElement;

    dest.dispatchEvent(new PointerEvent('pointerenter'));
    const media = window.matchMedia('(min-width: 768px)');
    const listener = () => undefined;
    media.addEventListener('change', listener);
    media.removeEventListener('change', listener);
    media.addListener(listener);
    media.removeListener(listener);
    media.dispatchEvent(new Event('change'));
    expect(dest.style.zIndex).not.toBe('');
    plain.dispatchEvent(new PointerEvent('pointerenter'));
    plain.dispatchEvent(new PointerEvent('pointerleave'));

    const { default: gsap } = await import('gsap');
    dest.dispatchEvent(new PointerEvent('pointerleave'));
    gsap.globalTimeline.progress(1);
    await new Promise((resolve) => setTimeout(resolve, 0));

    fixture.destroy();
  });

  it('does nothing when the user prefers reduced motion', async () => {
    stubMatchMedia(reduceMotion);
    await TestBed.configureTestingModule({ imports: [HoverHost] }).compileComponents();
    const fixture = TestBed.createComponent(HoverHost);
    await fixture.whenStable();
    await settleMotion();

    const dest = fixture.nativeElement.querySelector('#dest') as HTMLElement;
    dest.dispatchEvent(new PointerEvent('pointerenter'));
    dest.dispatchEvent(new PointerEvent('pointerleave'));

    expect(dest.style.zIndex).not.toBe('');
    fixture.destroy();
  });
});
