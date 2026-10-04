import { TestBed } from '@angular/core/testing';
import { ATTRIBUTION_STORAGE_KEY, AttributionService } from './attribution';
import { ConsentService } from './consent';
import type { DataLayerWindow } from './data-layer';

describe('AttributionService', () => {
  beforeEach(() => {
    delete (window as DataLayerWindow).dataLayer;
    history.replaceState({}, '', '/tours?utm_source=ig&utm_medium=social&utm_campaign=sunset&gclid=G1&fbclid=F1');
  });

  afterEach(() => history.replaceState({}, '', '/'));

  const setup = () => {
    const consent = TestBed.inject(ConsentService);
    consent.init();
    const attribution = TestBed.inject(AttributionService);
    attribution.capture();
    return { consent, attribution };
  };

  it('stores nothing and exposes nothing without marketing consent', () => {
    const { consent, attribution } = setup();
    consent.save({ analytics: true, marketing: false });
    TestBed.tick();

    expect(localStorage.getItem(ATTRIBUTION_STORAGE_KEY)).toBeNull();
    expect(attribution.current()).toBeNull();
  });

  it('keeps the first visit and saves it once marketing is granted', () => {
    const { consent, attribution } = setup();
    expect(localStorage.getItem(ATTRIBUTION_STORAGE_KEY)).toBeNull();

    consent.acceptAll();
    TestBed.tick();

    const stored = JSON.parse(localStorage.getItem(ATTRIBUTION_STORAGE_KEY) ?? '{}');
    expect(stored).toMatchObject({
      utmSource: 'ig',
      utmMedium: 'social',
      utmCampaign: 'sunset',
      gclid: 'G1',
      fbclid: 'F1',
      landingPath: '/tours',
    });
    expect(attribution.current()).toMatchObject({ utmSource: 'ig', gclid: 'G1' });
  });

  it('does not overwrite the first touch on a later visit', () => {
    localStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify({ utmSource: 'first', landingPath: '/' }));
    const { consent, attribution } = setup();
    consent.acceptAll();
    TestBed.tick();

    expect(attribution.current()).toEqual({ utmSource: 'first', landingPath: '/' });
  });

  it('erases the stored attribution when marketing consent is withdrawn', () => {
    const { consent, attribution } = setup();
    consent.acceptAll();
    TestBed.tick();
    expect(localStorage.getItem(ATTRIBUTION_STORAGE_KEY)).not.toBeNull();

    consent.save({ analytics: true, marketing: false });
    TestBed.tick();

    expect(localStorage.getItem(ATTRIBUTION_STORAGE_KEY)).toBeNull();
    expect(attribution.current()).toBeNull();
  });
});
