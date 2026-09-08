import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { afterNextGsap } from '../../core/animation/gsap';
import { ExperiencesService } from '../../core/services/experiences';

@Component({
  selector: 'app-landing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage, RouterLink, HlmButtonImports, HlmCardImports, HlmBadgeImports],
  templateUrl: './landing.html',
})
export class Landing {
  private readonly host = inject(ElementRef<HTMLElement>);
  protected readonly experiences = inject(ExperiencesService).list();

  constructor() {
    afterNextGsap((gsap) =>
      gsap.context(() => {
        gsap.from('.hero-copy > *', {
          y: 28,
          opacity: 0,
          duration: 0.9,
          stagger: 0.12,
          ease: 'power3.out',
        });

        gsap.from('.experience-card', {
          y: 36,
          opacity: 0,
          duration: 0.7,
          stagger: 0.1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: '#experiences',
            start: 'top 80%',
          },
        });
      }, this.host.nativeElement),
    );
  }
}
