import { DestroyRef, effect, inject } from '@angular/core';
import { type PageSeo, SeoService } from './seo';

export type PageMetaValue = PageSeo | null | undefined;

/**
 * Describes the current page to `SeoService` and clears it when the page is destroyed. Returning
 * `null` (content still loading, unknown slug) leaves the site defaults in place.
 */
export function usePageMeta(source: () => PageMetaValue): void {
  const seo = inject(SeoService);
  const owner = {};

  effect(() => {
    const value = source();
    if (value) {
      seo.setPage(owner, value);
    } else {
      seo.clearPage(owner);
    }
  });

  inject(DestroyRef).onDestroy(() => seo.clearPage(owner));
}
