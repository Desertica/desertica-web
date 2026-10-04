import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { CatalogService } from '../../../core/catalog/catalog';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideDownload } from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { tourHasDetails } from '../../../core/catalog/tour-pages';
import { TOURS_PATH } from '../../../core/catalog/tours';
import { I18nService } from '../../../core/i18n/i18n';
import { TranslatePipe } from '../../../core/i18n/translate-pipe';
import { TourAssurances } from './tour-assurances';
import { TourBook } from './tour-book';
import { TourFeatures } from './tour-features';
import { TourFullDetails } from './tour-full-details';
import { TourGallery } from './tour-gallery';
import { TourHeading } from './tour-heading';
import { TourTimeline } from './tour-timeline';
import { TourVideos } from './tour-videos';

@Component({
  selector: 'app-tour-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslatePipe,
    NgIcon,
    HlmButton,
    TourGallery,
    TourHeading,
    TourFeatures,
    TourAssurances,
    TourBook,
    TourTimeline,
    TourFullDetails,
    TourVideos,
  ],
  templateUrl: './tour-detail.html',
  providers: [provideIcons({ lucideDownload })],
})
export class TourDetail {
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly destroyRef = inject(DestroyRef);

  readonly id = input.required<string>();
  protected readonly i18n = inject(I18nService);
  private readonly catalog = inject(CatalogService);
  protected readonly resolved = computed(() => this.catalog.resolvedTour(this.id()));
  protected readonly hasDetails = tourHasDetails;

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => {
        if (!this.catalog.resolvedTour(id)) {
          void this.router.navigateByUrl(TOURS_PATH);
        }
      });
    });

    effect(() => {
      const data = this.resolved();
      this.i18n.locale();
      if (!data) {
        return;
      }

      const name = this.i18n.t(data.page.seoTitleKey ?? data.tour.titleKey);
      this.title.setTitle(`${name} | ${this.i18n.t('meta.title')}`);
      this.meta.updateTag({
        name: 'description',
        content: this.i18n.t(data.page.seoDescriptionKey ?? data.page.leadKey),
      });
    });

    this.destroyRef.onDestroy(() => {
      this.title.setTitle(this.i18n.t('meta.title'));
      this.meta.updateTag({
        name: 'description',
        content: this.i18n.t('meta.description'),
      });
    });
  }
}
