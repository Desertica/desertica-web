import { DOCUMENT } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { PUBLIC_CONFIG } from '../config/public-config';
import { dataLayerOf } from './data-layer';

/**
 * Loads the Google Tag Manager container. Browser only: `init()` is called after the first render
 * and after the denied Consent Mode default is already in the data layer, so the container starts
 * with every tag blocked until the visitor decides.
 */
@Injectable({ providedIn: 'root' })
export class GtmLoader {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly config = inject(PUBLIC_CONFIG);
  private loaded = false;

  load(): void {
    const id = this.config.gtmId;
    const layer = dataLayerOf(this.document, this.platformId);
    if (!id || !layer || this.loaded) {
      return;
    }

    this.loaded = true;
    layer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    const script = this.document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`;
    this.document.head.appendChild(script);
  }
}
