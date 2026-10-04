import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CatalogService } from '../../core/catalog/catalog';
import { ContentBody } from '../../core/cms/content-body';
import { I18nService } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { usePageMeta } from '../../core/seo/page-meta';

@Component({
  selector: 'app-product-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage, RouterLink, TranslatePipe, ContentBody],
  template: `
    @if (product(); as data) {
      <article class="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <a
          class="text-muted-foreground text-sm underline underline-offset-4"
          routerLink="/products"
          >{{ 'products.back' | translate: i18n.locale() }}</a
        >
        <div class="mt-8 grid gap-8 md:grid-cols-2">
          <div class="flex flex-col gap-3">
            @for (src of data.images; track src) {
              <div class="relative aspect-square w-full overflow-hidden">
                <img
                  [ngSrc]="src"
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  alt=""
                  class="rounded-none object-cover"
                />
              </div>
            }
          </div>
          <div>
            <h1 class="font-heading text-4xl">{{ data.title }}</h1>
            @if (data.price !== undefined) {
              <p class="mt-3 text-xl">
                {{ 'gallery.currency' | translate: i18n.locale() }} {{ data.price }}
              </p>
            }
            @if (data.description) {
              <p class="text-muted-foreground mt-4">{{ data.description }}</p>
            }
            <app-content-body class="mt-6" [markdown]="data.details" />
            <a class="mt-8 inline-block underline underline-offset-4" routerLink="/contact">{{
              'pages.contactTitle' | translate: i18n.locale()
            }}</a>
          </div>
        </div>
      </article>
    }
  `,
})
export class ProductDetail {
  private readonly catalog = inject(CatalogService);
  private readonly router = inject(Router);
  protected readonly i18n = inject(I18nService);

  readonly slug = input.required<string>();

  protected readonly product = computed(() => {
    const product = this.catalog.product(this.slug());
    const fields = product ? this.catalog.localized(product.i18n, this.i18n.locale()) : undefined;
    if (!product || !fields) {
      return undefined;
    }

    const images = [product.image, ...product.gallery].filter((src): src is string => !!src);
    return { price: product.price, images, ...fields };
  });

  constructor() {
    effect(() => {
      const missing = !this.product();
      untracked(() => {
        if (missing) {
          void this.router.navigateByUrl('/products');
        }
      });
    });

    usePageMeta(() => {
      const product = this.product();
      return product ? { title: product.title, description: product.description } : null;
    });
  }
}
