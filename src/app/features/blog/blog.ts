import { DatePipe, NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CatalogService } from '../../core/catalog/catalog';
import { I18nService } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { usePageMeta } from '../../core/seo/page-meta';

@Component({
  selector: 'app-blog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, NgOptimizedImage, RouterLink, TranslatePipe],
  template: `
    <section class="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h1 class="font-heading text-4xl">{{ title() }}</h1>
      <p class="text-muted-foreground mt-4 max-w-2xl">{{ lead() }}</p>

      @if (posts().length) {
        <div class="mt-10 grid gap-x-3 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
          @for (post of posts(); track post.slug) {
            <a class="group block" [routerLink]="['/blog', post.slug]">
              @if (post.cover) {
                <div class="relative aspect-[4/3] w-full overflow-hidden">
                  <img
                    [ngSrc]="post.cover"
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                    alt=""
                    class="rounded-none object-cover"
                  />
                </div>
              }
              @if (post.publishedDate) {
                <p class="text-muted-foreground mt-4 text-xs tracking-[0.22em] uppercase">
                  {{ post.publishedDate | date: 'mediumDate' : undefined : i18n.locale() }}
                </p>
              }
              <h2 class="font-heading mt-2 text-xl group-hover:underline">{{ post.title }}</h2>
              @if (post.excerpt) {
                <p class="text-muted-foreground mt-2">{{ post.excerpt }}</p>
              }
            </a>
          }
        </div>
      } @else {
        <p class="text-muted-foreground mt-10">{{ 'blog.empty' | translate: i18n.locale() }}</p>
      }
    </section>
  `,
})
export class Blog {
  private readonly catalog = inject(CatalogService);
  protected readonly i18n = inject(I18nService);

  private readonly cms = computed(() => {
    const page = this.catalog.page('blog');
    return page ? this.catalog.localized(page.i18n, this.i18n.locale()) : undefined;
  });
  protected readonly title = computed(() => this.cms()?.title || this.i18n.t('nav.blog'));
  protected readonly lead = computed(() => this.cms()?.lead || this.i18n.t('pages.blogLead'));
  protected readonly posts = computed(() =>
    this.catalog.posts().flatMap((post) => {
      const fields = this.catalog.localized(post.i18n, this.i18n.locale());
      return fields
        ? [{ slug: post.slug, cover: post.cover, publishedDate: post.publishedDate, ...fields }]
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
