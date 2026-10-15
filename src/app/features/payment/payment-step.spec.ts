import { TestBed } from '@angular/core/testing';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { AnalyticsService } from '../../core/analytics/analytics';
import type { PayTarget, PaymentKind, PaymentOption } from '../../core/api/booking-api';
import { DEFAULT_PUBLIC_CONFIG, PUBLIC_CONFIG, type PublicConfig } from '../../core/config/public-config';
import { CulqiLoader, type CulqiGlobals } from '../../core/payments/culqi-loader';
import { StripeLoader } from '../../core/payments/stripe-loader';
import { publicBooking } from '../../testing/booking-fixtures';
import { stubMatchMedia } from '../../testing/match-media';
import { mockApi } from '../../testing/mock-api';
import { settle } from '../../testing/settle';
import { PAYMENT_POLLING, PaymentStep, type PaymentOutcome } from './payment-step';

const BOOKING: PayTarget = { type: 'booking', reference: 'DES-2026-0001', accessToken: 'access-1' };
const AMOUNTS: Partial<Record<PaymentKind, number>> = { FULL: 15800, DEPOSIT: 3160 };
const BOTH: PaymentOption[] = [
  { provider: 'STRIPE', kinds: ['FULL', 'DEPOSIT'] },
  { provider: 'CULQI', kinds: ['FULL', 'DEPOSIT'] },
];
const PAID = publicBooking({ status: 'CONFIRMED', paidCents: 3160, pendingCents: 12640 });

type Handler = (payload?: unknown) => void;

/** Stripe.js stand-in that records what the component asks for and lets a spec trigger events. */
function fakeStripe() {
  const handlers: Record<string, Handler> = {};
  const wallets = {
    on: vi.fn((event: string, handler: Handler) => {
      handlers[event] = handler;
      return wallets;
    }),
    mount: vi.fn(),
    destroy: vi.fn(),
  };
  const card = { mount: vi.fn(), destroy: vi.fn() };
  const elements = { create: vi.fn((type: string) => (type === 'expressCheckout' ? wallets : card)) };
  const stripe = {
    elements: vi.fn(() => elements),
    confirmPayment: vi.fn(async (): Promise<unknown> => ({ paymentIntent: { status: 'succeeded' } })),
  };
  return { stripe, elements, wallets, card, handlers, load: vi.fn(async () => stripe) };
}

/** Culqi.js and Culqi 3DS stand-ins. */
function fakeCulqi() {
  let onResult: (() => void) | null = null;
  const checkout: CulqiGlobals['checkout'] = {
    publicKey: '',
    settings: vi.fn(),
    options: vi.fn(),
    open: vi.fn(),
    close: vi.fn(),
  };
  const threeDS: CulqiGlobals['threeDS'] = {
    publicKey: '',
    options: {},
    settings: { charge: { totalAmount: 0, returnUrl: '' }, card: { email: '' } },
    generateDevice: vi.fn(async () => 'device-1'),
    initAuthentication: vi.fn(),
    reset: vi.fn(),
  };
  return {
    checkout,
    threeDS,
    load: vi.fn(async () => ({ checkout, threeDS })),
    onResult: vi.fn((handler: () => void) => {
      onResult = handler;
      return () => undefined;
    }),
    /** What Culqi.js does when its modal yields a token. */
    emitToken: () => {
      checkout.token = { id: 'tkn_test_1', email: 'ana@example.com' };
      onResult?.();
    },
  };
}

describe('PaymentStep', () => {
  let mock: ReturnType<typeof mockApi> | undefined;
  const track = vi.fn();
  let stripe = fakeStripe();
  let culqi = fakeCulqi();

  const setup = async (config: Partial<PublicConfig> = { culqiPublicKey: 'pk_test_abc' }) => {
    track.mockReset();
    stripe = fakeStripe();
    culqi = fakeCulqi();
    stubMatchMedia(() => false);
    await TestBed.configureTestingModule({
      providers: [
        provideSpartanHlm(),
        { provide: AnalyticsService, useValue: { track } },
        { provide: PUBLIC_CONFIG, useValue: { ...DEFAULT_PUBLIC_CONFIG, ...config } },
        { provide: StripeLoader, useValue: { load: stripe.load } },
        { provide: CulqiLoader, useValue: { load: culqi.load, onResult: culqi.onResult } },
        { provide: PAYMENT_POLLING, useValue: { intervalMs: 1, timeoutMs: 40 } },
      ],
    }).compileComponents();
  };

  afterEach(() => mock?.restore());

  const mount = async (
    options: {
      target?: PayTarget;
      currency?: 'USD' | 'PEN';
      options?: PaymentOption[];
      paidBefore?: number;
    } = {},
  ) => {
    const fixture = TestBed.createComponent(PaymentStep);
    const outcomes: PaymentOutcome[] = [];
    fixture.componentInstance.settled.subscribe((outcome) => outcomes.push(outcome));
    fixture.componentRef.setInput('target', options.target ?? BOOKING);
    fixture.componentRef.setInput('currency', options.currency ?? 'USD');
    fixture.componentRef.setInput('options', options.options ?? BOTH);
    fixture.componentRef.setInput('amounts', AMOUNTS);
    fixture.componentRef.setInput('reference', 'DES-2026-0001');
    fixture.componentRef.setInput('paidBefore', options.paidBefore ?? 0);
    await settle(fixture);
    const root = fixture.nativeElement as HTMLElement;
    const click = async (selector: string) => {
      (root.querySelector(selector) as HTMLElement).click();
      await settle(fixture, 10);
    };
    return { fixture, root, outcomes, click };
  };

  const intent = {
    status: 201,
    body: {
      paymentId: '6f9619ff-8b86-4011-b42d-00c04fc964ff',
      clientSecret: 'pi_1_secret_2',
      publishableKey: 'pk_test_stripe',
      amountCents: 15800,
      currency: 'USD',
    },
  };

  describe('gateway choice', () => {
    it('offers what the API allows, hides Stripe outside USD and Culqi without its key', async () => {
      await setup();
      const usd = await mount();
      expect(usd.root.textContent).toContain('Apple Pay, Google Pay or card (USD)');
      expect(usd.root.textContent).toContain('Card (Culqi)');
      expect(usd.root.textContent).toContain('Full amount · $158.00');
      expect(usd.root.textContent).toContain('Deposit · $31.60');
      TestBed.resetTestingModule();

      await setup();
      const pen = await mount({ currency: 'PEN' });
      expect(pen.root.textContent).not.toContain('Stripe');
      expect(pen.root.textContent).not.toContain('Apple Pay');
      expect(pen.root.textContent).toContain('Card (Culqi)');
      TestBed.resetTestingModule();

      await setup({ culqiPublicKey: null });
      const noKey = await mount();
      expect(noKey.root.textContent).not.toContain('Culqi');
    });

    it('follows the gateway: a kind the gateway does not offer is not shown', async () => {
      await setup();
      const { root, click } = await mount({
        options: [
          { provider: 'STRIPE', kinds: ['FULL', 'DEPOSIT'] },
          { provider: 'CULQI', kinds: ['FULL'] },
        ],
      });
      expect(root.textContent).toContain('Deposit · ');

      await click('#provider-CULQI');
      expect(root.textContent).not.toContain('Deposit · ');
      expect(root.querySelector('#payment-amount')?.textContent).toContain('$158.00');
    });

    it('says so when there is nothing to pay with', async () => {
      await setup({ culqiPublicKey: null });
      const { root } = await mount({ options: [] });
      expect(root.querySelector('#payment-no-options')).not.toBeNull();
    });
  });

  describe('Stripe', () => {
    const unpaidThenPaid = () => {
      let reads = 0;
      return {
        'POST /public/bookings/*/payments/stripe-intent': () => intent,
        'GET /public/bookings/*': () => ({ body: reads++ < 1 ? publicBooking() : PAID }),
      };
    };

    it('creates the intent for the chosen kind, mounts the wallet and card elements and pays', async () => {
      await setup();
      mock = mockApi(unpaidThenPaid());
      const { root, click, outcomes } = await mount();

      await click('#kind-DEPOSIT');
      await click('#payment-continue');

      const request = mock.calls.find((call) => call.path.endsWith('/stripe-intent'));
      expect(request?.path).toBe('/public/bookings/DES-2026-0001/payments/stripe-intent');
      expect(request?.body).toEqual({ kind: 'DEPOSIT' });
      expect(request?.headers.get('x-booking-token')).toBe('access-1');
      expect(request?.headers.get('idempotency-key')).toMatch(/^[0-9a-f-]{36}$/);
      expect(track).toHaveBeenCalledWith('add_payment_info', {
        currency: 'USD',
        value: 31.6,
        payment_type: 'stripe',
        event_id: 'DES-2026-0001',
      });
      expect(stripe.load).toHaveBeenCalledWith('pk_test_stripe');
      expect(stripe.stripe.elements).toHaveBeenCalledWith(expect.objectContaining({ clientSecret: 'pi_1_secret_2', locale: 'en' }));
      expect(stripe.elements.create).toHaveBeenCalledWith('expressCheckout', expect.anything());
      expect(stripe.elements.create).toHaveBeenCalledWith('payment');
      expect(stripe.wallets.mount).toHaveBeenCalledTimes(1);
      expect(stripe.card.mount).toHaveBeenCalledTimes(1);

      await click('#stripe-pay');

      expect(stripe.stripe.confirmPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          redirect: 'if_required',
          confirmParams: { return_url: `${location.origin}/booking/DES-2026-0001` },
        }),
      );
      // The browser's own success is not enough: the API has to report the payment.
      expect(mock.calls.filter((call) => call.method === 'GET').length).toBeGreaterThanOrEqual(2);
      expect(outcomes).toHaveLength(1);
      expect(outcomes[0]).toMatchObject({ status: 'confirmed', booking: { paidCents: 3160 } });
      expect(root.querySelector('#payment-success')).not.toBeNull();
    });

    it('pays from the Apple Pay / Google Pay button too', async () => {
      await setup();
      mock = mockApi(unpaidThenPaid());
      const { click, outcomes } = await mount();
      await click('#payment-continue');

      stripe.handlers['confirm']?.({ paymentFailed: vi.fn(), expressPaymentType: 'apple_pay' });
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(stripe.stripe.confirmPayment).toHaveBeenCalledTimes(1);
      expect(outcomes[0]?.status).toBe('confirmed');
    });

    it('shows Stripe\'s message for a declined card, tells the wallet, and lets the visitor retry', async () => {
      await setup();
      mock = mockApi(unpaidThenPaid());
      const { root, click, outcomes } = await mount();
      await click('#payment-continue');
      const paymentFailed = vi.fn();
      stripe.stripe.confirmPayment.mockResolvedValueOnce({
        error: { type: 'card_error', message: 'Your card was declined.' },
      });

      stripe.handlers['confirm']?.({ paymentFailed });
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(paymentFailed).toHaveBeenCalled();
      expect(root.querySelector('#payment-error')?.textContent).toContain('The payment was not completed.');
      expect(root.querySelector('#payment-error')?.textContent).toContain('Your card was declined.');
      expect(outcomes).toHaveLength(0);
      // The card form stays so the visitor can try again.
      expect(root.querySelector('#stripe-pay')).not.toBeNull();
    });

    it('does not claim success when the API never reports the payment: it ends as pending', async () => {
      await setup();
      mock = mockApi({
        'POST /public/bookings/*/payments/stripe-intent': () => intent,
        'GET /public/bookings/*': () => ({ body: publicBooking() }),
      });
      const { root, click, outcomes } = await mount();
      await click('#payment-continue');
      await click('#stripe-pay');
      await new Promise((resolve) => setTimeout(resolve, 80));

      expect(outcomes).toEqual([{ status: 'pending' }]);
      expect(root.querySelector('#payment-success')).toBeNull();
    });

    it('reuses the idempotency key for the same amount and changes it for another', async () => {
      await setup();
      mock = mockApi({ 'POST /public/bookings/*/payments/stripe-intent': () => intent });
      const { click } = await mount();
      await click('#kind-FULL');
      await click('#payment-continue');
      await click('#kind-DEPOSIT');
      await click('#payment-continue');
      await click('#kind-FULL');
      await click('#payment-continue');

      const keys = mock.calls.map((call) => call.headers.get('idempotency-key'));
      expect(keys).toHaveLength(3);
      expect(keys[0]).toBe(keys[2]);
      expect(keys[1]).not.toBe(keys[0]);
    });

    it('reports a gateway that cannot load and a busy API', async () => {
      await setup();
      mock = mockApi({ 'POST /public/bookings/*/payments/stripe-intent': () => ({ status: 429, body: { message: 'slow' } }) });
      const { root, click } = await mount();
      await click('#payment-continue');
      expect(root.querySelector('#payment-error')?.textContent).toContain('Too many attempts');
      mock.restore();

      mock = mockApi({ 'POST /public/bookings/*/payments/stripe-intent': () => intent });
      stripe.load.mockResolvedValueOnce(null as never);
      await click('#payment-continue');
      expect(root.querySelector('#payment-error')?.textContent).toContain('could not be loaded');
    });
  });

  describe('Culqi', () => {
    const chargeBody = (status: string, extra: object = {}) => ({
      status: 201,
      body: { paymentId: '6f9619ff-8b86-4011-b42d-00c04fc964ff', status, ...extra },
    });

    it('opens Culqi.js with the amount in minor units and sends the token to the API', async () => {
      await setup();
      let reads = 0;
      mock = mockApi({
        'POST /public/bookings/*/payments/culqi-charge': () => chargeBody('SUCCEEDED'),
        'GET /public/bookings/*': () => ({ body: reads++ < 1 ? publicBooking() : PAID }),
      });
      const { root, click, outcomes } = await mount();
      await click('#provider-CULQI');
      await click('#kind-DEPOSIT');
      expect(culqi.checkout.publicKey).toBe('pk_test_abc');
      expect(culqi.threeDS.publicKey).toBe('pk_test_abc');

      await click('#payment-continue');
      expect(culqi.checkout.settings).toHaveBeenCalledWith({ title: 'Desértica', currency: 'USD', amount: 3160 });
      expect(culqi.checkout.options).toHaveBeenCalledWith(
        expect.objectContaining({ paymentMethods: expect.objectContaining({ tarjeta: true, yape: false }) }),
      );
      expect(culqi.checkout.open).toHaveBeenCalled();
      expect(track).toHaveBeenCalledWith('add_payment_info', expect.objectContaining({ payment_type: 'culqi', value: 31.6 }));

      culqi.emitToken();
      await new Promise((resolve) => setTimeout(resolve, 20));

      const charge = mock.calls.find((call) => call.path.endsWith('/culqi-charge'));
      expect(charge?.path).toBe('/public/bookings/DES-2026-0001/payments/culqi-charge');
      expect(charge?.body).toEqual({ kind: 'DEPOSIT', token: 'tkn_test_1', email: 'ana@example.com' });
      expect(charge?.headers.get('x-booking-token')).toBe('access-1');
      expect(culqi.checkout.close).toHaveBeenCalled();
      expect(outcomes[0]).toMatchObject({ status: 'confirmed' });
      expect(root.querySelector('#payment-success')).not.toBeNull();
    });

    it('runs the 3DS challenge when the API asks for it and repeats the charge with its parameters', async () => {
      await setup();
      let charges = 0;
      let reads = 0;
      mock = mockApi({
        'POST /public/bookings/*/payments/culqi-charge': () =>
          charges++ === 0
            ? chargeBody('REQUIRES_ACTION', { action: { type: 'THREE_DS', parameters: {} } })
            : chargeBody('SUCCEEDED'),
        'GET /public/bookings/*': () => ({ body: reads++ < 1 ? publicBooking() : PAID }),
      });
      const { click, outcomes } = await mount();
      await click('#provider-CULQI');
      await click('#payment-continue');
      culqi.emitToken();
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(culqi.threeDS.initAuthentication).toHaveBeenCalledWith('tkn_test_1');
      expect(culqi.threeDS.settings).toEqual({
        charge: { totalAmount: 15800, returnUrl: `${location.origin}/payment/3ds` },
        card: { email: 'ana@example.com' },
      });
      // A message from another origin is ignored.
      window.dispatchEvent(new MessageEvent('message', { data: { parameters3DS: { eci: 'x' } }, origin: 'https://evil.example' }));
      await new Promise((resolve) => setTimeout(resolve, 5));
      expect(mock.calls.filter((call) => call.path.endsWith('/culqi-charge'))).toHaveLength(1);

      window.dispatchEvent(new MessageEvent('message', { data: { parameters3DS: { eci: '05' } }, origin: location.origin }));
      await new Promise((resolve) => setTimeout(resolve, 30));

      const calls = mock.calls.filter((call) => call.path.endsWith('/culqi-charge'));
      expect(calls).toHaveLength(2);
      expect(calls[1]?.body).toEqual({
        kind: 'FULL',
        token: 'tkn_test_1',
        email: 'ana@example.com',
        deviceId: 'device-1',
        authentication3DS: { eci: '05' },
      });
      expect(calls[1]?.headers.get('idempotency-key')).not.toBe(calls[0]?.headers.get('idempotency-key'));
      expect(culqi.threeDS.reset).toHaveBeenCalled();
      expect(outcomes[0]?.status).toBe('confirmed');
    });

    it('reports a failed charge with the gateway message and does not poll', async () => {
      await setup();
      mock = mockApi({
        'POST /public/bookings/*/payments/culqi-charge': () => chargeBody('FAILED', { failureMessage: 'Insufficient funds' }),
      });
      const { root, click, outcomes } = await mount();
      await click('#provider-CULQI');
      await click('#payment-continue');
      culqi.emitToken();
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(root.querySelector('#payment-error')?.textContent).toContain('Insufficient funds');
      expect(outcomes).toHaveLength(0);
      expect(mock.calls.some((call) => call.method === 'GET')).toBe(false);
    });

    it('treats a closed 3DS window as a cancelled attempt', async () => {
      await setup();
      mock = mockApi({
        'POST /public/bookings/*/payments/culqi-charge': () =>
          chargeBody('REQUIRES_ACTION', { action: { type: 'THREE_DS' } }),
      });
      const { root, click, fixture } = await mount();
      await click('#provider-CULQI');
      await click('#payment-continue');
      culqi.emitToken();
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Culqi calls this when the visitor closes the challenge window.
      (culqi.threeDS.options['closeModalAction'] as () => void)();
      await settle(fixture);
      expect(root.querySelector('#payment-error')?.textContent).toContain('verification was cancelled');
      expect(root.querySelector('#payment-continue')).not.toBeNull();

      // A message that arrives after the window was closed must not repeat the charge.
      window.dispatchEvent(new MessageEvent('message', { data: { parameters3DS: { eci: '05' } }, origin: location.origin }));
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(mock?.calls.filter((call) => call.path.endsWith('/culqi-charge'))).toHaveLength(1);
    });
  });

  describe('payment link', () => {
    it('pays against the link token, sends no booking token and ends as pending', async () => {
      await setup({ culqiPublicKey: null });
      mock = mockApi({ 'POST /public/payment-links/*/stripe-intent': () => intent });
      const { root, click, outcomes } = await mount({
        target: { type: 'link', token: 'link-token-1' },
        options: [{ provider: 'STRIPE', kinds: ['FULL'] }],
      });
      await click('#payment-continue');
      await click('#stripe-pay');

      const request = mock.calls[0];
      expect(request?.path).toBe('/public/payment-links/link-token-1/stripe-intent');
      expect(request?.headers.get('x-booking-token')).toBeNull();
      expect(request?.body).toBeUndefined();
      // A link carries no booking token, so the page cannot read the booking back.
      expect(mock.calls.every((call) => call.method === 'POST')).toBe(true);
      expect(outcomes).toEqual([{ status: 'pending' }]);
      expect(root.querySelector('#payment-pending')).not.toBeNull();
    });

    it('charges a Culqi token against the link without a kind', async () => {
      await setup();
      mock = mockApi({
        'POST /public/payment-links/*/culqi-charge': () => ({
          status: 201,
          body: { paymentId: '6f9619ff-8b86-4011-b42d-00c04fc964ff', status: 'SUCCEEDED' },
        }),
      });
      const { click } = await mount({
        target: { type: 'link', token: 'link-token-1' },
        options: [{ provider: 'CULQI', kinds: ['FULL'] }],
      });
      await click('#payment-continue');
      culqi.emitToken();
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(mock.calls[0]?.path).toBe('/public/payment-links/link-token-1/culqi-charge');
      expect(mock.calls[0]?.body).toEqual({ token: 'tkn_test_1', email: 'ana@example.com' });
    });
  });
});
