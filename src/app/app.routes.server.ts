import { PrerenderFallback, RenderMode, ServerRoute } from '@angular/ssr';
import { catalogTours } from './core/catalog/tours';

export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'tours', renderMode: RenderMode.Prerender },
  {
    path: 'tours/:id',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Server,
    async getPrerenderParams() {
      return catalogTours.map((tour) => ({ id: tour.id }));
    },
  },
  { path: 'products', renderMode: RenderMode.Prerender },
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
