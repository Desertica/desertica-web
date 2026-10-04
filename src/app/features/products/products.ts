import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CatalogService } from '../../core/catalog/catalog';
import { I18nService } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { usePageMeta } from '../../core/seo/page-meta';

@Component({
  selector: 'app-products',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage, RouterLink, TranslatePipe],
  template: `
    <section class="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h1 class="font-heading text-4xl">{{ title() }}</h1>
      <p class="text-muted-foreground mt-4 max-w-2xl">{{ lead() }}</p>

      @if (products().length) {
        <div class="mt-10 grid gap-x-3 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
          @for (product of products(); track product.slug) {
            <a class="group block" [routerLink]="['/products', product.slug]">
              @if (product.image) {
                <div class="relative aspect-square w-full overflow-hidden">
                  <img
                    [ngSrc]="product.image"
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                    alt=""
                    class="rounded-none object-cover"
                  />
                </div>
              }
              <h2 class="font-heading mt-4 text-xl group-hover:underline">{{ product.title }}</h2>
              @if (product.description) {
                <p class="text-muted-foreground mt-1">{{ product.description }}</p>
              }
              @if (product.price !== undefined) {
                <p class="mt-2">
                  {{ 'gallery.currency' | translate: i18n.locale() }} {{ product.price }}
                </p>
              }
            </a>
          }
        </div>
      } @else {
        <p class="text-muted-foreground mt-10">{{ 'products.empty' | translate: i18n.locale() }}</p>
      }
    </section>
  `,
})
export class Products {
  private readonly catalog = inject(CatalogService);
  protected readonly i18n = inject(I18nService);

  private readonly cms = computed(() => {
    const page = this.catalog.page('products');
    return page ? this.catalog.localized(page.i18n, this.i18n.locale()) : undefined;
  });
  protected readonly title = computed(() => this.cms()?.title || this.i18n.t('nav.products'));
  protected readonly lead = computed(() => this.cms()?.lead || this.i18n.t('pages.productsLead'));
  protected readonly products = computed(() =>
    this.catalog.products().flatMap((product) => {
      const fields = this.catalog.localized(product.i18n, this.i18n.locale());
      return fields
        ? [{ slug: product.slug, image: product.image, price: product.price, ...fields }]
        : [];
    }),
  );

  constructor() {
    usePageMeta(() => ({
      title: this.cms()?.seoTitle || this.title(),
      description: this.cms()?.seoDescription || this.lead(),
    }));
  }
}
