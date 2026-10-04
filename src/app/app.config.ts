import { IMAGE_LOADER } from '@angular/common';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideNativeDateAdapter } from '@spartan-ng/brain/date-time';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { routes } from './app.routes';
import { remoteImageLoader } from './core/images/remote-image-loader';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
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
