import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Every route renders per request. Content, copy, theme, navigation and media come from Strapi
 * (through a short server-side cache), so publishing a change needs no rebuild and the build does
 * not depend on the CMS being reachable.
 */
export const serverRoutes: ServerRoute[] = [{ path: '**', renderMode: RenderMode.Server }];
