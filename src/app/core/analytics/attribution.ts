import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject } from '@angular/core';
import { ConsentService } from './consent';

export const ATTRIBUTION_STORAGE_KEY = 'desertica-attribution';

/** Same shape as `Attribution` in the API contract. */
export type Attribution = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  gclid?: string;
  fbclid?: string;
  landingPath?: string;
  referrer?: string;
};

const PARAMS: ReadonlyArray<[string, keyof Attribution]> = [
  ['utm_source', 'utmSource'],
  ['utm_medium', 'utmMedium'],
  ['utm_campaign', 'utmCampaign'],
  ['utm_content', 'utmContent'],
  ['utm_term', 'utmTerm'],
  ['gclid', 'gclid'],
  ['fbclid', 'fbclid'],
];
const MAX_VALUE = 200;

/**
 * First-touch attribution. The first page view of the session is read into memory, but nothing is
 * written to storage unless marketing consent is granted; revoking it erases what was stored.
 */
@Injectable({ providedIn: 'root' })
export class AttributionService {
  private readonly document = inject(DOCUMENT);
  private readonly consent = inject(ConsentService);
  private firstVisit: Attribution | null = null;

  constructor() {
    effect(() => {
      if (this.consent.marketing()) {
        this.persist();
      } else if (this.consent.choice()) {
        this.clear();
      }
    });
  }

  /** Call once on the first page of a visit (browser only). */
  capture(): void {
    const view = this.document.defaultView;
    if (!view || this.firstVisit || this.stored()) {
      return;
    }

    const query = new URL(view.location.href).searchParams;
    const found: Attribution = {};
    for (const [param, key] of PARAMS) {
      const value = query.get(param)?.trim().slice(0, MAX_VALUE);
      if (value) {
        found[key] = value;
      }
    }

    found.landingPath = view.location.pathname.slice(0, MAX_VALUE);
    const referrer = this.document.referrer.slice(0, MAX_VALUE);
    if (referrer) {
      found.referrer = referrer;
    }

    this.firstVisit = found;
  }

  /** Attribution to send with a booking; `null` without marketing consent. */
  current(): Attribution | null {
    return this.consent.marketing() ? (this.stored() ?? this.firstVisit) : null;
  }

  private persist(): void {
    if (!this.firstVisit || this.stored()) {
      return;
    }

    try {
      this.document.defaultView?.localStorage.setItem(
        ATTRIBUTION_STORAGE_KEY,
        JSON.stringify(this.firstVisit),
      );
    } catch {
      // Held in memory for this visit.
    }
  }

  private stored(): Attribution | null {
    try {
      const raw = this.document.defaultView?.localStorage.getItem(ATTRIBUTION_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Attribution) : null;
    } catch {
      return null;
    }
  }

  private clear(): void {
    this.firstVisit = null;
    try {
      this.document.defaultView?.localStorage.removeItem(ATTRIBUTION_STORAGE_KEY);
    } catch {
      // Nothing was stored.
    }
  }
}
