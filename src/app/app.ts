import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { HlmToaster } from '@spartan-ng/helm/sonner';
import { AnalyticsService } from './core/analytics/analytics';
import { IntroService } from './core/animation/intro';
import { SmoothScroll } from './core/animation/smooth-scroll';
import { CatalogService } from './core/catalog/catalog';
import { ImagePlaceholder } from './core/images/placeholder';
import { I18nService } from './core/i18n/i18n';
import { TranslatePipe } from './core/i18n/translate-pipe';
import { stripLocale } from './core/i18n/catalogs';
import { CheckoutHeader } from './core/layout/checkout-header';
import { CookieBanner } from './core/layout/cookie-banner';
import { FloatingUi } from './core/layout/floating-ui';
import { IntroOverlay } from './core/layout/intro-overlay';
import { SiteFooter } from './core/layout/site-footer';
import { SiteHeader } from './core/layout/site-header';
import { WhatsappFab } from './core/layout/whatsapp-fab';
import { SeoService } from './core/seo/seo';
import { ThemeService } from './core/theme/theme';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    SiteHeader,
    CheckoutHeader,
    SiteFooter,
    WhatsappFab,
    HlmToaster,
    TranslatePipe,
    IntroOverlay,
    CookieBanner,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
  host: {
    '[attr.aria-busy]': 'intro.showOverlay() ? "true" : null',
  },
})
export class App {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly smooth = inject(SmoothScroll);

  protected readonly intro = inject(IntroService);
  protected readonly theme = inject(ThemeService).theme;
  protected readonly i18n = inject(I18nService);
  protected readonly catalog = inject(CatalogService);
  private readonly analytics = inject(AnalyticsService);
  private readonly placeholder = inject(ImagePlaceholder);
  // Instantiated here so its effect writes the SEO tags for every route, including pages with no own meta.
  private readonly seo = inject(SeoService);
  private readonly router = inject(Router);
  protected readonly floating = inject(FloatingUi);
  private readonly path = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => stripLocale(this.router.url)),
    ),
    { initialValue: stripLocale(this.router.url) },
  );
  /** Checkout and payment pages get the minimal header (no menu to pull the visitor away). */
  protected readonly focused = computed(() => /^\/(checkout|pay)(\/|\?|$)/.test(this.path()));
  /** The WhatsApp button would cover the cart and checkout actions; the minimal header has its own link. */
  protected readonly showWhatsapp = computed(
    () => !this.focused() && !/^\/cart(\/|\?|$)/.test(this.path()) && !this.floating.whatsappHidden(),
  );

  constructor() {
    this.analytics.start();
    effect(() => this.smooth.suspend(this.focused()));

    afterNextRender(() => this.placeholder.start());

    afterNextRender(() => {
      const wrapper = this.host.nativeElement.querySelector('#smooth-wrapper');
      const content = this.host.nativeElement.querySelector('#smooth-content');
      if (wrapper instanceof HTMLElement && content instanceof HTMLElement) {
        this.smooth.start(wrapper, content);
        return;
      }

      this.smooth.markReady();
    });
  }
}
