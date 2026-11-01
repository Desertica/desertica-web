import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { CatalogService } from '../catalog/catalog';

/** Swaps an `<img>` that fails to load for the placeholder, once, keeping its `alt`. */
export function swapToPlaceholder(img: HTMLImageElement, placeholder: string): void {
  if (img.dataset['placeholder']) {
    return;
  }

  img.dataset['placeholder'] = '1';
  img.removeAttribute('srcset');
  img.src = placeholder;
}

/**
 * Single point for broken images: `error` does not bubble, so one capturing listener on the
 * document covers every `<img>` (NgOptimizedImage included) without touching each page.
 */
@Injectable({ providedIn: 'root' })
export class ImagePlaceholder {
  private readonly doc = inject(DOCUMENT);
  private readonly catalog = inject(CatalogService);
  private started = false;

  start(): void {
    if (this.started || !this.doc.defaultView) {
      return;
    }

    this.started = true;
    this.doc.addEventListener(
      'error',
      (event) => {
        if (event.target instanceof HTMLImageElement) {
          swapToPlaceholder(event.target, this.url());
        }
      },
      true,
    );
    // Images that failed before hydration never reach the listener.
    for (const img of Array.from(this.doc.images)) {
      if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) {
        swapToPlaceholder(img, this.url());
      }
    }
  }

  url(): string {
    return this.catalog.placeholder();
  }
}
