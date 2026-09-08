import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/landing/landing').then((m) => m.Landing),
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
