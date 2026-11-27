import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DEFAULT_PUBLIC_CONFIG, PUBLIC_CONFIG } from '../config/public-config';
import { AnalyticsService, asCurrency, centsToMajor } from './analytics';
import { isCredentialUrl } from './gtm';
import { CONSENT_POLICY_VERSION, CONSENT_STORAGE_KEY, ConsentService } from './consent';
import type { DataLayerWindow } from './data-layer';

const layer = (): unknown[] => (window as DataLayerWindow).dataLayer ?? [];
const gtmScripts = (): HTMLScriptElement[] =>
  Array.from(document.head.querySelectorAll<HTMLScriptElement>('script[src*="googletagmanager"]'));

describe('AnalyticsService', () => {
  beforeEach(() => {
    delete (window as DataLayerWindow).dataLayer;
    localStorage.clear();
    for (const script of gtmScripts()) {
      script.remove();
    }
  });

  it('loads no container without a GTM id', () => {
    TestBed.inject(AnalyticsService).start();

    expect(gtmScripts()).toHaveLength(0);
  });

  it('fetches nothing from Google until the visitor accepts, then loads GTM without a reload', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: PUBLIC_CONFIG, useValue: { ...DEFAULT_PUBLIC_CONFIG, gtmId: 'GTM-TEST1' } }],
    });
    TestBed.inject(AnalyticsService).start();
    TestBed.tick();
    expect(gtmScripts()).toHaveLength(0);

    TestBed.inject(ConsentService).save({ analytics: true, marketing: false });
    TestBed.tick();

    const commands = layer().map((entry) => Array.from(entry as ArrayLike<unknown>).slice(0, 2));
    expect(commands[0]).toEqual(['consent', 'default']);
    expect(commands[1]).toEqual(['consent', 'update']);
    expect(layer()[2]).toMatchObject({ event: 'gtm.js' });
    expect(gtmScripts().map((script) => script.src)).toEqual([
      'https://www.googletagmanager.com/gtm.js?id=GTM-TEST1',
    ]);
  });

  it('keeps GTM off when the visitor rejects, and loads it for marketing alone', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: PUBLIC_CONFIG, useValue: { ...DEFAULT_PUBLIC_CONFIG, gtmId: 'GTM-TEST1' } }],
    });
    TestBed.inject(AnalyticsService).start();
    const consent = TestBed.inject(ConsentService);

    consent.rejectAll();
    TestBed.tick();
    expect(gtmScripts()).toHaveLength(0);

    consent.save({ analytics: false, marketing: true });
    TestBed.tick();
    expect(gtmScripts()).toHaveLength(1);
  });

  it('loads GTM on start when an earlier visit already accepted', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: PUBLIC_CONFIG, useValue: { ...DEFAULT_PUBLIC_CONFIG, gtmId: 'GTM-TEST1' } }],
    });
    localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({ analytics: true, marketing: true, version: CONSENT_POLICY_VERSION, decidedAt: '2026-01-01' }),
    );
    TestBed.inject(AnalyticsService).start();
    TestBed.tick();

    expect(gtmScripts()).toHaveLength(1);
  });

  it('keeps the container off pages whose URL carries a credential from an e-mailed link', () => {
    expect(isCredentialUrl({ pathname: '/pay/abc', search: '' })).toBe(true);
    expect(isCredentialUrl({ pathname: '/waiver/abc', search: '' })).toBe(true);
    expect(isCredentialUrl({ pathname: '/booking/DES-1', search: '?token=abc' })).toBe(true);
    expect(isCredentialUrl({ pathname: '/es/tours/dune-buggy', search: '?preview=1.abc' })).toBe(true);
    expect(isCredentialUrl({ pathname: '/booking/DES-1', search: '' })).toBe(false);
    expect(isCredentialUrl({ pathname: '/tours/dune-buggy', search: '?lang=es' })).toBe(false);

    TestBed.configureTestingModule({
      providers: [{ provide: PUBLIC_CONFIG, useValue: { ...DEFAULT_PUBLIC_CONFIG, gtmId: 'GTM-TEST1' } }],
    });
    window.history.pushState({}, '', '/booking/DES-1?token=abc');
    try {
      TestBed.inject(AnalyticsService).start();
      TestBed.inject(ConsentService).acceptAll();
      TestBed.tick();
      expect(gtmScripts()).toHaveLength(0);
    } finally {
      window.history.pushState({}, '', '/');
    }
  });

  it('does not grant anything by itself: tags stay blocked until the visitor consents', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: PUBLIC_CONFIG, useValue: { ...DEFAULT_PUBLIC_CONFIG, gtmId: 'GTM-TEST1' } }],
    });
    const analytics = TestBed.inject(AnalyticsService);
    analytics.start();
    analytics.track('generate_lead', { form: 'contact' });

    const consentCommands = layer()
      .filter((entry) => Object.prototype.toString.call(entry) === '[object Arguments]')
      .map((entry) => Array.from(entry as ArrayLike<unknown>));
    expect(consentCommands).toHaveLength(1);
    expect(consentCommands[0]?.[1]).toBe('default');
    expect(TestBed.inject(ConsentService).analytics()).toBe(false);
    expect(TestBed.inject(ConsentService).marketing()).toBe(false);
  });

  it('publishes a purchase with transaction id, value and currency', () => {
    const analytics = TestBed.inject(AnalyticsService);
    analytics.start();
    analytics.track('purchase', {
      transaction_id: 'DES-2026-0001',
      currency: 'USD',
      value: centsToMajor(12350),
      items: [{ item_id: 'dune-buggy', item_name: 'Dune buggy', item_variant: 'SHARED' }],
      event_id: 'DES-2026-0001',
    });

    expect(layer().at(-1)).toEqual({
      event: 'purchase',
      transaction_id: 'DES-2026-0001',
      currency: 'USD',
      value: 123.5,
      items: [{ item_id: 'dune-buggy', item_name: 'Dune buggy', item_variant: 'SHARED' }],
      event_id: 'DES-2026-0001',
    });
  });

  it('publishes the other events with the documented parameters only', () => {
    const analytics = TestBed.inject(AnalyticsService);
    analytics.start();
    analytics.track('click_whatsapp', { placement: 'floating_button' });
    analytics.track('cancel_booking', { transaction_id: 'DES-1' });
    analytics.track('add_payment_info', {
      currency: 'PEN',
      value: 80,
      payment_type: 'culqi',
      event_id: 'DES-1',
    });

    expect(layer().slice(-3)).toEqual([
      { event: 'click_whatsapp', placement: 'floating_button' },
      { event: 'cancel_booking', transaction_id: 'DES-1' },
      { event: 'add_payment_info', currency: 'PEN', value: 80, payment_type: 'culqi', event_id: 'DES-1' },
    ]);
  });

  it('publishes nothing while rendering on the server', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: PUBLIC_CONFIG, useValue: { ...DEFAULT_PUBLIC_CONFIG, gtmId: 'GTM-TEST1' } },
      ],
    });
    const analytics = TestBed.inject(AnalyticsService);
    analytics.start();
    analytics.track('generate_lead', { form: 'contact' });

    expect((window as DataLayerWindow).dataLayer).toBeUndefined();
    expect(gtmScripts()).toHaveLength(0);
  });

  it('converts cents to major units and narrows the currency', () => {
    expect(centsToMajor(7900)).toBe(79);
    expect(centsToMajor(12399)).toBe(123.99);
    expect(asCurrency('pen')).toBe('PEN');
    expect(asCurrency('EUR')).toBe('USD');
  });
});
