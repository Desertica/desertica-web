import { Routes } from '@angular/router';

/** CMS-backed page: `slug` selects the Strapi `page` entry, the keys are the i18n fallback. */
const content = (path: string, slug: string, titleKey: string, leadKey: string, destination?: string) => ({
  path,
  loadComponent: () => import('./features/content/content-page').then((m) => m.ContentPage),
  data: { slug, titleKey, leadKey, destination },
});

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/landing/landing').then((m) => m.Landing),
  },
  {
    path: 'tours',
    loadComponent: () => import('./features/tours/tours').then((m) => m.Tours),
  },
  {
    path: 'tours/:id',
    loadComponent: () =>
      import('./features/tours/detail/tour-detail').then((m) => m.TourDetail),
  },
  {
    path: 'products',
    loadComponent: () => import('./features/products/products').then((m) => m.Products),
  },
  {
    path: 'products/:slug',
    loadComponent: () =>
      import('./features/products/product-detail').then((m) => m.ProductDetail),
  },
  {
    path: 'about',
    loadComponent: () => import('./features/about/about').then((m) => m.About),
  },
  {
    path: 'contact',
    loadComponent: () => import('./features/contact/contact').then((m) => m.Contact),
  },
  {
    path: 'blog',
    loadComponent: () => import('./features/blog/blog').then((m) => m.Blog),
  },
  {
    path: 'blog/:slug',
    loadComponent: () => import('./features/blog/blog-post').then((m) => m.BlogPostPage),
  },
  content('nazca', 'nazca', 'footer.nazca', 'pages.nazcaLead', 'nazca'),
  content('huacachina', 'huacachina', 'footer.huacachina', 'pages.huacachinaLead', 'huacachina'),
  content('paracas', 'paracas', 'footer.paracas', 'pages.paracasLead', 'paracas'),
  content('terms', 'terms', 'footer.terms', 'pages.termsLead'),
  content('privacy', 'privacy', 'footer.privacy', 'pages.privacyLead'),
  content('complaints', 'complaints', 'footer.complaints', 'pages.complaintsLead'),
  content('conduct', 'conduct', 'footer.conduct', 'pages.conductLead'),
  content('legal/mincetur', 'legal-mincetur', 'footer.mincetur', 'pages.minceturLead'),
  {
    path: 'experiences/:slug',
    loadComponent: () =>
      import('./features/experiences/detail/experience-detail').then((m) => m.ExperienceDetail),
  },
  {
    path: 'reservations',
    loadComponent: () => import('./features/reservations/reservations').then((m) => m.Reservations),
  },
  { path: '**', redirectTo: '' },
];
