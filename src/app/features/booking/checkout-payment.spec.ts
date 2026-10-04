import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { AnalyticsService } from '../../core/analytics/analytics';
import { BookingFlow } from '../../core/booking/booking-flow';
import { DEFAULT_PUBLIC_CONFIG, PUBLIC_CONFIG } from '../../core/config/public-config';
import { StripeLoader } from '../../core/payments/stripe-loader';
import { publicBooking } from '../../testing/booking-fixtures';
import { stubMatchMedia } from '../../testing/match-media';
import { mockApi } from '../../testing/mock-api';
import { settle } from '../../testing/settle';
import { PAYMENT_POLLING } from '../payment/payment-step';
import { CheckoutPayment } from './checkout-payment';

describe('CheckoutPayment', () => {
  let mock: ReturnType<typeof mockApi> | undefined;
  const track = vi.fn();
  const confirmPayment = vi.fn(async () => ({ paymentIntent: { status: 'succeeded' } }));
  const mounted = { mount: vi.fn(), destroy: vi.fn(), on: vi.fn() };

  beforeEach(async () => {
    track.mockReset();
    stubMatchMedia(() => false);
    const element = { ...mounted, on: vi.fn(() => element) };
    const stripe = { elements: () => ({ create: () => element }), confirmPayment };
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideSpartanHlm(),
        { provide: AnalyticsService, useValue: { track } },
        { provide: PUBLIC_CONFIG, useValue: { ...DEFAULT_PUBLIC_CONFIG, culqiPublicKey: 'pk_test_abc' } },
        { provide: StripeLoader, useValue: { load: async () => stripe } },
        { provide: PAYMENT_POLLING, useValue: { intervalMs: 1, timeoutMs: 40 } },
      ],
    }).compileComponents();
  });

  afterEach(() => mock?.restore());

  const mount = async (routes: Parameters<typeof mockApi>[0] = {}, remember = true) => {
    mock = mockApi({ 'GET /public/bookings/*': () => ({ body: publicBooking() }), ...routes });
    if (remember) {
      TestBed.inject(BookingFlow).remember('DES-2026-0001', { accessToken: 'access-1' });
    }

    const fixture = TestBed.createComponent(CheckoutPayment);
    fixture.componentRef.setInput('reference', 'DES-2026-0001');
    await settle(fixture);
    return fixture;
  };

  it('reads the booking back and offers the gateways and amounts the API returned', async () => {
    const fixture = await mount();
    const root = fixture.nativeElement as HTMLElement;

    expect(mock?.calls[0]?.headers.get('x-booking-token')).toBe('access-1');
    expect(root.querySelector('#payment-reference')?.textContent).toBe('DES-2026-0001');
    expect(root.textContent).toContain('Apple Pay, Google Pay or card (USD)');
    expect(root.textContent).toContain('Card (Culqi)');
    // The deposit is the API's number, not a rate computed here.
    expect(root.textContent).toContain('Full amount · $158.00');
    expect(root.textContent).toContain('Deposit · $31.60');
  });

  it('pays, waits for the API to report it, then publishes purchase once with the numbered id', async () => {
    let reads = 0;
    const fixture = await mount({
      'GET /public/bookings/*': () => ({
        body: reads++ < 1 ? publicBooking() : publicBooking({ status: 'CONFIRMED', paidCents: 3160, pendingCents: 12640 }),
      }),
      'POST /public/bookings/*/payments/stripe-intent': () => ({
        status: 201,
        body: { paymentId: '6f9619ff-8b86-4011-b42d-00c04fc964ff', clientSecret: 's', publishableKey: 'pk', amountCents: 3160, currency: 'USD' },
      }),
    });
    const root = fixture.nativeElement as HTMLElement;

    (root.querySelector('#kind-DEPOSIT') as HTMLElement).click();
    await settle(fixture);
    (root.querySelector('#payment-continue') as HTMLButtonElement).click();
    await settle(fixture, 10);
    (root.querySelector('#stripe-pay') as HTMLButtonElement).click();
    await new Promise((resolve) => setTimeout(resolve, 30));
    await settle(fixture);

    expect(confirmPayment).toHaveBeenCalled();
    expect(root.querySelector('#payment-success')).not.toBeNull();
    const purchases = track.mock.calls.filter(([event]) => event === 'purchase');
    expect(purchases).toHaveLength(1);
    expect(purchases[0]?.[1]).toMatchObject({
      transaction_id: 'DES-2026-0001-1',
      event_id: 'DES-2026-0001-1',
      value: 31.6,
      currency: 'USD',
    });
  });

  it('does not publish purchase when the API has not confirmed the payment', async () => {
    const fixture = await mount({
      'POST /public/bookings/*/payments/stripe-intent': () => ({
        status: 201,
        body: { paymentId: '6f9619ff-8b86-4011-b42d-00c04fc964ff', clientSecret: 's', publishableKey: 'pk', amountCents: 15800, currency: 'USD' },
      }),
    });
    const root = fixture.nativeElement as HTMLElement;

    (root.querySelector('#payment-continue') as HTMLButtonElement).click();
    await settle(fixture, 10);
    (root.querySelector('#stripe-pay') as HTMLButtonElement).click();
    await new Promise((resolve) => setTimeout(resolve, 80));
    await settle(fixture);

    expect(root.querySelector('#payment-pending')).not.toBeNull();
    expect(track.mock.calls.some(([event]) => event === 'purchase')).toBe(false);
  });

  it('has nothing to pay once the booking is settled', async () => {
    const fixture = await mount({
      'GET /public/bookings/*': () => ({
        body: publicBooking({ status: 'CONFIRMED', paidCents: 15800, pendingCents: 0, paymentOptions: [] }),
      }),
    });

    expect(fixture.nativeElement.querySelector('#payment-settled')).not.toBeNull();
  });

  it('points to "my booking" when this browser does not know the booking', async () => {
    const fixture = await mount({}, false);

    expect(fixture.nativeElement.querySelector('#payment-missing')).not.toBeNull();
    expect(mock?.calls).toHaveLength(0);
  });
});
