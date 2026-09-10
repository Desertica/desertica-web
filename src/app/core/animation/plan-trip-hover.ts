import { Directive, ElementRef, inject } from '@angular/core';
import { afterNextGsapUi } from './gsap-ui';

@Directive({
  selector: '[appPlanTripHover]',
  host: {
    '(pointerenter)': 'play()',
    '(pointerleave)': 'reverse()',
  },
})
export class PlanTripHover {
  private readonly host = inject(ElementRef<HTMLElement>);
  private timeline: { play: () => void; reverse: () => void } | undefined;

  constructor() {
    afterNextGsapUi((gsap) => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
      }

      const element = this.host.nativeElement;
      return gsap.context(() => {
        this.timeline = gsap.timeline({ paused: true }).to(element, {
          scale: 1.04,
          y: -4,
          duration: 0.45,
          ease: 'expo.out',
          easeReverse: 'power2.out',
        });
      }, element);
    });
  }

  protected play(): void {
    this.timeline?.play();
  }

  protected reverse(): void {
    this.timeline?.reverse();
  }
}
