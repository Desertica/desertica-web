import { ImageLoaderConfig } from '@angular/common';
import { IMAGE_WIDTHS } from '../../../image-widths';

/** Passes absolute URLs through unchanged (tests, and hosts the server does not resize). */
export function remoteImageLoader(config: ImageLoaderConfig): string {
  return config.src;
}

/**
 * Sends images from the given hosts through the server's `/_img` resizer (WebP, right width).
 * Vector and animated files stay as they are.
 */
export function optimizedImageLoader(hosts: readonly string[]): (config: ImageLoaderConfig) => string {
  return ({ src, width }) => {
    let url: URL;
    try {
      url = new URL(src);
    } catch {
      return src;
    }

    if (!hosts.includes(url.host) || /\.(svg|gif)$/i.test(url.pathname)) {
      return src;
    }

    const wanted = width ?? IMAGE_WIDTHS[IMAGE_WIDTHS.length - 1];
    return `/_img?w=${wanted}&u=${encodeURIComponent(src)}`;
  };
}
