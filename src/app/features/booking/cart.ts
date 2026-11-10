import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { BookingApi } from '../../core/api/booking-api';
import { BookingFlow, holdErrorKey, type BookingSelection } from '../../core/booking/booking-flow';
import { CartService } from '../../core/booking/cart';
import { formatMoney, limaDateLong, limaTime } from '../../core/booking/format';
import { CatalogService } from '../../core/catalog/catalog';
import { Turnstile } from '../../core/forms/turnstile';
import { I18nService } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { usePageMeta } from '../../core/seo/page-meta';

/**
 * The cart: tours picked on the tour pages. The payment is still one tour at a time (the API pays one
 * booking per checkout), so each item has its own "Reserve" button; with a single item that is the main action.
 */
@Component({
  selector: 'app-cart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe, HlmButton, HlmCardImports, Turnstile],
  template: `
    <section class="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-12 sm:px-6">
      <h1 class="font-heading text-3xl">{{ 'cart.title' | translate: i18n.locale() }}</h1>

      @if (!cart.ready()) {
        <!-- the saved cart is read after hydration; nothing is shown until then -->
      } @else if (cart.items().length === 0) {
        <p id="cart-empty">{{ 'cart.empty' | translate: i18n.locale() }}</p>
        <a hlmBtn routerLink="/tours" class="w-fit">{{ 'cart.browse' | translate: i18n.locale() }}</a>
      } @else {
        @if (error(); as key) {
          <p role="alert" class="text-destructive text-sm">{{ key | translate: i18n.locale() }}</p>
        }
        <ul class="flex flex-col gap-4">
          @for (item of cart.items(); track item.departureId) {
            <li hlmCard>
              <div hlmCardContent class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div class="flex flex-col gap-1 text-sm">
                  <h2 class="font-heading text-xl">{{ title(item) | translate: i18n.locale() }}</h2>
                  <p>{{ date(item) }} · {{ time(item) }}</p>
                  <p class="text-muted-foreground">{{ people(item) }}</p>
                </div>
                <div class="flex flex-col items-start gap-2 sm:items-end">
                  <p class="font-medium tabular-nums">{{ money(item.quote.totalCents, item.currency) }}</p>
                  <div class="flex gap-2">
                    <button hlmBtn type="button" size="sm" variant="outline" (click)="cart.remove(item.departureId)">
                      {{ 'cart.remove' | translate: i18n.locale() }}
                    </button>
                    @if (cart.items().length > 1) {
                      <button hlmBtn type="button" size="sm" [disabled]="blocked()" (click)="reserve(item)">
                        {{ 'cart.reserveOne' | translate: i18n.locale() }}
                      </button>
                    }
                  </div>
                </div>
              </div>
            </li>
          }
        </ul>

        <section hlmCard>
          <div hlmCardContent class="flex flex-col gap-3">
            @for (total of cart.totals(); track total.currency) {
              <p class="flex justify-between text-lg font-medium">
                <span>{{ 'booking.total' | translate: i18n.locale() }}</span>
                <span class="tabular-nums">{{ money(total.cents, total.currency) }}</span>
              </p>
            }
            <p class="text-muted-foreground text-xs">{{ 'booking.taxIncluded' | translate: i18n.locale() }}</p>
            <app-turnstile (tokenChange)="captcha.set($event)" />
            @if (cart.items().length === 1) {
              <button hlmBtn type="button" class="w-full" [disabled]="blocked()" (click)="reserve(cart.items()[0]!)">
                {{ (busy() ? 'booking.holding' : 'booking.continue') | translate: i18n.locale() }}
              </button>
            } @else {
              <p class="text-muted-foreground text-sm" id="cart-multi-note">
                {{ 'cart.multiNote' | translate: i18n.locale() }}
              </p>
            }
          </div>
        </section>
      }
    </section>
  `,
})
export class Cart {
  protected readonly i18n = inject(I18nService);
  protected readonly cart = inject(CartService);
  private readonly catalog = inject(CatalogService);
  private readonly flow = inject(BookingFlow);
  private readonly api = inject(BookingApi);
  private readonly router = inject(Router);
  protected readonly busy = signal(false);
  private readonly turnstile = viewChild(Turnstile);
  protected readonly captcha = signal<string | null>(null);
  /** Holding seats needs a solved Turnstile challenge when the site key is configured. */
  protected readonly blocked = computed(() => this.busy() || (this.turnstile()?.enabled === true && !this.captcha()));
  protected readonly error = signal<string | null>(null);

  constructor() {
    usePageMeta(() => ({ title: this.i18n.t('cart.title'), noindex: true }));
  }

  protected title(item: BookingSelection): string {
    return this.catalog.tourById(item.tourSlug)?.titleKey ?? item.tourSlug;
  }

  protected date(item: BookingSelection): string {
    return limaDateLong(item.startsAt, this.i18n.locale());
  }

  protected time(item: BookingSelection): string {
    return limaTime(item.startsAt, this.i18n.locale());
  }

  protected people(item: BookingSelection): string {
    const adults = `${item.adults} ${this.i18n.t('cart.adults')}`;
    return item.children ? `${adults}, ${item.children} ${this.i18n.t('cart.children')}` : adults;
  }

  protected money(cents: number, currency: string): string {
    return formatMoney(cents, currency, this.i18n.locale());
  }

  /**
   * Quotes the item again (the stored price can be old), holds its seats and moves it to checkout. If the price changed, the
   * cart shows the new one and the visitor decides again. The item stays in the cart until the booking is created.
   */
  protected async reserve(item: BookingSelection): Promise<void> {
    if (this.busy()) {
      return;
    }

    this.busy.set(true);
    this.error.set(null);
    const fresh = await this.api.quote({
      departureId: item.departureId,
      adults: item.adults,
      children: item.children,
      currency: item.currency,
    });
    if (!fresh.ok) {
      this.busy.set(false);
      this.error.set(fresh.status === 404 || fresh.status === 409 ? 'cart.unavailable' : holdErrorKey(fresh.status));
      return;
    }

    const current = { ...item, quote: fresh.data };
    if (fresh.data.totalCents !== item.quote.totalCents) {
      this.cart.add(current);
      this.busy.set(false);
      this.error.set('cart.priceChanged');
      return;
    }

    const result = await this.flow.reserve(current, this.captcha());
    this.busy.set(false);
    // The token is single-use: the next attempt needs a new one.
    this.turnstile()?.reset();
    if (!result.ok) {
      this.error.set(holdErrorKey(result.status));
      return;
    }

    await this.router.navigateByUrl('/checkout');
  }
}
