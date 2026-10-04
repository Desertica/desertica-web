import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BLOG_CONTENT, blogPostPath } from '../../core/catalog/blog';
import { TOURS_PATH } from '../../core/catalog/tours';
import { I18nService } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate-pipe';

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
  protected readonly heroImage = this.content.hero.url;
  protected readonly posts = this.content.posts;
  protected readonly hasPosts = this.posts.length > 0;
  protected readonly toursPath = TOURS_PATH;
  protected readonly postPath = blogPostPath;

  protected formatPublishedAt(iso: string): string {
    return new Intl.DateTimeFormat(this.i18n.locale(), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(iso));
  }
}
