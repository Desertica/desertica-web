import { Directive, ElementRef, inject } from '@angular/core';
import { afterNextGsapUi } from './gsap-ui';

let destHoverLayer = 20;

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
      const isDest = element.classList.contains('dest-card');
      return gsap.context(() => {
        gsap.set(element, { scale: 1, y: 0, force3D: true });
        this.timeline = gsap
          .timeline({
            paused: true,
            onReverseComplete: () => {
              if (isDest) {
                element.style.zIndex = '';
              }
            },
          })
          .to(element, {
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
    const element = this.host.nativeElement;
    if (element.classList.contains('dest-card')) {
      destHoverLayer += 1;
      element.style.zIndex = String(destHoverLayer);
    }
    this.timeline?.play();
  }

  protected reverse(): void {
    this.timeline?.reverse();
  }
}
