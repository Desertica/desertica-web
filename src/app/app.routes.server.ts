import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'tours', renderMode: RenderMode.Prerender },
  { path: 'packages', renderMode: RenderMode.Prerender },
  { path: 'about', renderMode: RenderMode.Prerender },
  { path: 'contact', renderMode: RenderMode.Prerender },
  { path: 'blog', renderMode: RenderMode.Prerender },
  { path: 'nazca', renderMode: RenderMode.Prerender },
  { path: 'huacachina', renderMode: RenderMode.Prerender },
  { path: 'paracas', renderMode: RenderMode.Prerender },
  { path: 'terms', renderMode: RenderMode.Prerender },
  { path: 'privacy', renderMode: RenderMode.Prerender },
  { path: 'complaints', renderMode: RenderMode.Prerender },
  { path: 'conduct', renderMode: RenderMode.Prerender },
  { path: 'legal/mincetur', renderMode: RenderMode.Prerender },
  { path: 'experiences/:slug', renderMode: RenderMode.Server },
  { path: 'reservations', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Server },
];
