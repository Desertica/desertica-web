import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmLabel } from '@spartan-ng/helm/label';
import { HlmRadioGroupImports } from '@spartan-ng/helm/radio-group';
import { AnalyticsService, centsToMajor } from '../../core/analytics/analytics';
import { BookingApi, type PaymentOption, type PublicBooking } from '../../core/api/booking-api';
import { BookingFlow } from '../../core/booking/booking-flow';
import { formatMoney } from '../../core/booking/format';
import { I18nService } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { usePageMeta } from '../../core/seo/page-meta';

type Kind = PaymentOption['kinds'][number];

/**
 * Payment step of the checkout. The gateways (Stripe and Culqi) arrive in Ola 2, so this screen
 * only lets the visitor choose among the `paymentOptions` the API returned for the booking's
 * currency, reports the choice to analytics and points to "my booking".
 */
@Component({
  selector: 'app-checkout-payment',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe, HlmButton, HlmCardImports, HlmLabel, HlmRadioGroupImports],
  template: `
    <section class="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-12 sm:px-6">
      <h1 class="font-heading text-3xl">{{ 'payment.title' | translate: i18n.locale() }}</h1>

      @if (missing()) {
        <p id="payment-missing">{{ 'payment.missing' | translate: i18n.locale() }}</p>
        <a hlmBtn routerLink="/booking" class="w-fit">{{ 'myBooking.title' | translate: i18n.locale() }}</a>
      } @else if (booking(); as current) {
        <section hlmCard>
          <div hlmCardContent class="flex flex-col gap-2 text-sm">
            <p>
              {{ 'myBooking.reference' | translate: i18n.locale() }}:
              <strong id="payment-reference">{{ current.reference }}</strong>
            </p>
            <p>{{ 'booking.total' | translate: i18n.locale() }}: {{ money(current.totalCents) }}</p>
            @if (current.depositCents) {
              <p>{{ 'booking.deposit' | translate: i18n.locale() }}: {{ money(current.depositCents) }}</p>
            }
          </div>
        </section>

        @if (options().length) {
          <fieldset class="flex flex-col gap-3">
            <legend class="font-medium">{{ 'payment.gateway' | translate: i18n.locale() }}</legend>
            <hlm-radio-group class="w-full" name="payment-provider" [value]="provider()" (valueChange)="onProvider($event)">
              @for (option of options(); track option.provider) {
                <label hlmLabel class="flex items-center gap-3" [for]="'provider-' + option.provider">
                  <hlm-radio [value]="option.provider" [inputId]="'provider-' + option.provider"><hlm-radio-indicator indicator /></hlm-radio>
                  {{ 'payment.provider.' + option.provider | translate: i18n.locale() }}
                </label>
              }
            </hlm-radio-group>
          </fieldset>

          <fieldset class="flex flex-col gap-3">
            <legend class="font-medium">{{ 'checkout.payment' | translate: i18n.locale() }}</legend>
            <hlm-radio-group class="w-full" name="payment-kind" [value]="kind()" (valueChange)="onKind($event)">
              @for (item of kinds(); track item) {
                <label hlmLabel class="flex items-center gap-3" [for]="'kind-' + item">
                  <hlm-radio [value]="item" [inputId]="'kind-' + item"><hlm-radio-indicator indicator /></hlm-radio>
                  {{ 'payment.kind.' + item | translate: i18n.locale() }} · {{ money(amount(item)) }}
                </label>
              }
            </hlm-radio-group>
          </fieldset>

          <button hlmBtn type="button" size="lg" id="payment-continue" class="w-fit" (click)="continue()">
            {{ 'payment.continue' | translate: i18n.locale() }}
          </button>
        } @else {
          <p>{{ 'payment.noOptions' | translate: i18n.locale() }}</p>
        }

        @if (chosen()) {
          <p role="status" id="payment-placeholder" class="border-border rounded-3xl border p-4 text-sm">
            {{ 'payment.placeholder' | translate: i18n.locale() }}
          </p>
        }

        <a hlmBtn variant="outline" class="w-fit" [routerLink]="['/booking', current.reference]">
          {{ 'payment.viewBooking' | translate: i18n.locale() }}
        </a>
      } @else if (failed()) {
        <p class="text-destructive" role="alert">{{ 'myBooking.loadError' | translate: i18n.locale() }}</p>
      }
    </section>
  `,
})
export class CheckoutPayment {
  private readonly api = inject(BookingApi);
  private readonly flow = inject(BookingFlow);
  private readonly analytics = inject(AnalyticsService);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly reference = input.required<string>();
  protected readonly i18n = inject(I18nService);
  protected readonly booking = signal<PublicBooking | null>(null);
  protected readonly options = signal<readonly PaymentOption[]>([]);
  protected readonly missing = signal(false);
  protected readonly failed = signal(false);
  protected readonly provider = signal<PaymentOption['provider'] | ''>('');
  protected readonly kind = signal<Kind | ''>('');
  protected readonly chosen = signal(false);
  protected readonly kinds = computed(
    () => this.options().find((option) => option.provider === this.provider())?.kinds ?? [],
  );

  constructor() {
    usePageMeta(() => ({ title: this.i18n.t('payment.title'), noindex: true }));
    afterNextRender(() => void this.load());
  }

  protected money(cents: number): string {
    return formatMoney(cents, this.booking()?.currency ?? 'USD', this.i18n.locale());
  }

  protected amount(kind: Kind): number {
    const booking = this.booking();
    if (!booking) {
      return 0;
    }

    if (kind === 'DEPOSIT') {
      return booking.depositCents ?? booking.totalCents;
    }

    return kind === 'BALANCE' ? booking.pendingCents : booking.totalCents;
  }

  protected onProvider(value: unknown): void {
    if (value === 'STRIPE' || value === 'CULQI') {
      this.provider.set(value);
      this.kind.set(this.kinds()[0] ?? '');
      this.chosen.set(false);
    }
  }

  protected onKind(value: unknown): void {
    if (value === 'FULL' || value === 'DEPOSIT' || value === 'BALANCE') {
      this.kind.set(value);
      this.chosen.set(false);
    }
  }

  protected continue(): void {
    const booking = this.booking();
    const provider = this.provider();
    const kind = this.kind();
    if (!booking || !provider || !kind) {
      return;
    }

    // The gateway itself arrives in Ola 2; the visitor's choice is still worth measuring.
    this.analytics.track('add_payment_info', {
      currency: booking.currency,
      value: centsToMajor(this.amount(kind)),
      payment_type: provider === 'STRIPE' ? 'stripe' : 'culqi',
      event_id: booking.reference,
    });
    this.chosen.set(true);
  }

  private async load(): Promise<void> {
    if (!this.browser) {
      return;
    }

    const remembered = this.flow.remembered(this.reference());
    if (!remembered) {
      this.missing.set(true);
      return;
    }

    this.options.set(remembered.paymentOptions);
    const first = remembered.paymentOptions[0];
    this.provider.set(first?.provider ?? '');
    this.kind.set(first?.kinds[0] ?? '');
    const result = await this.api.booking(this.reference(), remembered.accessToken);
    if (result.ok) {
      this.booking.set(result.data);
    } else if (result.status === 401 || result.status === 404) {
      this.missing.set(true);
    } else {
      this.failed.set(true);
    }
  }
}
