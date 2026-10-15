import { DOCUMENT } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { BookingApi } from '../api/booking-api';
import { PUBLIC_CONFIG } from '../config/public-config';
import { type ConsentState, dataLayerOf, gtagFor } from './data-layer';

/** Bump when the cookie categories or their purposes change, so everyone is asked again. */
export const CONSENT_POLICY_VERSION = 1;
export const CONSENT_STORAGE_KEY = 'desertica-consent';

export type ConsentChoice = { analytics: boolean; marketing: boolean };

type StoredConsent = ConsentChoice & {
  version: number;
  decidedAt: string;
  /** Random id that links this browser's consent record in the API to a booking made later. */
  anonymousId?: string;
};

export const DENIED_CONSENT: ConsentState = {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'denied',
  functionality_storage: 'denied',
  personalization_storage: 'denied',
  security_storage: 'denied',
};

/** Maps the three banner categories (necessary is implicit) onto Consent Mode v2 signals. */
export function consentStateFor(choice: ConsentChoice | null): ConsentState {
  if (!choice) {
    return DENIED_CONSENT;
  }

  const marketing = choice.marketing ? 'granted' : 'denied';
  return {
    ad_storage: marketing,
    ad_user_data: marketing,
    ad_personalization: marketing,
    analytics_storage: choice.analytics ? 'granted' : 'denied',
    functionality_storage: 'granted',
    personalization_storage: 'denied',
    security_storage: 'granted',
  };
}

/**
 * Cookie consent. Nothing is granted until the visitor decides: the default Consent Mode state is
 * denied for every signal, and `init()` only runs in the browser. The choice is stored in
 * localStorage and applies again on the next visit unless the policy version changed.
 */
@Injectable({ providedIn: 'root' })
export class ConsentService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly api = inject(BookingApi);
  private readonly engine = inject(PUBLIC_CONFIG).bookingEngineEnabled;
  private readonly decision = signal<ConsentChoice | null>(null);
  private readonly ready = signal(false);
  private readonly preferences = signal(false);
  private layer: unknown[] | null = null;
  private memoryOnly: StoredConsent | null = null;

  private readonly visitor = signal<string | null>(null);

  readonly choice = this.decision.asReadonly();
  /** Id of the stored consent, sent with a booking so the API can tell whether marketing was allowed. */
  readonly anonymousId = this.visitor.asReadonly();
  readonly analytics = computed(() => this.decision()?.analytics === true);
  readonly marketing = computed(() => this.decision()?.marketing === true);
  /** The banner shows until the visitor decides, and again whenever they ask for preferences. */
  readonly bannerOpen = computed(
    () => this.ready() && (this.decision() === null || this.preferences()),
  );

  /** Browser only. Pushes the denied default first, then replays a stored choice. */
  init(): void {
    this.layer = dataLayerOf(this.document, this.platformId);
    if (!this.layer) {
      return;
    }

    gtagFor(this.layer)('consent', 'default', { ...DENIED_CONSENT, wait_for_update: 500 });
    const stored = this.read();
    if (stored) {
      this.decision.set({ analytics: stored.analytics, marketing: stored.marketing });
      this.visitor.set(stored.anonymousId ?? null);
      this.update(stored);
    }
  }

  /** Lets the banner render. Called after the first client render so hydration sees the server DOM. */
  reveal(): void {
    this.ready.set(true);
  }

  acceptAll(): void {
    this.save({ analytics: true, marketing: true });
  }

  rejectAll(): void {
    this.save({ analytics: false, marketing: false });
  }

  save(choice: ConsentChoice): void {
    const stored: StoredConsent = {
      analytics: choice.analytics,
      marketing: choice.marketing,
      version: CONSENT_POLICY_VERSION,
      decidedAt: new Date().toISOString(),
      anonymousId: this.visitor() ?? crypto.randomUUID(),
    };
    this.write(stored);
    this.visitor.set(stored.anonymousId ?? null);
    this.record(stored);
    this.decision.set({ analytics: stored.analytics, marketing: stored.marketing });
    this.preferences.set(false);
    this.update(stored);
  }

  openPreferences(): void {
    this.preferences.set(true);
  }

  closePreferences(): void {
    this.preferences.set(false);
  }

  /** With the booking engine on, the choice is also filed in the API (best effort, no retry). */
  private record(stored: StoredConsent): void {
    if (this.engine && stored.anonymousId) {
      void this.api.recordConsent({
        anonymousId: stored.anonymousId,
        categories: { analytics: stored.analytics, marketing: stored.marketing },
        policyVersion: stored.version,
      });
    }
  }

  private update(choice: ConsentChoice): void {
    if (this.layer) {
      gtagFor(this.layer)('consent', 'update', consentStateFor(choice));
    }
  }

  private read(): StoredConsent | null {
    try {
      const raw = this.document.defaultView?.localStorage.getItem(CONSENT_STORAGE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : this.memoryOnly;
      if (isStoredConsent(parsed) && parsed.version === CONSENT_POLICY_VERSION) {
        return parsed;
      }
    } catch {
      // Blocked or corrupt storage counts as "no decision yet".
    }

    return null;
  }

  private write(stored: StoredConsent): void {
    this.memoryOnly = stored;
    try {
      this.document.defaultView?.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(stored));
    } catch {
      // The choice still holds for this page view.
    }
  }
}

function isStoredConsent(value: unknown): value is StoredConsent {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate['analytics'] === 'boolean' &&
    typeof candidate['marketing'] === 'boolean' &&
    typeof candidate['version'] === 'number'
  );
}
