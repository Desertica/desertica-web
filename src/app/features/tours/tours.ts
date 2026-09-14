import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import { SmoothScroll } from '../../core/animation/smooth-scroll';
import { TOURS_BANNER_IMAGE, TOURS_CLOSER_IMAGE, tourDestinations, tourPath } from '../../core/catalog/tours';
import { I18nService } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { TourCard } from '../../core/layout/tour-card';

@Component({
  selector: 'app-tours',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage, RouterLink, HlmButton, TranslatePipe, TourCard],
  templateUrl: './tours.html',
  styleUrl: './tours.css',
})
export class Tours {
  private readonly route = inject(ActivatedRoute);
  private readonly smooth = inject(SmoothScroll);
  private readonly fragment = toSignal(this.route.fragment, {
    initialValue: this.route.snapshot.fragment,
  });

  protected readonly i18n = inject(I18nService);
  protected readonly destinations = tourDestinations;
  protected readonly bannerImage = TOURS_BANNER_IMAGE;
  protected readonly closerImage = TOURS_CLOSER_IMAGE;
  protected readonly detailPath = tourPath;

  constructor() {
    effect(() => {
      const id = this.fragment();
      untracked(() => this.smooth.scrollToFragmentWhenReady(id));
    });
  }
}
