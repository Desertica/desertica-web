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
import { PurchaseTracker } from '../../core/analytics/purchase';
import {
  BookingApi,
  type PayTarget,
  type PaymentKind,
  type PublicBooking,
} from '../../core/api/booking-api';
import { BookingFlow } from '../../core/booking/booking-flow';
import { formatMoney } from '../../core/booking/format';
import { I18nService } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { usePageMeta } from '../../core/seo/page-meta';
import { PaymentStep, type PaymentOutcome } from '../payment/payment-step';

/**
 * Payment step of the checkout. The booking (read back from the API with its access token) says
 * which gateways and kinds of payment are open and for how much; `PaymentStep` does the paying and
 * this page reports a confirmed payment once, as `purchase`.
 */
@Component({
  selector: 'app-checkout-payment',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe, HlmButton, HlmCardImports, PaymentStep],
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
            @if (current.paidCents > 0) {
              <p>{{ 'myBooking.paid' | translate: i18n.locale() }}: {{ money(current.paidCents) }}</p>
            }
          </div>
        </section>

        @if (current.pendingCents > 0 || paidNow()) {
          <app-payment-step
            [target]="target()"
            [currency]="current.currency"
            [options]="current.paymentOptions"
            [amounts]="amounts()"
            [reference]="current.reference"
            [paidBefore]="paidBefore()"
            (settled)="onSettled($event)"
          />
        } @else {
          <p id="payment-settled">{{ 'payment.nothingDue' | translate: i18n.locale() }}</p>
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
  private readonly purchases = inject(PurchaseTracker);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly reference = input.required<string>();
  protected readonly i18n = inject(I18nService);
  protected readonly booking = signal<PublicBooking | null>(null);
  protected readonly missing = signal(false);
  protected readonly failed = signal(false);
  /** Set once a payment went through, so the step stays up to show its result. */
  protected readonly paidNow = signal(false);
  /** What had been paid when the visitor arrived: the API must report more than this. */
  protected readonly paidBefore = signal(0);
  private readonly accessToken = signal('');

  protected readonly target = computed<PayTarget>(() => ({
    type: 'booking',
    reference: this.reference(),
    accessToken: this.accessToken(),
  }));
  /** Amounts come from the booking: the API decides the deposit, not this page. */
  protected readonly amounts = computed<Partial<Record<PaymentKind, number>>>(() => {
    const booking = this.booking();
    return booking
      ? {
          FULL: booking.totalCents,
          DEPOSIT: booking.depositCents ?? undefined,
          BALANCE: booking.pendingCents,
        }
      : {};
  });

  constructor() {
    usePageMeta(() => ({ title: this.i18n.t('payment.title'), noindex: true }));
    afterNextRender(() => void this.load());
  }

  protected money(cents: number): string {
    return formatMoney(cents, this.booking()?.currency ?? 'USD', this.i18n.locale());
  }

  protected onSettled(outcome: PaymentOutcome): void {
    this.paidNow.set(true);
    if (outcome.status === 'confirmed') {
      this.booking.set(outcome.booking);
      this.purchases.record(outcome.booking);
    }
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

    this.accessToken.set(remembered.accessToken);
    const result = await this.api.booking(this.reference(), remembered.accessToken);
    if (result.ok) {
      this.paidBefore.set(result.data.paidCents);
      this.booking.set(result.data);
    } else if (result.status === 401 || result.status === 404) {
      this.missing.set(true);
    } else {
      this.failed.set(true);
    }
  }
}
