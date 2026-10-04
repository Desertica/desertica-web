import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  inject,
  output,
  viewChild,
} from '@angular/core';
import { PUBLIC_CONFIG } from '../config/public-config';
import { I18nService } from '../i18n/i18n';

type TurnstileApi = {
  render: (
    element: HTMLElement,
    options: {
      sitekey: string;
      theme: 'auto';
      language: string;
      callback: (token: string) => void;
      'expired-callback': () => void;
      'error-callback': () => void;
    },
  ) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
};

type TurnstileWindow = Window & { turnstile?: TurnstileApi };

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

/**
 * Cloudflare Turnstile challenge. It renders only when `TURNSTILE_SITE_KEY` is configured; the
 * parent reads `enabled()` to know whether a token must be present before submitting. The token
 * is single-use, so call `reset()` after every attempt.
 */
@Component({
  selector: 'app-turnstile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (enabled) {
      <div #widget></div>
    }
  `,
})
export class Turnstile {
  private readonly document = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly siteKey = inject(PUBLIC_CONFIG).turnstileSiteKey;
  private readonly i18n = inject(I18nService);
  private readonly container = viewChild<ElementRef<HTMLElement>>('widget');
  private widgetId: string | undefined;

  readonly enabled = this.siteKey !== null;
  /** Emits the token once solved, and `null` when it expires or the challenge fails. */
  readonly tokenChange = output<string | null>();

  constructor() {
    afterNextRender(() => {
      if (this.browser && this.siteKey) {
        void this.mount(this.siteKey);
      }
    });
  }

  reset(): void {
    this.tokenChange.emit(null);
    const api = (this.document.defaultView as TurnstileWindow | null)?.turnstile;
    if (api && this.widgetId !== undefined) {
      api.reset(this.widgetId);
    }
  }

  private async mount(siteKey: string): Promise<void> {
    const api = await this.load();
    const element = this.container()?.nativeElement;
    if (!api || !element) {
      return;
    }

    this.widgetId = api.render(element, {
      sitekey: siteKey,
      theme: 'auto',
      language: this.i18n.locale(),
      callback: (token) => this.tokenChange.emit(token),
      'expired-callback': () => this.tokenChange.emit(null),
      'error-callback': () => this.tokenChange.emit(null),
    });
  }

  private load(): Promise<TurnstileApi | null> {
    const view = this.document.defaultView as TurnstileWindow | null;
    if (view?.turnstile) {
      return Promise.resolve(view.turnstile);
    }

    return new Promise((resolve) => {
      const existing = this.document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
      const script = existing ?? this.document.createElement('script');
      script.addEventListener('load', () => resolve(view?.turnstile ?? null), { once: true });
      script.addEventListener('error', () => resolve(null), { once: true });
      if (!existing) {
        script.src = SCRIPT_SRC;
        script.async = true;
        this.document.head.appendChild(script);
      }
    });
  }
}
