import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SmoothScroll } from '../../core/animation/smooth-scroll';
import { CatalogService } from '../../core/catalog/catalog';
import { TOURS_BANNER_IMAGE, TOURS_CLOSER_IMAGE, tourPath } from '../../core/catalog/tours';
import { I18nService } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { PhotoCta } from '../../core/layout/photo-cta';
import { TourCard } from '../../core/layout/tour-card';

@Component({
  selector: 'app-tours',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage, RouterLink, TranslatePipe, PhotoCta, TourCard],
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
  private readonly catalog = inject(CatalogService);
  protected readonly destinations = this.catalog.destinations;
  protected readonly bannerImage = this.catalog.mediaImage('tours.banner', TOURS_BANNER_IMAGE);
  protected readonly closerImage = this.catalog.mediaImage('tours.closer', TOURS_CLOSER_IMAGE);
  protected readonly detailPath = tourPath;

  constructor() {
    effect(() => {
      const id = this.fragment();
      untracked(() => this.smooth.scrollToFragmentWhenReady(id));
    });
  }
}
