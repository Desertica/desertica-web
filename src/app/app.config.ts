import { APP_BASE_HREF, DOCUMENT, IMAGE_LOADER, registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { provideHttpClient, withFetch } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  REQUEST,
} from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideNativeDateAdapter } from '@spartan-ng/brain/date-time';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { routes } from './app.routes';
import { CatalogService } from './core/catalog/catalog';
import { localeFromPath } from './core/i18n/catalogs';
import { PUBLIC_CONFIG } from './core/config/public-config';
import { optimizedImageLoader } from './core/images/remote-image-loader';

// The date pipe throws NG0701 for "es" without its locale data; "en" is built in.
registerLocaleData(localeEs);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Pages live under `/en` and `/es`: the router treats that prefix as its base, so every routerLink gets it
    // and the router sees `/tours`. `<base href>` stays `/` because the scripts and styles are relative to it.
    {
      provide: APP_BASE_HREF,
      useFactory: () => {
        const request = inject(REQUEST, { optional: true });
        const path = request ? new URL(request.url).pathname : (inject(DOCUMENT).defaultView?.location.pathname ?? '/');
        const locale = localeFromPath(path);
        return locale ? `/${locale}/` : '/';
      },
    },
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
    { provide: IMAGE_LOADER, useFactory: () => optimizedImageLoader(inject(PUBLIC_CONFIG).imageHosts) },
  ],
};
