import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { AnalyticsService } from '../../core/analytics/analytics';
import { BookingFlow } from '../../core/booking/booking-flow';
import { publicBooking } from '../../testing/booking-fixtures';
import { stubMatchMedia } from '../../testing/match-media';
import { mockApi } from '../../testing/mock-api';
import { settle } from '../../testing/settle';
import { CheckoutPayment } from './checkout-payment';

type PaymentInternals = { onProvider: (value: unknown) => void; onKind: (value: unknown) => void };

describe('CheckoutPayment', () => {
  let mock: ReturnType<typeof mockApi> | undefined;
  const track = vi.fn();

  beforeEach(async () => {
    track.mockReset();
    stubMatchMedia(() => false);
    await TestBed.configureTestingModule({
      providers: [provideRouter([]), provideSpartanHlm(), { provide: AnalyticsService, useValue: { track } }],
    }).compileComponents();
  });

  afterEach(() => mock?.restore());

  const mount = async (remember = true) => {
    mock = mockApi({ 'GET /public/bookings/*': () => ({ body: publicBooking() }) });
    if (remember) {
      TestBed.inject(BookingFlow).remember('DES-2026-0001', {
        accessToken: 'access-1',
        format: 'SHARED',
        paymentOptions: [
          { provider: 'STRIPE', kinds: ['FULL', 'DEPOSIT'] },
          { provider: 'CULQI', kinds: ['FULL'] },
        ],
      });
    }

    const fixture = TestBed.createComponent(CheckoutPayment);
    fixture.componentRef.setInput('reference', 'DES-2026-0001');
    await settle(fixture);
    return fixture;
  };

  it('lists the gateways the API offered for the booking currency and its amounts', async () => {
    const fixture = await mount();
    const root = fixture.nativeElement as HTMLElement;

    expect(mock?.calls[0]?.headers.get('x-booking-token')).toBe('access-1');
    expect(root.querySelector('#payment-reference')?.textContent).toBe('DES-2026-0001');
    expect(root.textContent).toContain('Card (Stripe, USD)');
    expect(root.textContent).toContain('Card or wallet (Culqi)');
    expect(root.textContent).toContain('Full amount · $158.00');
    expect(root.textContent).toContain('Deposit · $31.60');
  });

  it('reports the chosen method and shows the placeholder, without paying anything', async () => {
    const fixture = await mount();
    (fixture.nativeElement.querySelector('#payment-continue') as HTMLButtonElement).click();
    await settle(fixture);

    expect(track).toHaveBeenCalledWith('add_payment_info', {
      currency: 'USD',
      value: 158,
      payment_type: 'stripe',
      event_id: 'DES-2026-0001',
    });
    expect(fixture.nativeElement.querySelector('#payment-placeholder')).not.toBeNull();
    expect(mock?.calls.every((call) => call.method === 'GET')).toBe(true);
  });

  it('follows the gateway: Culqi has no deposit here, and a deposit pays the deposit amount', async () => {
    const fixture = await mount();
    const internals = fixture.componentInstance as unknown as PaymentInternals;

    internals.onKind('DEPOSIT');
    await settle(fixture);
    (fixture.nativeElement.querySelector('#payment-continue') as HTMLButtonElement).click();
    expect(track).toHaveBeenLastCalledWith('add_payment_info', expect.objectContaining({ value: 31.6, payment_type: 'stripe' }));

    internals.onProvider('CULQI');
    await settle(fixture);
    expect(fixture.nativeElement.querySelector('#payment-placeholder')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Deposit · ');
    (fixture.nativeElement.querySelector('#payment-continue') as HTMLButtonElement).click();
    expect(track).toHaveBeenLastCalledWith('add_payment_info', expect.objectContaining({ value: 158, payment_type: 'culqi' }));
  });

  it('points to "my booking" when this browser does not know the booking', async () => {
    const fixture = await mount(false);

    expect(fixture.nativeElement.querySelector('#payment-missing')).not.toBeNull();
    expect(mock?.calls).toHaveLength(0);
  });
});
