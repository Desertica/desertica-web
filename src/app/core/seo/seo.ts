import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  Injectable,
  PLATFORM_ID,
  REQUEST,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Meta, Title } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { CatalogService } from '../catalog/catalog';
import { PUBLIC_CONFIG } from '../config/public-config';
import { LOCALES } from '../i18n/catalogs';
import { I18nService } from '../i18n/i18n';
import { type JsonLd, breadcrumbLd, organizationLd, serializeLd } from './json-ld';
import {
  absoluteUrl,
  alternatesFor,
  isPlaceholder,
  localizedUrl,
  openGraphLocale,
  pathOf,
} from './seo-urls';

export type PageSeo = {
  title?: string;
  description?: string;
  /** Absolute or site-relative URL of the share image. Defaults to the CMS share image. */
  image?: string;
  type?: 'website' | 'article' | 'product';
  noindex?: boolean;
  /** Parents of the page, nearest the home page first; the page itself is added from `title`. */
  breadcrumbs?: readonly { name: string; path: string }[];
  jsonLd?: readonly JsonLd[];
};

const JSON_LD_ATTRIBUTE = 'data-seo-jsonld';
const ALTERNATE_ATTRIBUTE = 'data-seo-alternate';

/**
 * Owns every SEO tag in `<head>`: title, description, canonical, hreflang, Open Graph, Twitter,
 * robots and JSON-LD. Pages only describe themselves through `usePageMeta`; this service writes the
 * tags during server rendering and keeps them in sync when the language or the route changes.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly document = inject(DOCUMENT);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  private readonly catalog = inject(CatalogService);
  private readonly config = inject(PUBLIC_CONFIG);
  private readonly request = inject(REQUEST, { optional: true });
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly page = signal<{ owner: object; seo: PageSeo } | null>(null);
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  /** Public origin: `SITE_URL`, else the request (server) or the location (browser). */
  readonly origin = computed(() => this.resolveOrigin());

  constructor() {
    effect(() => this.write());
  }

  setPage(owner: object, seo: PageSeo): void {
    this.page.set({ owner, seo });
  }

  clearPage(owner: object): void {
    if (this.page()?.owner === owner) {
      this.page.set(null);
    }
  }

  private write(): void {
    const seo = this.page()?.seo ?? {};
    const locale = this.i18n.locale();
    const site = this.i18n.t('meta.title');
    const settings = this.catalog.site();
    const origin = this.origin();
    const path = pathOf(this.url());
    const title = seo.title ? `${seo.title} | ${site}` : site;
    const description = seo.description || this.i18n.t('meta.description');
    const image = seo.image || settings.shareImage;
    const canonical = origin ? localizedUrl(origin, path, locale) : '';

    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({
      name: 'robots',
      content: seo.noindex ? 'noindex, nofollow' : 'index, follow',
    });

    this.meta.updateTag({ property: 'og:type', content: seo.type ?? 'website' });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:locale', content: openGraphLocale(locale) });
    this.setMeta('property', 'og:site_name', settings.brandName);
    this.setMeta('property', 'og:url', canonical);
    this.setMeta('property', 'og:image', image ? absoluteUrl(origin, image) : '');
    for (const other of LOCALES.filter((item) => item !== locale)) {
      this.meta.updateTag(
        { property: 'og:locale:alternate', content: openGraphLocale(other) },
        `property="og:locale:alternate"`,
      );
    }

    this.meta.updateTag({
      name: 'twitter:card',
      content: image ? 'summary_large_image' : 'summary',
    });
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.setMeta('name', 'twitter:image', image ? absoluteUrl(origin, image) : '');

    this.writeLink('canonical', canonical);
    this.writeAlternates(origin, path);
    this.writeJsonLd(this.structuredData(seo, { origin, path, locale, title: seo.title }));
  }

  private structuredData(
    seo: PageSeo,
    context: { origin: string; path: string; locale: 'en' | 'es'; title?: string },
  ): JsonLd[] {
    const { origin } = context;
    if (!origin) {
      return [];
    }

    const site = this.catalog.site();
    const logo = absoluteUrl(origin, '/brand/mark-on-olive.svg');
    const contact = this.catalog.contact();
    const documents: JsonLd[] = [
      organizationLd({
        name: site.brandName,
        url: origin,
        logo,
        legalName: isPlaceholder(site.legalName) ? undefined : site.legalName,
        email: isPlaceholder(site.email) ? undefined : contact.email,
        phone: isPlaceholder(site.phone) ? undefined : site.phone,
        sameAs: [
          site.instagram,
          site.facebook,
          site.tiktok,
          site.youtube,
          site.linkedin,
          site.tripadvisor,
        ].filter((link) => !!link),
      }),
    ];

    if (seo.breadcrumbs && seo.title) {
      documents.push(
        breadcrumbLd([
          { name: this.i18n.t('nav.home'), url: localizedUrl(origin, '/', context.locale) },
          ...seo.breadcrumbs.map((crumb) => ({
            name: crumb.name,
            url: localizedUrl(origin, crumb.path, context.locale),
          })),
          { name: seo.title, url: localizedUrl(origin, context.path, context.locale) },
        ]),
      );
    }

    return [...documents, ...(seo.jsonLd ?? [])];
  }

  private setMeta(attribute: 'name' | 'property', key: string, content: string): void {
    if (content) {
      this.meta.updateTag({ [attribute]: key, content });
    } else {
      this.meta.removeTag(`${attribute}="${key}"`);
    }
  }

  private writeLink(rel: string, href: string): void {
    const head = this.document.head;
    const existing = head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
    if (!href) {
      existing?.remove();
      return;
    }

    const link = existing ?? this.document.createElement('link');
    link.setAttribute('rel', rel);
    link.setAttribute('href', href);
    if (!existing) {
      head.appendChild(link);
    }
  }

  private writeAlternates(origin: string, path: string): void {
    const head = this.document.head;
    head.querySelectorAll(`link[${ALTERNATE_ATTRIBUTE}]`).forEach((node) => node.remove());
    if (!origin) {
      return;
    }

    for (const alternate of alternatesFor(origin, path)) {
      const link = this.document.createElement('link');
      link.setAttribute('rel', 'alternate');
      link.setAttribute('hreflang', alternate.hreflang);
      link.setAttribute('href', alternate.href);
      link.setAttribute(ALTERNATE_ATTRIBUTE, '');
      head.appendChild(link);
    }
  }

  private writeJsonLd(documents: readonly JsonLd[]): void {
    const head = this.document.head;
    head.querySelectorAll(`script[${JSON_LD_ATTRIBUTE}]`).forEach((node) => node.remove());
    for (const value of documents) {
      const script = this.document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      script.setAttribute(JSON_LD_ATTRIBUTE, '');
      script.textContent = serializeLd(value);
      head.appendChild(script);
    }
  }

  private resolveOrigin(): string {
    if (this.config.siteUrl) {
      return this.config.siteUrl;
    }

    if (this.browser) {
      return this.document.defaultView?.location.origin ?? '';
    }

    return this.request ? new URL(this.request.url, 'http://localhost').origin : '';
  }
}
