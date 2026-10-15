import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmSwitchImports } from '@spartan-ng/helm/switch';
import { ConsentService } from '../analytics/consent';
import { I18nService } from '../i18n/i18n';
import { TranslatePipe } from '../i18n/translate-pipe';

/** Cookie banner with the three categories. Rendered only in the browser, after consent loads. */
@Component({
  selector: 'app-cookie-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe, HlmButton, HlmSwitchImports],
  host: {
    class: 'fixed inset-x-0 bottom-0 z-[60] flex justify-center p-3 sm:justify-start sm:p-6',
  },
  template: `
    @if (consent.bannerOpen()) {
      <section
        class="bg-card text-card-foreground border-border w-full max-w-xl rounded-3xl border p-5 shadow-xl"
        role="region"
        aria-labelledby="cookie-banner-title"
        aria-describedby="cookie-banner-text"
      >
        <h2 id="cookie-banner-title" class="text-base font-semibold">
          {{ 'cookies.title' | translate: i18n.locale() }}
        </h2>
        <p id="cookie-banner-text" class="text-muted-foreground mt-2 text-sm">
          {{ 'cookies.text' | translate: i18n.locale() }}
          <a routerLink="/privacy" class="text-foreground underline underline-offset-2">{{
            'cookies.policy' | translate: i18n.locale()
          }}</a>
        </p>

        @if (customizing()) {
          <ul class="mt-4 flex flex-col gap-3">
            <li class="flex items-start justify-between gap-4">
              <div>
                <p id="cookie-necessary" class="text-sm font-medium">
                  {{ 'cookies.necessary' | translate: i18n.locale() }}
                </p>
                <p class="text-muted-foreground text-xs">
                  {{ 'cookies.necessaryText' | translate: i18n.locale() }}
                </p>
              </div>
              <hlm-switch checked disabled aria-labelledby="cookie-necessary" />
            </li>
            <li class="flex items-start justify-between gap-4">
              <div>
                <p id="cookie-analytics" class="text-sm font-medium">
                  {{ 'cookies.analytics' | translate: i18n.locale() }}
                </p>
                <p class="text-muted-foreground text-xs">
                  {{ 'cookies.analyticsText' | translate: i18n.locale() }}
                </p>
              </div>
              <hlm-switch
                aria-labelledby="cookie-analytics"
                [checked]="analytics()"
                (checkedChange)="analytics.set($event)"
              />
            </li>
            <li class="flex items-start justify-between gap-4">
              <div>
                <p id="cookie-marketing" class="text-sm font-medium">
                  {{ 'cookies.marketing' | translate: i18n.locale() }}
                </p>
                <p class="text-muted-foreground text-xs">
                  {{ 'cookies.marketingText' | translate: i18n.locale() }}
                </p>
              </div>
              <hlm-switch
                aria-labelledby="cookie-marketing"
                [checked]="marketing()"
                (checkedChange)="marketing.set($event)"
              />
            </li>
          </ul>
        }

        <div class="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button hlmBtn type="button" (click)="consent.acceptAll()">
            {{ 'cookies.acceptAll' | translate: i18n.locale() }}
          </button>
          <button hlmBtn variant="outline" type="button" (click)="consent.rejectAll()">
            {{ 'cookies.rejectAll' | translate: i18n.locale() }}
          </button>
          @if (customizing()) {
            <button hlmBtn variant="secondary" type="button" (click)="saveChoice()">
              {{ 'cookies.save' | translate: i18n.locale() }}
            </button>
          } @else {
            <button hlmBtn variant="ghost" type="button" (click)="customizing.set(true)">
              {{ 'cookies.customize' | translate: i18n.locale() }}
            </button>
          }
        </div>
      </section>
    }
  `,
})
export class CookieBanner {
  protected readonly consent = inject(ConsentService);
  protected readonly i18n = inject(I18nService);
  protected readonly customizing = signal(false);
  protected readonly analytics = signal(false);
  protected readonly marketing = signal(false);

  constructor() {
    afterNextRender(() => this.consent.reveal());

    // Opening the preferences from the footer starts from the stored choice, with the switches shown.
    effect(() => {
      if (this.consent.bannerOpen() && this.consent.choice()) {
        this.analytics.set(this.consent.analytics());
        this.marketing.set(this.consent.marketing());
        this.customizing.set(true);
      }
    });
  }

  protected saveChoice(): void {
    this.consent.save({ analytics: this.analytics(), marketing: this.marketing() });
    this.customizing.set(false);
  }
}
