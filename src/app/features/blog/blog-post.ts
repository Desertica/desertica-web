import { DatePipe, NgOptimizedImage } from '@angular/common';
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
  selector: 'app-blog-post',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, NgOptimizedImage, RouterLink, TranslatePipe, ContentBody],
  template: `
    @if (post(); as data) {
      <article class="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <a class="text-muted-foreground text-sm underline underline-offset-4" routerLink="/blog">{{
          'blog.back' | translate: i18n.locale()
        }}</a>
        @if (data.publishedDate) {
          <p class="text-muted-foreground mt-6 text-xs tracking-[0.22em] uppercase">
            {{ data.publishedDate | date: 'mediumDate' : undefined : i18n.locale() }}
          </p>
        }
        <h1 class="font-heading mt-2 text-4xl">{{ data.title }}</h1>
        @if (data.cover) {
          <div class="relative mt-8 aspect-[16/10] w-full overflow-hidden">
            <img
              [ngSrc]="data.cover"
              fill
              priority
              sizes="(min-width: 768px) 48rem, 100vw"
              alt=""
              class="rounded-none object-cover"
            />
          </div>
        }
        <app-content-body class="mt-8" [markdown]="data.content" />
      </article>
    }
  `,
})
export class BlogPostPage {
  private readonly catalog = inject(CatalogService);
  private readonly router = inject(Router);
  protected readonly i18n = inject(I18nService);

  readonly slug = input.required<string>();

  protected readonly post = computed(() => {
    const post = this.catalog.post(this.slug());
    const fields = post ? this.catalog.localized(post.i18n, this.i18n.locale()) : undefined;
    return post && fields
      ? { cover: post.cover, publishedDate: post.publishedDate, ...fields }
      : undefined;
  });

  constructor() {
    effect(() => {
      const missing = !this.post();
      untracked(() => {
        if (missing) {
          void this.router.navigateByUrl('/blog');
        }
      });
    });

    usePageMeta(() => {
      const post = this.post();
      return post ? { title: post.title, description: post.seoDescription || post.excerpt } : null;
    });
  }
}
