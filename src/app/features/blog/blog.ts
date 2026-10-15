import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BLOG_CONTENT, type BlogPost, blogPostPath } from '../../core/catalog/blog';
import { CatalogService } from '../../core/catalog/catalog';
import { TOURS_PATH } from '../../core/catalog/tours';
import { I18nService } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { usePageMeta } from '../../core/seo/page-meta';

@Component({
  selector: 'app-blog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage, RouterLink, TranslatePipe],
  templateUrl: './blog.html',
  styleUrl: './blog.css',
})
export class Blog {
  private readonly content = inject(BLOG_CONTENT);

  protected readonly i18n = inject(I18nService);
  private readonly catalog = inject(CatalogService);

  protected readonly heroImage = this.catalog.mediaImage('blog.hero', this.content.hero.url);
  /** Strapi posts when published, otherwise the injected static content. */
  protected readonly posts = computed<readonly BlogPost[]>(() => {
    const cms = this.catalog.posts().flatMap((post): BlogPost[] => {
      const fields = this.catalog.localized(post.i18n, this.i18n.locale());
      if (!fields) {
        return [];
      }

      return [
        {
          slug: post.slug,
          title: fields.title,
          excerpt: fields.excerpt,
          publishedAt: post.publishedDate,
          category: fields.category || undefined,
          cover: { url: post.cover ?? this.heroImage, alt: '' },
        },
      ];
    });
    return cms.length ? cms : this.content.posts;
  });
  protected readonly hasPosts = computed(() => this.posts().length > 0);
  protected readonly toursPath = TOURS_PATH;
  protected readonly postPath = blogPostPath;

  protected formatPublishedAt(iso: string): string {
    if (!iso) {
      return '';
    }

    return new Intl.DateTimeFormat(this.i18n.locale(), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(iso));
  }

  constructor() {
    usePageMeta(() => ({
      title: this.i18n.t('nav.blog'),
      description: this.i18n.t('pages.blogLead'),
      image: this.heroImage,
      breadcrumbs: [],
    }));
  }
}
