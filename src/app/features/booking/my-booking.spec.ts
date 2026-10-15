import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { AnalyticsService } from '../../core/analytics/analytics';
import { BookingFlow } from '../../core/booking/booking-flow';
import { publicBooking } from '../../testing/booking-fixtures';
import { stubMatchMedia } from '../../testing/match-media';
import { mockApi } from '../../testing/mock-api';
import { settle } from '../../testing/settle';
import { MyBooking } from './my-booking';

describe('MyBooking', () => {
  let mock: ReturnType<typeof mockApi> | undefined;
  let harness: RouterTestingHarness;
  const track = vi.fn();

  beforeEach(async () => {
    track.mockReset();
    stubMatchMedia(() => false);
    await TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [
            { path: 'booking', component: MyBooking },
            { path: 'booking/:reference', component: MyBooking },
            { path: 'checkout/payment/:reference', children: [] },
          ],
          withComponentInputBinding(),
        ),
        provideSpartanHlm(),
        { provide: AnalyticsService, useValue: { track } },
      ],
    }).compileComponents();
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => mock?.restore());

  const open = async (url: string, routes: Parameters<typeof mockApi>[0]) => {
    mock = mockApi(routes);
    await harness.navigateByUrl(url);
    for (let round = 0; round < 6; round += 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      harness.detectChanges();
    }
    return harness;
  };

  const confirmed = (paidCents: number) => ({
    'GET /public/bookings/*': () => ({
      body: publicBooking({
        status: 'CONFIRMED',
        paidCents,
        pendingCents: 15800 - paidCents,
        waivers: [{ token: 'w1', passengerName: 'Ana Perez', status: 'PENDING' }],
        documents: [{ docType: 'BOLETA', number: 'B001-00000012', pdfUrl: 'https://files.example/b.pdf' }],
      }),
    }),
  });

  it('opens a booking with the token the e-mailed link carried and removes it from the URL', async () => {
    await open('/booking/DES-2026-0001?token=emailed-token', confirmed(3160));

    expect(mock?.calls[0]?.headers.get('x-booking-token')).toBe('emailed-token');
    expect(TestBed.inject(Router).url).toBe('/booking/DES-2026-0001');
    expect(TestBed.inject(BookingFlow).remembered('DES-2026-0001')?.accessToken).toBe('emailed-token');
    const root = harness.routeNativeElement as HTMLElement;
    expect(root.querySelector('#booking-reference')?.textContent).toBe('DES-2026-0001');
    expect(root.querySelector('#booking-status')?.textContent).toContain('Confirmed');
    expect(root.textContent).toContain('Dune buggy');
    expect(root.textContent).toContain('Plaza de Armas, Ica');
    expect(root.textContent).toContain('Pending');
    expect(root.textContent).toContain('48 hours before the tour: 100% refund');
    expect(root.textContent).toContain('Ana Perez · Pending signature');
    expect(root.querySelector('a[href="https://files.example/b.pdf"]')?.textContent).toBe('B001-00000012');
  });

  it('publishes purchase once per collected amount, with transaction id, value and currency', async () => {
    TestBed.inject(BookingFlow).remember('DES-2026-0001', { accessToken: 't', paymentOptions: [], format: 'PRIVATE' });

    await open('/booking/DES-2026-0001', confirmed(3160));
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('purchase', {
      transaction_id: 'DES-2026-0001',
      currency: 'USD',
      value: 31.6,
      items: [expect.objectContaining({ item_id: 'dune-buggy', item_variant: 'PRIVATE', quantity: 2 })],
      event_id: 'DES-2026-0001',
    });

    mock?.restore();
    await open('/booking', {});
    await open('/booking/DES-2026-0001', confirmed(3160));
    expect(track).toHaveBeenCalledTimes(1);

    mock?.restore();
    await open('/booking', {});
    await open('/booking/DES-2026-0001', confirmed(15800));
    expect(track).toHaveBeenCalledTimes(2);
    expect(track).toHaveBeenLastCalledWith('purchase', expect.objectContaining({ transaction_id: 'DES-2026-0001', value: 126.4, currency: 'USD' }));
  });

  it('does not publish purchase while the booking is unpaid', async () => {
    TestBed.inject(BookingFlow).remember('DES-2026-0001', { accessToken: 't', paymentOptions: [], format: 'SHARED' });
    await open('/booking/DES-2026-0001', { 'GET /public/bookings/*': () => ({ body: publicBooking() }) });

    expect(track).not.toHaveBeenCalled();
  });

  it('offers the way back to payment only for a pending booking this browser can pay', async () => {
    TestBed.inject(BookingFlow).remember('DES-2026-0001', {
      accessToken: 't',
      paymentOptions: [{ provider: 'STRIPE', kinds: ['FULL'] }],
      format: 'SHARED',
    });
    await open('/booking/DES-2026-0001', { 'GET /public/bookings/*': () => ({ body: publicBooking() }) });

    expect(harness.routeNativeElement?.querySelector('a[href="/checkout/payment/DES-2026-0001"]')).not.toBeNull();
  });

  it('asks for a new link when the token is rejected and answers the same either way', async () => {
    TestBed.inject(BookingFlow).remember('DES-2026-0001', { accessToken: 'stale', paymentOptions: [], format: 'SHARED' });
    await open('/booking/DES-2026-0001', {
      'GET /public/bookings/*': () => ({ status: 401, body: { statusCode: 401, error: 'Unauthorized', message: 'no' } }),
      'POST /public/bookings/access': () => ({ status: 202 }),
    });
    const root = harness.routeNativeElement as HTMLElement;

    expect(root.querySelector('#booking-denied')).not.toBeNull();
    expect((root.querySelector('#access-reference') as HTMLInputElement).value).toBe('DES-2026-0001');

    const email = root.querySelector('#access-email') as HTMLInputElement;
    email.value = 'ana@example.com';
    email.dispatchEvent(new Event('input'));
    (root.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    for (let round = 0; round < 6; round += 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      harness.detectChanges();
    }

    const request = mock?.calls.find((call) => call.path === '/public/bookings/access');
    expect(request?.body).toEqual({ reference: 'DES-2026-0001', email: 'ana@example.com' });
    expect(root.querySelector('#booking-sent')).not.toBeNull();
  });

  it('shows the access form on /booking and validates it', async () => {
    await open('/booking', {});
    const root = harness.routeNativeElement as HTMLElement;

    (root.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    harness.detectChanges();
    expect(root.textContent).toContain('This field is required');
    expect(mock?.calls).toHaveLength(0);
  });
});
