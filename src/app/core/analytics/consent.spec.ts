import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  CONSENT_POLICY_VERSION,
  CONSENT_STORAGE_KEY,
  ConsentService,
  DENIED_CONSENT,
  consentStateFor,
} from './consent';
import { DEFAULT_PUBLIC_CONFIG, PUBLIC_CONFIG } from '../config/public-config';
import { mockApi } from '../../testing/mock-api';
import type { DataLayerWindow } from './data-layer';

const layer = (): unknown[] => (window as DataLayerWindow).dataLayer ?? [];
/** `gtag()` pushes `arguments`, which GTM tells apart from a plain array. */
const commands = (): unknown[][] =>
  layer()
    .filter((entry) => Object.prototype.toString.call(entry) === '[object Arguments]')
    .map((entry) => Array.from(entry as ArrayLike<unknown>));

describe('ConsentService', () => {
  beforeEach(() => {
    delete (window as DataLayerWindow).dataLayer;
  });

  it('denies every signal by default and shows the banner only after reveal', () => {
    const consent = TestBed.inject(ConsentService);
    consent.init();

    const [first] = commands();
    expect(first?.[0]).toBe('consent');
    expect(first?.[1]).toBe('default');
    const defaults = first?.[2] as Record<string, string>;
    for (const value of Object.values(DENIED_CONSENT)) {
      expect(value).toBe('denied');
    }
    expect(defaults['ad_storage']).toBe('denied');
    expect(defaults['ad_user_data']).toBe('denied');
    expect(defaults['ad_personalization']).toBe('denied');
    expect(defaults['analytics_storage']).toBe('denied');
    expect(commands()).toHaveLength(1);
    expect(consent.analytics()).toBe(false);
    expect(consent.marketing()).toBe(false);
    expect(consent.bannerOpen()).toBe(false);

    consent.reveal();
    expect(consent.bannerOpen()).toBe(true);
  });

  it('grants only what the visitor accepted and remembers it', () => {
    const consent = TestBed.inject(ConsentService);
    consent.init();
    consent.reveal();
    consent.save({ analytics: true, marketing: false });

    const update = commands().at(-1) as [string, string, Record<string, string>];
    expect(update.slice(0, 2)).toEqual(['consent', 'update']);
    expect(update[2]['analytics_storage']).toBe('granted');
    expect(update[2]['ad_storage']).toBe('denied');
    expect(update[2]['ad_user_data']).toBe('denied');
    expect(update[2]['ad_personalization']).toBe('denied');
    expect(consent.bannerOpen()).toBe(false);
    expect(JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY) ?? '{}')).toMatchObject({
      analytics: true,
      marketing: false,
      version: CONSENT_POLICY_VERSION,
    });
  });

  it('replays a stored choice after the denied default on the next visit', () => {
    localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({
        analytics: true,
        marketing: true,
        version: CONSENT_POLICY_VERSION,
        decidedAt: '2026-01-01T00:00:00.000Z',
      }),
    );
    const consent = TestBed.inject(ConsentService);
    consent.init();
    consent.reveal();

    expect(commands().map((command) => command[1])).toEqual(['default', 'update']);
    expect(consent.marketing()).toBe(true);
    expect(consent.bannerOpen()).toBe(false);
  });

  it('asks again when the policy version changed or storage is corrupt', () => {
    localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({ analytics: true, marketing: true, version: CONSENT_POLICY_VERSION - 1 }),
    );
    const consent = TestBed.inject(ConsentService);
    consent.init();
    consent.reveal();

    expect(consent.choice()).toBeNull();
    expect(commands()).toHaveLength(1);
    expect(consent.bannerOpen()).toBe(true);
  });

  it('lets the visitor reopen the preferences from the footer', () => {
    const consent = TestBed.inject(ConsentService);
    consent.init();
    consent.reveal();
    consent.rejectAll();
    expect(consent.bannerOpen()).toBe(false);

    consent.openPreferences();
    expect(consent.bannerOpen()).toBe(true);
    consent.closePreferences();
    expect(consent.bannerOpen()).toBe(false);
  });

  it('maps rejecting everything to denied advertising and analytics signals', () => {
    const state = consentStateFor({ analytics: false, marketing: false });
    expect(state.analytics_storage).toBe('denied');
    expect(state.ad_storage).toBe('denied');
    expect(consentStateFor(null)).toEqual(DENIED_CONSENT);
  });

  it('does nothing on the server', () => {
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    TestBed.inject(ConsentService).init();

    expect((window as DataLayerWindow).dataLayer).toBeUndefined();
  });

  describe('anonymous id', () => {
    it('is created with the first decision, survives later ones and a reload', () => {
      const consent = TestBed.inject(ConsentService);
      consent.init();
      expect(consent.anonymousId()).toBeNull();

      consent.acceptAll();
      const id = consent.anonymousId();
      expect(id).toMatch(/^[0-9a-f-]{36}$/);
      consent.rejectAll();
      expect(consent.anonymousId()).toBe(id);

      TestBed.resetTestingModule();
      const again = TestBed.inject(ConsentService);
      again.init();
      expect(again.anonymousId()).toBe(id);
    });

    it('is filed in the API with the choice, only while the booking engine is on', async () => {
      const mock = mockApi({ 'POST /public/consents': () => ({ status: 204 }) });
      try {
        TestBed.inject(ConsentService).acceptAll();
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(mock.calls).toHaveLength(0);

        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
          providers: [{ provide: PUBLIC_CONFIG, useValue: { ...DEFAULT_PUBLIC_CONFIG, bookingEngineEnabled: true } }],
        });
        const consent = TestBed.inject(ConsentService);
        consent.save({ analytics: true, marketing: false });
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(mock.calls[0]?.body).toEqual({
          anonymousId: consent.anonymousId(),
          categories: { analytics: true, marketing: false },
          policyVersion: CONSENT_POLICY_VERSION,
        });
      } finally {
        mock.restore();
      }
    });
  });
});
