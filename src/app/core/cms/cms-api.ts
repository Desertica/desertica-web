import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { LOCALES, type AppLocale } from '../i18n/catalogs';
import { CMS_CONFIG } from './cms-config';
import {
  mapCms,
  type CmsRaw,
  type MapOptions,
  type RawByLocale,
  type RawEntry,
} from './cms-mapper';
import type { CmsSnapshot } from './cms-models';

const PAGE_SIZE = 100;
const MAX_PAGES = 20;

type Cached = { key: string; at: number; snapshot: CmsSnapshot };

let cached: Cached | null = null;
let inflight: { key: string; promise: Promise<CmsSnapshot | null> } | null = null;

/** Drops the shared server-side cache (tests). */
export function resetCmsCache(): void {
  cached = null;
  inflight = null;
}

/**
 * Reads published content from Strapi. Runs on the server only (SSR and prerender); the browser
 * receives the mapped snapshot through TransferState. Results are cached across requests for
 * `cacheTtlMs`, and the last good snapshot is served if Strapi becomes unreachable.
 */
@Injectable({ providedIn: 'root' })
export class CmsApi {
  private readonly http = inject(HttpClient);
  private readonly config = inject(CMS_CONFIG);

  get enabled(): boolean {
    return !!this.config.url;
  }

  get publicUrl(): string | null {
    return this.config.publicUrl ?? this.config.url;
  }

  async load(options: MapOptions): Promise<CmsSnapshot | null> {
    const base = this.config.url;
    if (!base) {
      return null;
    }

    if (cached?.key === base && Date.now() - cached.at < this.config.cacheTtlMs) {
      return cached.snapshot;
    }

    if (inflight?.key === base) {
      return inflight.promise;
    }

    const promise = this.fetchSnapshot(base, options)
      .then((snapshot) => {
        if (snapshot) {
          cached = { key: base, at: Date.now(), snapshot };
          return snapshot;
        }

        return cached?.key === base ? cached.snapshot : null;
      })
      .finally(() => {
        inflight = null;
      });
    inflight = { key: base, promise };
    return promise;
  }

  private async fetchSnapshot(base: string, options: MapOptions): Promise<CmsSnapshot | null> {
    const [destinations, tours, translations, mediaSlots, pages, posts, products, site] =
      await Promise.all([
        this.collection(base, 'destinations', { sort: 'order:asc' }),
        this.collection(base, 'tours', { sort: 'order:asc' }),
        this.collection(base, 'translations', { sort: 'key:asc' }),
        this.collection(base, 'media-slots'),
        this.collection(base, 'pages'),
        this.collection(base, 'blog-posts', { sort: 'publishedDate:desc' }),
        this.collection(base, 'products', { sort: 'order:asc' }),
        this.single(base, 'site-setting'),
      ]);

    const raw: CmsRaw = {
      destinations,
      tours,
      translations,
      mediaSlots,
      pages,
      posts,
      products,
      site,
    };
    const reachable = Object.values(raw).some((value) => value !== undefined);
    return reachable ? mapCms(raw, options) : null;
  }

  private async collection(
    base: string,
    path: string,
    extra: Record<string, string> = {},
  ): Promise<RawByLocale | undefined> {
    try {
      const entries = await Promise.all(
        LOCALES.map(
          async (locale) => [locale, await this.pages(base, path, locale, extra)] as const,
        ),
      );
      return Object.fromEntries(entries) as unknown as RawByLocale;
    } catch {
      return undefined;
    }
  }

  private async pages(
    base: string,
    path: string,
    locale: AppLocale,
    extra: Record<string, string>,
  ): Promise<RawEntry[]> {
    const result: RawEntry[] = [];
    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const body = await this.get<{
        data?: RawEntry[];
        meta?: { pagination?: { pageCount?: number } };
      }>(base, path, {
        ...extra,
        locale,
        populate: '*',
        'pagination[page]': String(page),
        'pagination[pageSize]': String(PAGE_SIZE),
      });
      result.push(...(body.data ?? []));
      if (page >= (body.meta?.pagination?.pageCount ?? 1)) {
        break;
      }
    }

    return result;
  }

  private async single(base: string, path: string): Promise<RawEntry | null | undefined> {
    try {
      const body = await this.get<{ data?: RawEntry | null }>(base, path, {});
      return body.data ?? null;
    } catch {
      return undefined;
    }
  }

  private get<T>(base: string, path: string, query: Record<string, string>): Promise<T> {
    const headers = this.config.token
      ? { Authorization: `Bearer ${this.config.token}` }
      : undefined;
    return firstValueFrom(
      this.http
        .get<T>(`${base}/api/${path}`, { params: new HttpParams({ fromObject: query }), headers })
        .pipe(timeout({ first: this.config.timeoutMs })),
    );
  }
}
