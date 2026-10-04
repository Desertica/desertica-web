import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DEFAULT_PUBLIC_CONFIG, PUBLIC_CONFIG } from '../config/public-config';
import { AnalyticsService, asCurrency, centsToMajor } from './analytics';
import { ConsentService } from './consent';
import type { DataLayerWindow } from './data-layer';

const layer = (): unknown[] => (window as DataLayerWindow).dataLayer ?? [];
const gtmScripts = (): HTMLScriptElement[] =>
  Array.from(document.head.querySelectorAll<HTMLScriptElement>('script[src*="googletagmanager"]'));

describe('AnalyticsService', () => {
  beforeEach(() => {
    delete (window as DataLayerWindow).dataLayer;
    for (const script of gtmScripts()) {
      script.remove();
    }
  });

  it('loads no container without a GTM id', () => {
    TestBed.inject(AnalyticsService).start();

    expect(gtmScripts()).toHaveLength(0);
  });

  it('loads GTM only after the denied consent default is in the data layer', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: PUBLIC_CONFIG, useValue: { ...DEFAULT_PUBLIC_CONFIG, gtmId: 'GTM-TEST1' } }],
    });
    TestBed.inject(AnalyticsService).start();

    const first = Array.from(layer()[0] as ArrayLike<unknown>);
    expect(first.slice(0, 2)).toEqual(['consent', 'default']);
    expect(layer()[1]).toMatchObject({ event: 'gtm.js' });
    expect(gtmScripts().map((script) => script.src)).toEqual([
      'https://www.googletagmanager.com/gtm.js?id=GTM-TEST1',
    ]);
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
