import { ImageLoaderConfig } from '@angular/common';

/** Passes through absolute URLs so NgOptimizedImage can load Unsplash assets. */
export function remoteImageLoader(config: ImageLoaderConfig): string {
  return config.src;
}
