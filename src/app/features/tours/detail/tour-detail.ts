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
import { resolvedTour } from '../../../core/catalog/tour-pages';
import { TOURS_PATH } from '../../../core/catalog/tours';
import { I18nService } from '../../../core/i18n/i18n';
import { TranslatePipe } from '../../../core/i18n/translate-pipe';
import { TourBook } from './tour-book';
import { TourFeatures } from './tour-features';
import { TourGallery } from './tour-gallery';
import { TourHeading } from './tour-heading';
import { TourNotes } from './tour-notes';
import { TourPortraits } from './tour-portraits';
import { TourTimeline } from './tour-timeline';

@Component({
  selector: 'app-tour-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslatePipe,
    TourGallery,
    TourHeading,
    TourFeatures,
    TourBook,
    TourTimeline,
    TourNotes,
    TourPortraits,
  ],
  templateUrl: './tour-detail.html',
})
export class TourDetail {
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly destroyRef = inject(DestroyRef);

  readonly id = input.required<string>();
  protected readonly i18n = inject(I18nService);
  protected readonly resolved = computed(() => resolvedTour(this.id()));

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => {
        if (!resolvedTour(id)) {
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

      const name = this.i18n.t(data.tour.titleKey);
      this.title.setTitle(`${name} | ${this.i18n.t('meta.title')}`);
      this.meta.updateTag({
        name: 'description',
        content: this.i18n.t(data.page.leadKey),
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
