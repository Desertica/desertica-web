import { Routes } from '@angular/router';

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
    path: 'packages',
    loadComponent: () => import('./features/packages/packages').then((m) => m.Packages),
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
