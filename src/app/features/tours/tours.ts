import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmSeparator } from '@spartan-ng/helm/separator';
import { SmoothScroll } from '../../core/animation/smooth-scroll';
import { tourDestinations } from '../../core/catalog/tours';
import { I18nService } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate-pipe';

@Component({
  selector: 'app-tours',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage, TranslatePipe, HlmCardImports, HlmSeparator],
  templateUrl: './tours.html',
})
export class Tours {
  private readonly route = inject(ActivatedRoute);
  private readonly smooth = inject(SmoothScroll);
  private readonly fragment = toSignal(this.route.fragment, {
    initialValue: this.route.snapshot.fragment,
  });

  protected readonly i18n = inject(I18nService);
  protected readonly destinations = tourDestinations;

  constructor() {
    effect(() => {
      const id = this.fragment();
      untracked(() => this.smooth.scrollToFragmentWhenReady(id));
    });
  }
}
