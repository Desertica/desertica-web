import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  Injectable,
  PLATFORM_ID,
  REQUEST,
  TransferState,
  afterNextRender,
  inject,
  makeStateKey,
  signal,
} from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_QUERY,
  LOCALE_STORAGE_KEY,
  type AppLocale,
  EMPTY_OVERLAY,
  type MessageOverlay,
  isAppLocale,
  parseCookie,
  resolveLocale,
  translate,
} from './catalogs';

const LOCALE_STATE_KEY = makeStateKey<AppLocale | null>('locale');

/** Storage can throw when the browser blocks it (private mode, disabled cookies). */
function readStoredLocale(): string | null {
  try {
    return localStorage.getItem(LOCALE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredLocale(locale: AppLocale): void {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // The cookie below still remembers the choice.
  }
}

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly transferState = inject(TransferState);
  private readonly request = inject(REQUEST, { optional: true });
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  readonly locale = signal<AppLocale>(this.readInitialLocale());
  private overlayValue: MessageOverlay = EMPTY_OVERLAY;

  constructor() {
    this.apply(this.locale());

    if (isPlatformBrowser(this.platformId)) {
      afterNextRender(() => {
        const preferred = this.readClientPreference();
        if (preferred !== this.locale()) {
          this.setLocale(preferred);
          return;
        }

        this.persist(this.locale());
      });
    }
  }

  get overlay(): MessageOverlay {
    return this.overlayValue;
  }

  /** Registers CMS messages for this injector (one per SSR request) and refreshes page meta. */
  setOverlay(overlay: MessageOverlay): void {
    this.overlayValue = overlay;
    this.apply(this.locale());
  }

  t(key: string): string {
    return translate(key, this.locale(), this.overlayValue);
  }

  setLocale(locale: AppLocale): void {
    this.locale.set(locale);
    this.apply(locale);
    this.persist(locale);
  }

  private readClientPreference(): AppLocale {
    const href = this.document.defaultView?.location.href;
    const query = href ? new URL(href).searchParams.get(LOCALE_QUERY) : null;
    const cookie = parseCookie(this.document.cookie, LOCALE_COOKIE);
    if (isAppLocale(cookie) || isAppLocale(query)) {
      return resolveLocale({ cookie, query });
    }

    const stored = readStoredLocale();
    if (isAppLocale(stored)) {
      return stored;
    }

    return this.locale();
  }

  private readInitialLocale(): AppLocale {
    if (isPlatformBrowser(this.platformId)) {
      const transferred = this.transferState.get(LOCALE_STATE_KEY, null);
      if (isAppLocale(transferred)) {
        return transferred;
      }

      const href = this.document.defaultView?.location.href;
      const query = href ? new URL(href).searchParams.get(LOCALE_QUERY) : null;
      const cookie = parseCookie(this.document.cookie, LOCALE_COOKIE);
      if (isAppLocale(cookie) || isAppLocale(query)) {
        return resolveLocale({ cookie, query });
      }

      const stored = readStoredLocale();
      if (isAppLocale(stored)) {
        return stored;
      }

      return DEFAULT_LOCALE;
    }

    const url = this.request ? new URL(this.request.url, 'http://localhost') : null;
    const locale = resolveLocale({
      cookie: parseCookie(this.request?.headers.get('cookie'), LOCALE_COOKIE),
      query: url?.searchParams.get(LOCALE_QUERY),
    });

    this.transferState.set(LOCALE_STATE_KEY, locale);
    return locale;
  }

  private persist(locale: AppLocale): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    writeStoredLocale(locale);
    this.document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; SameSite=Lax`;
  }

  private apply(locale: AppLocale): void {
    this.document.documentElement.lang = locale;
    this.title.setTitle(translate('meta.title', locale, this.overlayValue));
    this.meta.updateTag({
      name: 'description',
      content: translate('meta.description', locale, this.overlayValue),
    });
  }
}
