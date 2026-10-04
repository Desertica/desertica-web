import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CatalogService } from '../../core/catalog/catalog';
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
  private readonly catalog = inject(CatalogService);

  protected readonly i18n = inject(I18nService);
  protected readonly image = this.catalog.mediaImage('products.hero', TOURS_BANNER_IMAGE);
  protected readonly toursPath = TOURS_PATH;
  /** Published Strapi products in the current language; empty shows the coming soon screen. */
  protected readonly products = computed(() =>
    this.catalog.products().flatMap((product) => {
      const fields = this.catalog.localized(product.i18n, this.i18n.locale());
      return fields
        ? [{ slug: product.slug, image: product.image, price: product.price, ...fields }]
        : [];
    }),
  );
}
