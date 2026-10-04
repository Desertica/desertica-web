import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { AnalyticsService } from '../../core/analytics/analytics';
import { AttributionService } from '../../core/analytics/attribution';
import { ConsentService } from '../../core/analytics/consent';
import { BookingFlow, type BookingSelection } from '../../core/booking/booking-flow';
import { DEPARTURE_ID, LEGAL_DOCUMENTS, LEGAL_IDS, QUOTE, publicBooking } from '../../testing/booking-fixtures';
import { stubMatchMedia } from '../../testing/match-media';
import { mockApi } from '../../testing/mock-api';
import { settle } from '../../testing/settle';
import { Checkout } from './checkout';

const selection = (): BookingSelection => ({
  tourSlug: 'dune-buggy',
  departureId: DEPARTURE_ID,
  startsAt: '2026-12-01T14:00:00.000Z',
  meetingPoint: 'Plaza de Armas, Ica',
  currency: 'USD',
  format: 'PRIVATE',
  language: 'es',
  adults: 2,
  children: 1,
  quote: QUOTE,
});

type CheckoutInternals = { form: Checkout['form'] };

describe('Checkout', () => {
  let mock: ReturnType<typeof mockApi>;
  const track = vi.fn();

  beforeEach(async () => {
    track.mockReset();
    stubMatchMedia(() => false);
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        provideSpartanHlm(),
        { provide: AnalyticsService, useValue: { track } },
      ],
    }).compileComponents();
  });

  afterEach(() => mock?.restore());

  const created = () => ({
    status: 201,
    body: {
      booking: publicBooking(),
      accessToken: 'access-1',
      paymentOptions: [{ provider: 'STRIPE', kinds: ['FULL', 'DEPOSIT'] }],
    },
  });

  const mount = async (routes: Parameters<typeof mockApi>[0] = {}, withHold = true) => {
    mock = mockApi({
      'GET /public/legal-documents/current': () => ({ body: { data: LEGAL_DOCUMENTS } }),
      'POST /public/bookings': created,
      ...routes,
    });
    const flow = TestBed.inject(BookingFlow);
    if (withHold) {
      flow.selection.set(selection());
      flow.hold.set({
        token: 'hold-1',
        departureId: DEPARTURE_ID,
        seats: 3,
        expiresAt: new Date(Date.now() + 600_000).toISOString(),
      });
    }

    const fixture = TestBed.createComponent(Checkout);
    await settle(fixture);
    return { fixture, form: (fixture.componentInstance as unknown as CheckoutInternals).form, flow };
  };

  const fill = (form: Checkout['form'], overrides: { docType?: 'BOLETA' | 'FACTURA'; idDocNumber?: string; idDocType?: 'DNI' | 'RUC' } = {}) => {
    form.controls.customer.patchValue({ firstName: 'Ana', lastName: 'Perez', email: 'ana@example.com', phone: '+51987654321', country: 'PE' });
    form.controls.passengers.controls.forEach((person, index) => person.setValue({ firstName: `Pax${index}`, lastName: 'Perez' }));
    form.controls.billing.patchValue({
      docType: overrides.docType ?? 'BOLETA',
      idDocType: overrides.idDocType ?? 'DNI',
      idDocNumber: overrides.idDocNumber ?? '12345678',
      name: 'Ana Perez',
      address: 'Av. Lima 123',
    });
    form.controls.accept.setValue({ TERMS: true, PRIVACY: true, CANCELLATION: true });
  };

  const submit = async (fixture: { nativeElement: HTMLElement }, ready: Parameters<typeof settle>[0]) => {
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await settle(ready);
  };

  it('asks for a selection first when there is no seat hold', async () => {
    const { fixture } = await mount({}, false);

    expect(fixture.nativeElement.querySelector('#checkout-empty')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });

  it('shows the selection, a countdown and one passenger entry per traveller', async () => {
    const { fixture, form } = await mount();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('#checkout-tour')?.textContent).toContain('Dune buggy');
    expect(root.querySelector('#checkout-total')?.textContent).toContain('$158.00');
    expect(root.querySelector('#checkout-timer')?.textContent).toMatch(/\d\d:\d\d/);
    expect(form.controls.passengers.length).toBe(3);
    expect(root.querySelector('#checkout-tiers')?.textContent).toContain('48 hours before the tour: 100% refund');
    expect(root.textContent).toContain('version 2');
    expect(root.textContent).toContain('version 4');
  });

  it('creates the booking with the legal document versions, billing and an idempotency key', async () => {
    const { fixture, form, flow } = await mount();
    fill(form);
    const router = TestBed.inject(Router);

    await submit(fixture, fixture);

    const call = mock.calls.find((item) => item.path === '/public/bookings');
    expect(call?.headers.get('idempotency-key')).toMatch(/^[0-9a-f-]{36}$/);
    expect(call?.body).toMatchObject({
      holdToken: 'hold-1',
      currency: 'USD',
      adults: 2,
      children: 1,
      customer: { firstName: 'Ana', lastName: 'Perez', email: 'ana@example.com', country: 'PE', locale: 'en' },
      billing: { docType: 'BOLETA', name: 'Ana Perez', idDocType: 'DNI', idDocNumber: '12345678', email: 'ana@example.com' },
      paymentKind: 'FULL',
      acceptedLegalDocumentIds: [LEGAL_IDS.TERMS, LEGAL_IDS.PRIVACY, LEGAL_IDS.CANCELLATION],
      locale: 'en',
    });
    expect((call?.body as { passengers: unknown[] }).passengers).toHaveLength(3);
    expect(call?.body).not.toHaveProperty('attribution');
    expect(call?.body).not.toHaveProperty('turnstileToken');

    expect(router.url).toBe('/checkout/payment/DES-2026-0001');
    expect(flow.hold()).toBeNull();
    expect(flow.remembered('DES-2026-0001')).toEqual({
      accessToken: 'access-1',
      paymentOptions: [{ provider: 'STRIPE', kinds: ['FULL', 'DEPOSIT'] }],
      format: 'PRIVATE',
    });
    expect(track).toHaveBeenCalledWith('begin_checkout', {
      currency: 'USD',
      value: 158,
      items: [expect.objectContaining({ item_id: 'dune-buggy', item_variant: 'PRIVATE', quantity: 3 })],
      event_id: 'DES-2026-0001',
    });
  });

  it('sends attribution only when marketing consent was given', async () => {
    const consent = TestBed.inject(ConsentService);
    consent.init();
    TestBed.inject(AttributionService).capture();
    consent.save({ analytics: true, marketing: true });
    const { fixture, form } = await mount();
    fill(form);

    await submit(fixture, fixture);

    expect(mock.calls.find((item) => item.path === '/public/bookings')?.body).toMatchObject({
      attribution: { landingPath: expect.any(String) },
    });
  });

  it('sends a factura with a RUC and requires an address', async () => {
    const { fixture, form } = await mount();
    fill(form, { docType: 'FACTURA', idDocType: 'RUC', idDocNumber: '20123456789' });
    form.controls.billing.controls.address.setValue('');
    await submit(fixture, fixture);
    expect(mock.calls.some((item) => item.path === '/public/bookings')).toBe(false);

    form.controls.billing.controls.address.setValue('Av. Lima 123');
    await submit(fixture, fixture);
    expect(mock.calls.find((item) => item.path === '/public/bookings')?.body).toMatchObject({
      billing: { docType: 'FACTURA', idDocType: 'RUC', idDocNumber: '20123456789', address: 'Av. Lima 123' },
    });
  });

  it('does not submit with a document number that does not fit its type or unaccepted terms', async () => {
    const { fixture, form } = await mount();
    fill(form, { idDocNumber: '123' });
    await submit(fixture, fixture);
    expect(mock.calls.some((item) => item.path === '/public/bookings')).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('does not match the type');

    fill(form);
    form.controls.accept.controls.PRIVACY.setValue(false);
    await submit(fixture, fixture);
    expect(mock.calls.some((item) => item.path === '/public/bookings')).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('You need to accept this to continue');
  });

  it('refuses to book when the API publishes no legal documents', async () => {
    const { fixture, form } = await mount({ 'GET /public/legal-documents/current': () => ({ body: { data: [] } }) });
    fill(form);
    await submit(fixture, fixture);

    expect(fixture.nativeElement.querySelector('#checkout-legal-error')).not.toBeNull();
    expect(mock.calls.some((item) => item.path === '/public/bookings')).toBe(false);
  });

  it('keeps the same idempotency key after a network failure and drops it after an API answer', async () => {
    let attempt = 0;
    const { fixture, form } = await mount({
      'POST /public/bookings': () => {
        attempt += 1;
        if (attempt === 1) {
          throw new TypeError('offline');
        }
        return attempt === 2
          ? { status: 422, body: { statusCode: 422, error: 'Unprocessable', message: 'bad' } }
          : created();
      },
    });
    fill(form);

    await submit(fixture, fixture);
    await submit(fixture, fixture);
    await submit(fixture, fixture);

    const keys = mock.calls.filter((item) => item.path === '/public/bookings').map((item) => item.headers.get('idempotency-key'));
    expect(keys).toHaveLength(3);
    expect(keys[0]).toBe(keys[1]);
    expect(keys[2]).not.toBe(keys[1]);
  });

  it('tells the visitor when the hold expired or seats were taken', async () => {
    const { fixture, form } = await mount({
      'POST /public/bookings': () => ({ status: 410, body: { statusCode: 410, error: 'Gone', message: 'expired' } }),
    });
    fill(form);
    await submit(fixture, fixture);

    expect(fixture.nativeElement.querySelector('#checkout-error')?.textContent).toContain('hold expired');
  });

  it('replaces the form with a message once the countdown reaches zero', async () => {
    const { fixture, flow } = await mount();
    flow.hold.set({ token: 'hold-1', departureId: DEPARTURE_ID, seats: 3, expiresAt: new Date(Date.now() - 1000).toISOString() });
    await settle(fixture);

    expect(fixture.nativeElement.querySelector('#checkout-expired')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });
});
