import { IMAGE_LOADER } from '@angular/common';
import { provideHttpClient, withFetch } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideNativeDateAdapter } from '@spartan-ng/brain/date-time';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { routes } from './app.routes';
import { CatalogService } from './core/catalog/catalog';
import { remoteImageLoader } from './core/images/remote-image-loader';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withFetch()),
    provideAppInitializer(() => inject(CatalogService).init()),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ anchorScrolling: 'disabled', scrollPositionRestoration: 'disabled' }),
    ),
    provideClientHydration(withEventReplay()),
    provideSpartanHlm(),
    provideNativeDateAdapter(),
    { provide: IMAGE_LOADER, useValue: remoteImageLoader },
  ],
};
