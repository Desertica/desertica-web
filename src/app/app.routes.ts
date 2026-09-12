import { Routes } from '@angular/router';

const placeholder = (path: string, titleKey: string, leadKey: string) => ({
  path,
  loadComponent: () =>
    import('./features/placeholder/placeholder-page').then((m) => m.PlaceholderPage),
  data: { titleKey, leadKey },
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
  placeholder('products', 'nav.products', 'pages.productsLead'),
  {
    path: 'about',
    loadComponent: () => import('./features/about/about').then((m) => m.About),
  },
  {
    path: 'contact',
    loadComponent: () => import('./features/contact/contact').then((m) => m.Contact),
  },
  placeholder('blog', 'nav.blog', 'pages.blogLead'),
  placeholder('nazca', 'footer.nazca', 'pages.nazcaLead'),
  placeholder('huacachina', 'footer.huacachina', 'pages.huacachinaLead'),
  placeholder('paracas', 'footer.paracas', 'pages.paracasLead'),
  placeholder('terms', 'footer.terms', 'pages.termsLead'),
  placeholder('privacy', 'footer.privacy', 'pages.privacyLead'),
  placeholder('complaints', 'footer.complaints', 'pages.complaintsLead'),
  placeholder('conduct', 'footer.conduct', 'pages.conductLead'),
  placeholder('legal/mincetur', 'footer.mincetur', 'pages.minceturLead'),
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
