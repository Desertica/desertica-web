import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { CMS_CONFIG, cmsConfigFromEnv } from './core/cms/cms-config';
import { PUBLIC_CONFIG, publicConfigForServer } from './core/config/public-config';
import { serverRoutes } from './app.routes.server';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    { provide: CMS_CONFIG, useFactory: () => cmsConfigFromEnv(process.env) },
    { provide: PUBLIC_CONFIG, useFactory: () => publicConfigForServer(process.env) },
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
