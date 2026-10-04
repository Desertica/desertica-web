import { InjectionToken } from '@angular/core';

export const BLOG_PATH = '/blog';

/** Local hero until Strapi supplies page media. */
export const BLOG_HERO_IMAGE = '/about/sand-poster.jpg';

export type BlogCover = {
  url: string;
  alt: string;
};

/** Post shape Strapi will populate later. */
export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  /** ISO-8601 date string. */
  publishedAt: string;
  category?: string;
  cover: BlogCover;
};

/** Optional page/header fields Strapi can own later. */
export type BlogPageHeader = {
  eyebrow?: string;
  title: string;
  lead: string;
  hero: BlogCover;
};

export type BlogIndexData = {
  hero: BlogCover;
  posts: readonly BlogPost[];
};

/**
 * Stub blog index. Strapi will replace this content source when the CMS is wired.
 * Do not hardcode CMS URLs or secrets here.
 */
export function createBlogIndexStub(): BlogIndexData {
  return {
    hero: {
      url: BLOG_HERO_IMAGE,
      alt: '',
    },
    posts: [],
  };
}

export const BLOG_CONTENT = new InjectionToken<BlogIndexData>('BLOG_CONTENT', {
  providedIn: 'root',
  factory: createBlogIndexStub,
});

export function blogPostPath(slug: string): string {
  return `${BLOG_PATH}/${slug}`;
}
