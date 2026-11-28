import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  InjectionToken,
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
import { CatalogService } from '../../core/catalog/catalog';
import { PUBLIC_CONFIG } from '../../core/config/public-config';
import { I18nService } from '../../core/i18n/i18n';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { CulqiLoader, type CulqiGlobals } from '../../core/payments/culqi-loader';

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

type ThreeDsOutcome = { parameters: Record<string, unknown> } | 'cancelled' | 'failed';

type Phase = 'choose' | 'ready' | 'processing' | 'confirming' | 'success' | 'pending';

const SITE_TITLE = 'Desértica';

/**
 * Payment step shared by the checkout and the e-mailed payment link. The visitor picks a gateway
 * and, when the API offers several, deposit or full amount. Amounts come from the booking; the API
 * decides what is allowed (`paymentOptions`). Culqi opens Culqi.js; card numbers are typed into
 * its own frames and never reach this code. A payment only counts as done when the API
 * says so: this component asks for the booking again until `paidCents` grows, with a time limit.
 */
@Component({
  selector: 'app-payment-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, TranslatePipe, HlmButton, HlmLabel, HlmRadioGroupImports],
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
          {{
            (phase() === 'success' ? 'payment.successTitle' : 'payment.pendingTitle')
              | translate: i18n.locale()
          }}
        </h2>
        <p class="text-sm">
          {{
            (phase() === 'success' ? 'payment.successBody' : 'payment.pendingBody')
              | translate: i18n.locale()
          }}
        </p>
      </div>
    } @else if (!shown().length) {
      <p id="payment-no-options">{{ 'payment.noOptions' | translate: i18n.locale() }}</p>
      <ng-container *ngTemplateOutlet="help" />
    } @else if (preset()) {
      <!-- Compact: the amount was chosen in the checkout and its own button pays; only progress and errors show here. -->
      @if (error(); as message) {
        <div class="border-destructive/40 flex flex-col gap-2 rounded-3xl border p-4" role="alert" id="payment-error">
          <p class="text-destructive text-sm font-medium">
            {{ message | translate: i18n.locale() }}
            @if (detail()) {
              <span> {{ detail() }}</span>
            }
          </p>
          <ng-container *ngTemplateOutlet="help" />
        </div>
      }
      @if (phase() === 'processing' || phase() === 'confirming') {
        <p role="status" id="payment-working" class="text-sm">
          {{ (phase() === 'processing' ? 'payment.processing' : 'payment.confirming') | translate: i18n.locale() }}
        </p>
      }
    } @else {
      <p class="text-sm">
        {{ 'booking.currency' | translate: i18n.locale() }}:
        <strong id="payment-currency">{{ currency() }}</strong>
      </p>

      <fieldset class="flex flex-col gap-3" [disabled]="busy()">
        <legend class="font-medium">{{ 'payment.gateway' | translate: i18n.locale() }}</legend>
        <hlm-radio-group
          class="w-full"
          name="payment-provider"
          [value]="provider()"
          (valueChange)="onProvider($event)"
        >
          @for (option of shown(); track option.provider) {
            <label hlmLabel class="flex items-center gap-3" [for]="'provider-' + option.provider">
              <hlm-radio [value]="option.provider" [inputId]="'provider-' + option.provider"
                ><hlm-radio-indicator indicator
              /></hlm-radio>
              {{ 'payment.provider.' + option.provider | translate: i18n.locale() }}
            </label>
          }
        </hlm-radio-group>
      </fieldset>

      @if (kinds().length > 1) {
        <fieldset class="flex flex-col gap-3" [disabled]="busy()">
          <legend class="font-medium">{{ 'checkout.payment' | translate: i18n.locale() }}</legend>
          <hlm-radio-group
            class="w-full"
            name="payment-kind"
            [value]="kind()"
            (valueChange)="onKind($event)"
          >
            @for (item of kinds(); track item) {
              <label hlmLabel class="flex items-center gap-3" [for]="'kind-' + item">
                <hlm-radio [value]="item" [inputId]="'kind-' + item"
                  ><hlm-radio-indicator indicator
                /></hlm-radio>
                {{ 'payment.kind.' + item | translate: i18n.locale() }} ·
                {{ money(amountOf(item)) }}
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
          {{
            (phase() === 'processing' ? 'payment.processing' : 'payment.confirming')
              | translate: i18n.locale()
          }}
        </p>
      }

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
        {{
          (provider() === 'CULQI' ? 'payment.pay' : 'payment.continue') | translate: i18n.locale()
        }}
        @if (kind()) {
          · {{ money(amountOf(kind())) }}
        }
      </button>
      @if (error()) {
        <ng-container *ngTemplateOutlet="help" />
      }
    }

    <ng-template #help>
      <p class="text-muted-foreground text-sm" id="payment-help">
        {{ 'payment.retryHelp' | translate: i18n.locale() }}
        @if (whatsapp(); as href) {
          <a class="text-foreground underline underline-offset-4" [href]="href" target="_blank" rel="noopener noreferrer">{{ 'payment.whatsappHelp' | translate: i18n.locale() }}</a>
        }
      </p>
    </ng-template>
  `,
})
export class PaymentStep {
  private readonly api = inject(BookingApi);
  private readonly analytics = inject(AnalyticsService);
  private readonly culqiLoader = inject(CulqiLoader);
  private readonly config = inject(PUBLIC_CONFIG);
  private readonly polling = inject(PAYMENT_POLLING);
  private readonly document = inject(DOCUMENT);
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
  /** Kind already chosen (the checkout): no gateway or amount choice is shown, and the parent's button calls `start()`. */
  readonly preset = input<PaymentKind | null>(null);
  /** Opens the gateway as soon as it has loaded (the checkout, right after the booking is created). */
  readonly autoStart = input(false);
  readonly settled = output<PaymentOutcome>();

  protected readonly i18n = inject(I18nService);
  protected readonly phase = signal<Phase>('choose');
  protected readonly provider = signal<Provider | ''>('');
  protected readonly kind = signal<PaymentKind | ''>('');
  protected readonly error = signal<string | null>(null);
  protected readonly detail = signal<string | null>(null);
  private readonly culqiReady = signal(false);
  readonly busy = computed(() => ['processing', 'confirming'].includes(this.phase()));
  /** Charging, or already paid: the parent's pay button should wait. (Closing Culqi's window sends no event, so 'ready' does not count.) */
  readonly active = computed(() => this.phase() !== 'choose' && this.phase() !== 'ready');
  private readonly catalog = inject(CatalogService);
  protected readonly whatsapp = computed(() => this.catalog.contact().whatsapp);
  private autoStarted = false;

  /** Culqi needs its public key to be configured. */
  protected readonly shown = computed(() =>
    this.config.culqiPublicKey !== null ? this.options() : [],
  );
  protected readonly kinds = computed(
    () => this.shown().find((option) => option.provider === this.provider())?.kinds ?? [],
  );
  readonly canContinue = computed(
    () => !!this.provider() && !!this.kind() && (this.provider() !== 'CULQI' || this.culqiReady()),
  );

  private readonly result = viewChild<ElementRef<HTMLElement>>('result');

  private culqi: CulqiGlobals | null = null;
  private deviceId: string | undefined;
  private stopCulqi: (() => void) | null = null;
  /** Ends a 3DS challenge that is waiting for the bank (window closed or page left). */
  private endThreeDS: (() => void) | null = null;
  private destroyed = false;

  constructor() {
    // Pick the first gateway once the options are known, and again if they change.
    effect(() => {
      const first = this.shown()[0];
      untracked(() => {
        if (!this.shown().some((option) => option.provider === this.provider())) {
          this.provider.set(first?.provider ?? '');
          this.kind.set(this.firstKind(first?.kinds ?? []));
          void this.prepare();
        }
      });
    });

    effect(() => {
      if (this.autoStart() && this.canContinue() && !this.autoStarted) {
        this.autoStarted = true;
        untracked(() => void this.start());
      }
    });

    effect(() => {
      if (['success', 'pending'].includes(this.phase())) {
        this.result()?.nativeElement.focus();
      }
    });

    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
      this.stopCulqi?.();
      this.endThreeDS?.();
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
    if (value === 'CULQI' && !this.busy()) {
      this.reset();
      this.provider.set(value);
      this.kind.set(this.firstKind(this.kinds()));
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

  /** The preset kind when the gateway offers it, else its first one. */
  private firstKind(kinds: readonly PaymentKind[]): PaymentKind | '' {
    const preset = this.preset();
    return preset && kinds.includes(preset) ? preset : (kinds[0] ?? '');
  }

  /** Opens the gateway for the chosen amount (the parent's button in compact mode). */
  start(): Promise<void> {
    return this.continue();
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
      payment_type: 'culqi',
      event_id: this.reference(),
    });

    this.openCulqi(kind);
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
        closeModalAction: () => this.endThreeDS?.(),
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
      // Culqi wants the same device id on the charge and on its 3DS retry.
      {
        kind,
        token: token.id,
        email: token.email,
        ...(this.deviceId ? { deviceId: this.deviceId } : {}),
      },
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
      return this.runThreeDS(kind, token, charge.paymentId);
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
  private async runThreeDS(
    kind: PaymentKind,
    token: { id: string; email: string },
    paymentId: string,
  ): Promise<void> {
    const culqi = this.culqi;
    if (!culqi) {
      return this.fail('payment.errorGateway');
    }

    const view = this.document.defaultView;
    const origin = view?.location.origin ?? '';
    culqi.threeDS.settings = {
      charge: {
        totalAmount: this.amountOf(kind),
        returnUrl: `${origin}/payment/3ds`,
        currency: this.currency(),
      },
      card: { email: token.email },
    };

    const outcome = await new Promise<ThreeDsOutcome>((resolve) => {
      const listener = (event: MessageEvent): void => {
        if (event.origin !== origin) {
          return;
        }

        const data = event.data as {
          parameters3DS?: Record<string, unknown>;
          error?: unknown;
        } | null;
        if (data?.parameters3DS) {
          finish({ parameters: data.parameters3DS });
        } else if (data?.error) {
          finish('failed');
        }
      };
      // One way out for every path (message, closed window, page destroyed), so no listener outlives
      // the attempt and a late message can never repeat a charge.
      const finish = (result: ThreeDsOutcome): void => {
        view?.removeEventListener('message', listener);
        this.endThreeDS = null;
        resolve(result);
      };
      this.endThreeDS = () => finish('cancelled');
      view?.addEventListener('message', listener);
      culqi.threeDS.initAuthentication(token.id);
    });
    culqi.threeDS.reset();
    if (outcome === 'cancelled') {
      return this.fail('payment.errorCancelled');
    }

    if (outcome === 'failed') {
      return this.fail('payment.errorDeclined');
    }

    const parameters = outcome.parameters;
    const retry = await this.api.culqiCharge(
      this.target(),
      // The retry continues the same payment (`paymentId`); a new one would be refused for a link.
      {
        kind,
        token: token.id,
        email: token.email,
        paymentId,
        deviceId: this.deviceId,
        authentication3DS: parameters,
      },
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
    this.phase.set(outcome.status === 'confirmed' ? 'success' : 'pending');
    this.settled.emit(outcome);
  }

  // ---------------------------------------------------------------------------------- helpers

  private fail(message: string, detail?: string): void {
    this.error.set(message);
    this.detail.set(detail ?? null);
    this.phase.set('choose');
  }

  private reset(): void {
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
}
