import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  InjectionToken,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmLabel } from '@spartan-ng/helm/label';
import { HlmRadioGroupImports } from '@spartan-ng/helm/radio-group';
import type { Stripe, StripeElements, StripeError } from '@stripe/stripe-js';
import { AnalyticsService, centsToMajor } from '../../core/analytics/analytics';
import {
  BookingApi,
  type ApiResult,
  type CulqiChargeResult,
  type Currency,
  type PayTarget,
  type PaymentKind,
  type PaymentOption,
  type PublicBooking,
} from '../../core/api/booking-api';
import { formatMoney } from '../../core/booking/format';
import { PUBLIC_CONFIG } from '../../core/config/public-config';
import { I18nService } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { CulqiLoader, type CulqiGlobals } from '../../core/payments/culqi-loader';
import { StripeLoader } from '../../core/payments/stripe-loader';

type Provider = PaymentOption['provider'];

/** How long the screen waits for the API to report a payment, and how often it asks. */
export type PaymentPolling = { intervalMs: number; timeoutMs: number };
export const PAYMENT_POLLING = new InjectionToken<PaymentPolling>('PAYMENT_POLLING', {
  providedIn: 'root',
  factory: () => ({ intervalMs: 2000, timeoutMs: 60_000 }),
});

export type PaymentOutcome =
  /** The API reported the payment: the booking as it reads now. */
  | { status: 'confirmed'; booking: PublicBooking }
  /** The gateway took the payment but the API has not reported it yet (or the target cannot be read). */
  | { status: 'pending' };

type Phase = 'choose' | 'ready' | 'processing' | 'confirming' | 'success' | 'pending';

const SITE_TITLE = 'Desértica';

/**
 * Payment step shared by the checkout and the e-mailed payment link. The visitor picks a gateway
 * and, when the API offers several, deposit or full amount. Amounts come from the booking; the API
 * decides what is allowed (`paymentOptions`). Stripe mounts the Express Checkout Element (Apple Pay,
 * Google Pay) and the Payment Element (card); Culqi opens Culqi.js. Card numbers are typed into
 * the gateways' own frames and never reach this code. A payment only counts as done when the API
 * says so: this component asks for the booking again until `paidCents` grows, with a time limit.
 */
@Component({
  selector: 'app-payment-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, HlmButton, HlmLabel, HlmRadioGroupImports],
  template: `
    @if (phase() === 'success' || phase() === 'pending') {
      <div
        #result
        tabindex="-1"
        role="status"
        class="border-border flex flex-col gap-2 rounded-3xl border p-5 outline-none"
        [id]="phase() === 'success' ? 'payment-success' : 'payment-pending'"
      >
        <h2 class="font-heading text-xl">
          {{ (phase() === 'success' ? 'payment.successTitle' : 'payment.pendingTitle') | translate: i18n.locale() }}
        </h2>
        <p class="text-sm">
          {{ (phase() === 'success' ? 'payment.successBody' : 'payment.pendingBody') | translate: i18n.locale() }}
        </p>
      </div>
    } @else if (!shown().length) {
      <p id="payment-no-options">{{ 'payment.noOptions' | translate: i18n.locale() }}</p>
    } @else {
      <p class="text-sm">
        {{ 'booking.currency' | translate: i18n.locale() }}: <strong id="payment-currency">{{ currency() }}</strong>
      </p>

      <fieldset class="flex flex-col gap-3" [disabled]="busy()">
        <legend class="font-medium">{{ 'payment.gateway' | translate: i18n.locale() }}</legend>
        <hlm-radio-group class="w-full" name="payment-provider" [value]="provider()" (valueChange)="onProvider($event)">
          @for (option of shown(); track option.provider) {
            <label hlmLabel class="flex items-center gap-3" [for]="'provider-' + option.provider">
              <hlm-radio [value]="option.provider" [inputId]="'provider-' + option.provider"><hlm-radio-indicator indicator /></hlm-radio>
              {{ 'payment.provider.' + option.provider | translate: i18n.locale() }}
            </label>
          }
        </hlm-radio-group>
      </fieldset>

      @if (kinds().length > 1) {
        <fieldset class="flex flex-col gap-3" [disabled]="busy()">
          <legend class="font-medium">{{ 'checkout.payment' | translate: i18n.locale() }}</legend>
          <hlm-radio-group class="w-full" name="payment-kind" [value]="kind()" (valueChange)="onKind($event)">
            @for (item of kinds(); track item) {
              <label hlmLabel class="flex items-center gap-3" [for]="'kind-' + item">
                <hlm-radio [value]="item" [inputId]="'kind-' + item"><hlm-radio-indicator indicator /></hlm-radio>
                {{ 'payment.kind.' + item | translate: i18n.locale() }} · {{ money(amountOf(item)) }}
              </label>
            }
          </hlm-radio-group>
        </fieldset>
      } @else if (kind()) {
        <p class="text-sm">
          {{ 'payment.kind.' + kind() | translate: i18n.locale() }}:
          <strong id="payment-amount">{{ money(amountOf(kind())) }}</strong>
        </p>
      }

      @if (error(); as message) {
        <p class="text-destructive text-sm" role="alert" id="payment-error">
          {{ message | translate: i18n.locale() }}
          @if (detail()) {
            <span> {{ detail() }}</span>
          }
        </p>
      }

      @if (phase() === 'processing' || phase() === 'confirming') {
        <p role="status" id="payment-working" class="text-sm">
          {{ (phase() === 'processing' ? 'payment.processing' : 'payment.confirming') | translate: i18n.locale() }}
        </p>
      }

      @if (provider() === 'STRIPE' && stripeReady()) {
        <div class="flex flex-col gap-4" [attr.aria-busy]="busy()">
          <div role="group" [attr.aria-label]="'payment.walletLabel' | translate: i18n.locale()">
            <div #express id="stripe-express"></div>
          </div>
          <div role="group" [attr.aria-label]="'payment.cardLabel' | translate: i18n.locale()">
            <div #card id="stripe-card"></div>
          </div>
          <button hlmBtn type="button" size="lg" id="stripe-pay" class="w-fit" [disabled]="busy()" (click)="payWithStripeCard()">
            {{ 'payment.pay' | translate: i18n.locale() }} · {{ money(amountOf(kind())) }}
          </button>
        </div>
      } @else {
        <button
          hlmBtn
          type="button"
          size="lg"
          id="payment-continue"
          class="w-fit"
          [disabled]="busy() || !canContinue()"
          [attr.aria-busy]="busy()"
          (click)="continue()"
        >
          {{ (provider() === 'CULQI' ? 'payment.pay' : 'payment.continue') | translate: i18n.locale() }}
          @if (kind()) {
            · {{ money(amountOf(kind())) }}
          }
        </button>
      }
    }
  `,
})
export class PaymentStep {
  private readonly api = inject(BookingApi);
  private readonly analytics = inject(AnalyticsService);
  private readonly stripeLoader = inject(StripeLoader);
  private readonly culqiLoader = inject(CulqiLoader);
  private readonly config = inject(PUBLIC_CONFIG);
  private readonly polling = inject(PAYMENT_POLLING);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

  readonly target = input.required<PayTarget>();
  readonly currency = input.required<Currency>();
  readonly options = input.required<readonly PaymentOption[]>();
  /** Amount in minor units for each kind the API may offer (booking or link). */
  readonly amounts = input.required<Partial<Record<PaymentKind, number>>>();
  /** Booking reference: analytics `event_id` and the return page of redirect-based methods. */
  readonly reference = input.required<string>();
  /** `paidCents` before this payment; the API must report more than this. */
  readonly paidBefore = input(0);
  readonly settled = output<PaymentOutcome>();

  protected readonly i18n = inject(I18nService);
  protected readonly phase = signal<Phase>('choose');
  protected readonly provider = signal<Provider | ''>('');
  protected readonly kind = signal<PaymentKind | ''>('');
  protected readonly error = signal<string | null>(null);
  protected readonly detail = signal<string | null>(null);
  protected readonly stripeReady = signal(false);
  private readonly culqiReady = signal(false);
  protected readonly busy = computed(() => ['processing', 'confirming'].includes(this.phase()));

  /** Stripe sells in USD only, and Culqi needs its public key to be configured. */
  protected readonly shown = computed(() =>
    this.options().filter((option) =>
      option.provider === 'STRIPE'
        ? this.currency() === 'USD'
        : this.config.culqiPublicKey !== null,
    ),
  );
  protected readonly kinds = computed(
    () => this.shown().find((option) => option.provider === this.provider())?.kinds ?? [],
  );
  protected readonly canContinue = computed(
    () => !!this.provider() && !!this.kind() && (this.provider() !== 'CULQI' || this.culqiReady()),
  );

  private readonly express = viewChild<ElementRef<HTMLElement>>('express');
  private readonly card = viewChild<ElementRef<HTMLElement>>('card');
  private readonly result = viewChild<ElementRef<HTMLElement>>('result');

  private mounted: { destroy(): void }[] = [];
  private stripe: Stripe | null = null;
  private elements: StripeElements | null = null;
  private culqi: CulqiGlobals | null = null;
  private deviceId: string | undefined;
  private stopCulqi: (() => void) | null = null;
  private readonly keys = new Map<string, string>();
  private destroyed = false;

  constructor() {
    // Pick the first gateway once the options are known, and again if they change.
    effect(() => {
      const first = this.shown()[0];
      untracked(() => {
        if (!this.shown().some((option) => option.provider === this.provider())) {
          this.provider.set(first?.provider ?? '');
          this.kind.set(first?.kinds[0] ?? '');
          void this.prepare();
        }
      });
    });

    effect(() => {
      if (['success', 'pending'].includes(this.phase())) {
        this.result()?.nativeElement.focus();
      }
    });

    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
      this.teardownStripe();
      this.stopCulqi?.();
      this.culqi?.threeDS.reset();
    });
  }

  protected money(cents: number): string {
    return formatMoney(cents, this.currency(), this.i18n.locale());
  }

  protected amountOf(kind: PaymentKind | ''): number {
    return kind ? (this.amounts()[kind] ?? 0) : 0;
  }

  protected onProvider(value: unknown): void {
    if ((value === 'STRIPE' || value === 'CULQI') && !this.busy()) {
      this.reset();
      this.provider.set(value);
      this.kind.set(this.kinds()[0] ?? '');
      void this.prepare();
    }
  }

  protected onKind(value: unknown): void {
    if ((value === 'FULL' || value === 'DEPOSIT' || value === 'BALANCE') && !this.busy()) {
      // An intent is created for one amount, so a new choice starts over.
      this.reset();
      this.kind.set(value);
    }
  }

  protected async continue(): Promise<void> {
    const provider = this.provider();
    const kind = this.kind();
    if (!provider || !kind || this.busy()) {
      return;
    }

    this.error.set(null);
    this.detail.set(null);
    this.analytics.track('add_payment_info', {
      currency: this.currency(),
      value: centsToMajor(this.amountOf(kind)),
      payment_type: provider === 'STRIPE' ? 'stripe' : 'culqi',
      event_id: this.reference(),
    });

    if (provider === 'STRIPE') {
      await this.startStripe(kind);
    } else {
      this.openCulqi(kind);
    }
  }

  // ---------------------------------------------------------------------------------- Stripe

  private async startStripe(kind: PaymentKind): Promise<void> {
    this.phase.set('processing');
    const intent = await this.api.stripeIntent(this.target(), kind, this.keyFor(`stripe:${kind}`));
    if (!intent.ok) {
      return this.fail(this.messageFor(intent.status));
    }

    try {
      this.stripe = await this.stripeLoader.load(intent.data.publishableKey);
    } catch {
      this.stripe = null;
    }

    if (!this.stripe || this.destroyed) {
      return this.fail('payment.errorGateway');
    }

    this.elements = this.stripe.elements({
      clientSecret: intent.data.clientSecret,
      locale: this.i18n.locale() === 'es' ? 'es' : 'en',
    });
    this.stripeReady.set(true);
    this.phase.set('ready');
    afterNextRender(() => this.mountStripe(), { injector: this.injector });
  }

  private mountStripe(): void {
    const elements = this.elements;
    const express = this.express()?.nativeElement;
    const card = this.card()?.nativeElement;
    if (!elements || !express || !card) {
      return;
    }

    const wallets = elements.create('expressCheckout', { buttonHeight: 48 });
    const cardElement = elements.create('payment');
    this.mounted = [wallets, cardElement];
    wallets.on('confirm', (event) => {
      void this.confirmStripe(() => event.paymentFailed({ reason: 'fail' }));
    });
    // Apple Pay and Google Pay only render where the browser supports them: hide an empty slot.
    wallets.on('loaderror', () => express.replaceChildren());
    wallets.mount(express);
    cardElement.mount(card);
  }

  protected async payWithStripeCard(): Promise<void> {
    await this.confirmStripe(() => undefined);
  }

  private async confirmStripe(onFailure: () => void): Promise<void> {
    if (!this.stripe || !this.elements || this.busy()) {
      return;
    }

    this.error.set(null);
    this.detail.set(null);
    this.phase.set('processing');
    const origin = this.document.defaultView?.location.origin ?? '';
    const { error } = await this.stripe.confirmPayment({
      elements: this.elements,
      confirmParams: { return_url: `${origin}/booking/${encodeURIComponent(this.reference())}` },
      redirect: 'if_required',
    });
    if (error) {
      onFailure();
      return this.failStripe(error);
    }

    await this.awaitApi();
  }

  private failStripe(error: StripeError): void {
    // Card and validation errors are written for the customer by Stripe, in their language.
    const customer = error.type === 'card_error' || error.type === 'validation_error';
    this.fail('payment.errorDeclined', customer ? error.message : undefined);
  }

  private teardownStripe(): void {
    for (const element of this.mounted) {
      element.destroy();
    }

    this.mounted = [];
    this.elements = null;
    this.stripe = null;
    this.stripeReady.set(false);
  }

  // ----------------------------------------------------------------------------------- Culqi

  /** Loads Culqi.js ahead of the click so the modal opens at once. */
  private async prepare(): Promise<void> {
    if (this.provider() !== 'CULQI' || this.culqi || !this.config.culqiPublicKey) {
      return;
    }

    try {
      const culqi = await this.culqiLoader.load();
      culqi.checkout.publicKey = this.config.culqiPublicKey;
      culqi.threeDS.publicKey = this.config.culqiPublicKey;
      culqi.threeDS.options = {
        showModal: true,
        showLoading: true,
        showIcon: true,
        // Closing the 3DS window ends this attempt; the visitor can try again.
        closeModalAction: () => {
          this.fail('payment.errorCancelled');
          culqi.threeDS.reset();
        },
      };
      this.deviceId = await culqi.threeDS.generateDevice();
      this.culqi = culqi;
      this.culqiReady.set(true);
    } catch {
      this.error.set('payment.errorGateway');
    }
  }

  private openCulqi(kind: PaymentKind): void {
    const culqi = this.culqi;
    if (!culqi) {
      return;
    }

    culqi.checkout.settings({
      title: SITE_TITLE,
      currency: this.currency(),
      amount: this.amountOf(kind),
    });
    culqi.checkout.options({
      lang: this.i18n.locale() === 'es' ? 'es' : 'en',
      installments: false,
      // The API charges a token, so only the card flow is offered.
      paymentMethods: {
        tarjeta: true,
        bancaMovil: false,
        agente: false,
        billetera: false,
        cuotealo: false,
        yape: false,
      },
    });
    this.stopCulqi?.();
    this.stopCulqi = this.culqiLoader.onResult(() => void this.onCulqiResult(kind));
    this.phase.set('ready');
    culqi.checkout.open();
  }

  private async onCulqiResult(kind: PaymentKind): Promise<void> {
    const culqi = this.culqi;
    const token = culqi?.checkout.token;
    if (!culqi || this.busy()) {
      return;
    }

    if (!token) {
      // Culqi shows its own message in the modal; here the attempt just goes back to idle.
      return this.fail('payment.errorDeclined');
    }

    culqi.checkout.close();
    this.phase.set('processing');
    const first = await this.api.culqiCharge(
      this.target(),
      { kind, token: token.id, email: token.email },
      crypto.randomUUID(),
    );
    await this.afterCharge(first, kind, token);
  }

  private async afterCharge(
    result: ApiResult<CulqiChargeResult>,
    kind: PaymentKind,
    token: { id: string; email: string },
  ): Promise<void> {
    if (!result.ok) {
      return this.fail(this.messageFor(result.status));
    }

    const charge = result.data;
    if (charge.status === 'REQUIRES_ACTION' && charge.action?.type === 'THREE_DS') {
      return this.runThreeDS(kind, token);
    }

    if (charge.status === 'SUCCEEDED' || charge.status === 'PENDING') {
      return this.awaitApi();
    }

    return this.fail('payment.errorDeclined', charge.failureMessage ?? undefined);
  }

  /**
   * The bank asked for 3DS: Culqi's window runs the challenge and posts the authentication
   * parameters back to this page, and the charge is repeated with them.
   */
  private async runThreeDS(kind: PaymentKind, token: { id: string; email: string }): Promise<void> {
    const culqi = this.culqi;
    if (!culqi) {
      return this.fail('payment.errorGateway');
    }

    const view = this.document.defaultView;
    const origin = view?.location.origin ?? '';
    culqi.threeDS.settings = {
      charge: { totalAmount: this.amountOf(kind), returnUrl: `${origin}/payment/3ds` },
      card: { email: token.email },
    };

    const parameters = await new Promise<Record<string, unknown> | null>((resolve) => {
      const listener = (event: MessageEvent): void => {
        if (event.origin !== origin) {
          return;
        }

        const data = event.data as { parameters3DS?: Record<string, unknown>; error?: unknown } | null;
        if (data?.parameters3DS || data?.error) {
          view?.removeEventListener('message', listener);
          resolve(data.parameters3DS ?? null);
        }
      };
      view?.addEventListener('message', listener);
      culqi.threeDS.initAuthentication(token.id);
    });
    culqi.threeDS.reset();
    if (!parameters) {
      return this.fail('payment.errorDeclined');
    }

    const retry = await this.api.culqiCharge(
      this.target(),
      { kind, token: token.id, email: token.email, deviceId: this.deviceId, authentication3DS: parameters },
      crypto.randomUUID(),
    );
    if (!retry.ok) {
      return this.fail(this.messageFor(retry.status));
    }

    if (retry.data.status === 'SUCCEEDED' || retry.data.status === 'PENDING') {
      return this.awaitApi();
    }

    return this.fail('payment.errorDeclined', retry.data.failureMessage ?? undefined);
  }

  // ----------------------------------------------------------------------------- confirmation

  /**
   * The gateway answered, but only the API knows whether the money arrived (its webhook may land a
   * moment later). A booking is asked for again until `paidCents` grows; a payment link has no
   * booking to read, so it ends as pending and the customer gets the confirmation by e-mail.
   */
  private async awaitApi(): Promise<void> {
    const target = this.target();
    this.phase.set('confirming');
    if (target.type === 'link') {
      return this.finish({ status: 'pending' });
    }

    const deadline = Date.now() + this.polling.timeoutMs;
    while (!this.destroyed) {
      const read = await this.api.booking(target.reference, target.accessToken);
      if (read.ok && read.data.paidCents > this.paidBefore()) {
        return this.finish({ status: 'confirmed', booking: read.data });
      }

      if (!read.ok && (read.status === 401 || read.status === 404)) {
        break;
      }

      if (Date.now() >= deadline) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, this.polling.intervalMs));
    }

    if (!this.destroyed) {
      this.finish({ status: 'pending' });
    }
  }

  private finish(outcome: PaymentOutcome): void {
    this.teardownStripe();
    this.phase.set(outcome.status === 'confirmed' ? 'success' : 'pending');
    this.settled.emit(outcome);
  }

  // ---------------------------------------------------------------------------------- helpers

  private fail(message: string, detail?: string): void {
    this.error.set(message);
    this.detail.set(detail ?? null);
    this.phase.set(this.stripeReady() ? 'ready' : 'choose');
  }

  private reset(): void {
    this.teardownStripe();
    this.error.set(null);
    this.detail.set(null);
    this.phase.set('choose');
  }

  private messageFor(status: number): string {
    return status === 429
      ? 'booking.errorBusy'
      : status === 409 || status === 410
        ? 'payment.errorUnavailable'
        : 'payment.errorGeneric';
  }

  /** One key per attempt at an amount, so a double click returns the same intent. */
  private keyFor(scope: string): string {
    let key = this.keys.get(scope);
    if (!key) {
      key = crypto.randomUUID();
      this.keys.set(scope, key);
    }

    return key;
  }
}
