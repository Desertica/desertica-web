import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, InjectionToken, PLATFORM_ID, inject } from '@angular/core';
import createClient, { type Client } from 'openapi-fetch';
import type { paths } from './schema';

/**
 * Origin of desertica-api (`API_URL`, no `/api`). Provided on the server only: the browser reaches
 * the API through the Express proxy at `/api/public/*` and never learns this URL.
 */
export const API_URL = new InjectionToken<string | null>('API_URL', {
  providedIn: 'root',
  factory: () => null,
});

/**
 * Typed client for `openapi/openapi.yaml`. On the server it talks to the API directly; in the
 * browser it calls the same paths on this site, and the proxy forwards the allow-listed ones.
 */
@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly apiUrl = inject(API_URL);

  readonly http: Client<paths> = createClient<paths>({
    baseUrl: this.baseUrl(),
    // Resolved per call so tests (and polyfills) can replace `fetch` after construction.
    fetch: (request) => fetch(request),
  });

  private baseUrl(): string {
    if (isPlatformBrowser(this.platformId)) {
      return `${this.document.defaultView?.location.origin ?? ''}/api`;
    }

    return `${this.apiUrl ?? ''}/api`;
  }
}
