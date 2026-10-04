import { NgOptimizedImage } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { SmoothScroll } from '../../core/animation/smooth-scroll';
import { resolvedTour } from '../../core/catalog/tour-pages';
import { DestinationId, tourDestinations } from '../../core/catalog/tours';
import { I18nService } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { TourBook } from '../tours/detail/tour-book';

@Component({
  selector: 'app-reservations',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage, TranslatePipe, TourBook],
  templateUrl: './reservations.html',
})
export class Reservations {
  private readonly router = inject(Router);
  private readonly smooth = inject(SmoothScroll);
  private readonly injector = inject(Injector);
  private readonly bookHost = viewChild<ElementRef<HTMLElement>>('bookHost');

  readonly eje = input<string | undefined>();
  readonly tour = input<string | undefined>();

  protected readonly i18n = inject(I18nService);
  protected readonly destinations = tourDestinations;
  protected readonly axis = computed(() => asDestination(this.eje()));
  protected readonly destination = computed(() => {
    const axis = this.axis();
    return axis ? tourDestinations.find((item) => item.id === axis) ?? null : null;
  });
  protected readonly selected = computed(() => {
    const axis = this.axis();
    const tourId = this.tour();
    if (!axis || !tourId) {
      return null;
    }

    const resolved = resolvedTour(tourId);
    if (!resolved || resolved.tour.destination !== axis) {
      return null;
    }

    return resolved;
  });

  constructor() {
    effect(() => {
      const tourId = this.selected()?.tour.id ?? null;
      afterNextRender(
        () => {
          const host = this.bookHost()?.nativeElement;
          if (!tourId || !host?.isConnected) {
            return;
          }

          host.focus({ preventScroll: true });
          void this.smooth.whenReady().then(() => {
            requestAnimationFrame(() => {
              if (host.isConnected) {
                this.smooth.scrollToElement(host);
              }
            });
          });
        },
        { injector: this.injector },
      );
    });
  }

  protected chooseAxis(id: DestinationId): void {
    void this.router.navigate(['/reservations'], {
      queryParams: { eje: id, tour: null },
      queryParamsHandling: 'merge',
    });
  }

  protected chooseTour(id: string): void {
    const eje = this.axis();
    if (!eje) {
      return;
    }

    void this.router.navigate(['/reservations'], {
      queryParams: { eje, tour: id },
      queryParamsHandling: 'merge',
    });
  }
}

function asDestination(value: string | null | undefined): DestinationId | null {
  if (value === 'huacachina' || value === 'paracas' || value === 'nazca') {
    return value;
  }

  return null;
}
