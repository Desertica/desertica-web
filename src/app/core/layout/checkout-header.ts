import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideLock } from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { CatalogService } from '../catalog/catalog';
import { I18nService } from '../i18n/i18n';
import { TranslatePipe } from '../i18n/translate-pipe';
import { BrandMark } from './brand-mark';
import { whatsappGlyph } from './footer-social-icons';

/** Header of the checkout and payment pages: logo, "secure payment", WhatsApp and back. No menu, so nothing pulls the visitor away. */
@Component({
  selector: 'app-checkout-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, NgIcon, HlmButton, TranslatePipe, BrandMark],
  providers: [provideIcons({ lucideArrowLeft, lucideLock })],
  template: `
    <header class="border-border/60 bg-background/90 fixed inset-x-0 top-0 z-40 border-b backdrop-blur-md">
      <div class="mx-auto flex min-h-14 max-w-6xl items-center justify-between gap-2 px-4 sm:min-h-16 sm:px-6 lg:min-h-20">
        <div class="flex min-w-0 items-center gap-1 sm:gap-3">
          <button
            hlmBtn
            type="button"
            variant="ghost"
            size="icon"
            id="checkout-back"
            class="shrink-0"
            [attr.aria-label]="'checkoutHeader.back' | translate: i18n.locale()"
            (click)="location.back()"
          >
            <ng-icon name="lucideArrowLeft" aria-hidden="true" />
          </button>
          <a routerLink="/" class="flex min-w-0 items-center">
            <app-brand-mark />
            <span class="sr-only">Desértica</span>
          </a>
        </div>
        <div class="flex shrink-0 items-center gap-3 text-sm">
          <span class="text-muted-foreground inline-flex items-center gap-1.5" id="checkout-secure">
            <ng-icon name="lucideLock" class="text-tierra" aria-hidden="true" />
            <span class="sr-only sm:not-sr-only">{{ 'checkoutHeader.secure' | translate: i18n.locale() }}</span>
          </span>
          @if (whatsapp(); as href) {
            <a
              hlmBtn
              variant="outline"
              size="sm"
              [href]="href"
              target="_blank"
              rel="noopener noreferrer"
              id="checkout-whatsapp"
              [attr.aria-label]="'a11y.whatsapp' | translate: i18n.locale()"
            >
              <ng-icon [svg]="glyph" aria-hidden="true" />
              <span class="hidden sm:inline">{{ 'checkoutHeader.help' | translate: i18n.locale() }}</span>
            </a>
          }
        </div>
      </div>
    </header>
  `,
})
export class CheckoutHeader {
  protected readonly i18n = inject(I18nService);
  protected readonly location = inject(Location);
  private readonly catalog = inject(CatalogService);
  protected readonly whatsapp = computed(() => this.catalog.contact().whatsapp);
  protected readonly glyph = whatsappGlyph;
}
