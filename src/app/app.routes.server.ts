import { inject } from '@angular/core';
import { PrerenderFallback, RenderMode, ServerRoute } from '@angular/ssr';
import { CatalogService } from './core/catalog/catalog';

export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'tours', renderMode: RenderMode.Prerender },
  {
    path: 'tours/:id',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Server,
    async getPrerenderParams() {
      const catalog = inject(CatalogService);
      await catalog.init();
      return catalog.tours().map((tour) => ({ id: tour.id }));
    },
  },
  { path: 'products', renderMode: RenderMode.Server },
  { path: 'products/:slug', renderMode: RenderMode.Server },
  { path: 'about', renderMode: RenderMode.Prerender },
  { path: 'contact', renderMode: RenderMode.Prerender },
  { path: 'blog', renderMode: RenderMode.Server },
  { path: 'blog/:slug', renderMode: RenderMode.Server },
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
