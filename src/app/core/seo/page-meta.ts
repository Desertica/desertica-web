import { DestroyRef, effect, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { I18nService } from '../i18n/i18n';

export type PageMetaValue = { title?: string; description?: string } | null | undefined;

/** Keeps `<title>` and the meta description in sync with a page and restores the defaults on exit. */
export function usePageMeta(source: () => PageMetaValue): void {
  const title = inject(Title);
  const meta = inject(Meta);
  const i18n = inject(I18nService);
  const destroyRef = inject(DestroyRef);

  effect(() => {
    const value = source();
    i18n.locale();
    if (!value) {
      return;
    }

    const site = i18n.t('meta.title');
    title.setTitle(value.title ? `${value.title} | ${site}` : site);
    meta.updateTag({
      name: 'description',
      content: value.description || i18n.t('meta.description'),
    });
  });

  destroyRef.onDestroy(() => {
    title.setTitle(i18n.t('meta.title'));
    meta.updateTag({ name: 'description', content: i18n.t('meta.description') });
  });
}
