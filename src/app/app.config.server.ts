import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { CMS_CONFIG, cmsConfigFromEnv } from './core/cms/cms-config';
import { API_URL } from './core/api/api-client';
import { PUBLIC_CONFIG, apiUrlFromEnv, publicConfigForServer } from './core/config/public-config';
import { serverRoutes } from './app.routes.server';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    { provide: CMS_CONFIG, useFactory: () => cmsConfigFromEnv(process.env) },
    { provide: API_URL, useFactory: () => apiUrlFromEnv(process.env) },
    { provide: PUBLIC_CONFIG, useFactory: () => publicConfigForServer(process.env) },
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
