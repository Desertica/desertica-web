import { Routes } from '@angular/router';
import { bookingEngineGuard } from './core/booking/booking-engine';

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
  {
    path: 'complaints',
    loadComponent: () =>
      import('./features/complaints/complaints').then((m) => m.ComplaintsBook),
  },
  content('conduct', 'conduct', 'footer.conduct', 'pages.conductLead'),
  content('cancellation', 'cancellation', 'footer.cancellation', 'pages.cancellationLead'),
  content('cookies', 'cookies', 'footer.cookies', 'pages.cookiesLead'),
  content('legal/mincetur', 'legal-mincetur', 'footer.mincetur', 'pages.minceturLead'),
  // Legacy URL: Express answers it with a permanent redirect; this keeps in-app navigation consistent.
  { path: 'experiences/:slug', redirectTo: 'tours/:slug' },
  { path: 'experiences', redirectTo: 'tours' },
  {
    path: 'reservations',
    loadComponent: () => import('./features/reservations/reservations').then((m) => m.Reservations),
  },
  // Booking engine: these routes only exist while BOOKING_ENGINE_ENABLED is true.
  {
    path: 'checkout',
    canMatch: [bookingEngineGuard],
    loadComponent: () => import('./features/booking/checkout').then((m) => m.Checkout),
  },
  {
    path: 'checkout/payment/:reference',
    canMatch: [bookingEngineGuard],
    loadComponent: () =>
      import('./features/booking/checkout-payment').then((m) => m.CheckoutPayment),
  },
  {
    path: 'pay/:token',
    canMatch: [bookingEngineGuard],
    loadComponent: () => import('./features/payment/pay-link').then((m) => m.PayLink),
  },
  {
    path: 'waiver/:token',
    canMatch: [bookingEngineGuard],
    loadComponent: () => import('./features/waiver/waiver').then((m) => m.Waiver),
  },
  {
    path: 'payment/3ds',
    canMatch: [bookingEngineGuard],
    loadComponent: () =>
      import('./features/payment/three-ds-return').then((m) => m.ThreeDsReturn),
  },
  {
    path: 'booking',
    canMatch: [bookingEngineGuard],
    loadComponent: () => import('./features/booking/my-booking').then((m) => m.MyBooking),
  },
  {
    path: 'booking/:reference',
    canMatch: [bookingEngineGuard],
    loadComponent: () => import('./features/booking/my-booking').then((m) => m.MyBooking),
  },
  { path: '**', redirectTo: '' },
];
