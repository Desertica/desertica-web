import { NgOptimizedImage } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AnalyticsService } from '../../core/analytics/analytics';
import { tourItem } from '../../core/analytics/items';
import { SmoothScroll } from '../../core/animation/smooth-scroll';
import { CatalogService } from '../../core/catalog/catalog';
import type { CatalogTour } from '../../core/catalog/tours';
import { TOURS_BANNER_IMAGE, TOURS_CLOSER_IMAGE, tourPath } from '../../core/catalog/tours';
import { I18nService } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { PhotoCta } from '../../core/layout/photo-cta';
import { TourCard } from '../../core/layout/tour-card';

const LIST_NAME = 'tours';

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
  private readonly analytics = inject(AnalyticsService);

  constructor() {
    afterNextRender(() => {
      this.analytics.track('view_item_list', {
        item_list_name: LIST_NAME,
        items: this.catalog.tours().map((tour) => this.item(tour)),
      });
    });

    effect(() => {
      const id = this.fragment();
      untracked(() => this.smooth.scrollToFragmentWhenReady(id));
    });
  }

  protected select(tour: CatalogTour): void {
    this.analytics.track('select_item', { item_list_name: LIST_NAME, items: [this.item(tour)] });
  }

  private item(tour: CatalogTour) {
    return tourItem(tour, this.i18n.t(tour.titleKey));
  }
}
