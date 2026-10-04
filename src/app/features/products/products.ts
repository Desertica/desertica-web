import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TOURS_BANNER_IMAGE, TOURS_PATH } from '../../core/catalog/tours';
import { I18nService } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate-pipe';

@Component({
  selector: 'app-products',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage, RouterLink, TranslatePipe],
  templateUrl: './products.html',
  styleUrl: './products.css',
})
export class Products {
  protected readonly i18n = inject(I18nService);
  protected readonly image = TOURS_BANNER_IMAGE;
  protected readonly toursPath = TOURS_PATH;
}
