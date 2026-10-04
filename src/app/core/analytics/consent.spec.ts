import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  CONSENT_POLICY_VERSION,
  CONSENT_STORAGE_KEY,
  ConsentService,
  DENIED_CONSENT,
  consentStateFor,
} from './consent';
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
});
