import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import type { PaymentLinkInfo } from '../../core/api/booking-api';
import { AnalyticsService } from '../../core/analytics/analytics';
import { DEFAULT_PUBLIC_CONFIG, PUBLIC_CONFIG } from '../../core/config/public-config';
import { stubMatchMedia } from '../../testing/match-media';
import { mockApi } from '../../testing/mock-api';
import { settle } from '../../testing/settle';
import { PayLink } from './pay-link';

const INFO: PaymentLinkInfo = {
  reference: 'DES-2026-0001',
  tourSlug: 'dune-buggy',
  startsAt: '2026-12-01T14:00:00.000Z',
  kind: 'BALANCE',
  currency: 'USD',
  amountCents: 12640,
  expiresAt: '2026-11-30T00:00:00.000Z',
  paymentOptions: ['STRIPE', 'CULQI'],
};

describe('PayLink', () => {
  let mock: ReturnType<typeof mockApi> | undefined;

  beforeEach(async () => {
    stubMatchMedia(() => false);
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideSpartanHlm(),
        { provide: AnalyticsService, useValue: { track: vi.fn() } },
        { provide: PUBLIC_CONFIG, useValue: { ...DEFAULT_PUBLIC_CONFIG, culqiPublicKey: 'pk_test_abc' } },
      ],
    }).compileComponents();
  });

  afterEach(() => mock?.restore());

  const mount = async (routes: Parameters<typeof mockApi>[0]) => {
    mock = mockApi(routes);
    const fixture = TestBed.createComponent(PayLink);
    fixture.componentRef.setInput('token', 'link-token-1');
    await settle(fixture);
    return fixture.nativeElement as HTMLElement;
  };

  it('shows the amount the link was issued for and lets the visitor pick only the gateway', async () => {
    const root = await mount({ 'GET /public/payment-links/*': () => ({ body: INFO }) });

    expect(mock?.calls[0]?.path).toBe('/public/payment-links/link-token-1');
    expect(root.querySelector('#pay-reference')?.textContent).toBe('DES-2026-0001');
    expect(root.querySelector('#pay-amount')?.textContent).toBe('$126.40');
    expect(root.textContent).toContain('Remaining balance');
    expect(root.textContent).toContain('Dune buggy');
    expect(root.textContent).toContain('Apple Pay, Google Pay or card (USD)');
    // One kind only, so there is no deposit/full choice.
    expect(root.querySelector('[name="payment-kind"]')).toBeNull();
  });

  it('explains an expired link and an unknown one', async () => {
    const gone = await mount({ 'GET /public/payment-links/*': () => ({ status: 410, body: { message: 'gone' } }) });
    expect(gone.querySelector('#pay-gone')).not.toBeNull();
    mock?.restore();
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      providers: [provideRouter([]), provideSpartanHlm(), { provide: AnalyticsService, useValue: { track: vi.fn() } }],
    }).compileComponents();
    const missing = await mount({ 'GET /public/payment-links/*': () => ({ status: 404, body: { message: 'no' } }) });
    expect(missing.querySelector('#pay-missing')).not.toBeNull();
  });
});
