import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/services/backend/authentication/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./sections/hero/hero').then((m) => m.HeroComponent),
  },

  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/backend/login/login').then((m) => m.Login),
  },

  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/backend/register/register').then((m) => m.Register),
  },

  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/backend/dashboard/dashboard').then((m) => m.Dashboard),
  },

  {
    path: 'shop',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/backend/shop/shop').then((m) => m.Shop),
  },

  {
    path: 'contact',
    loadComponent: () => import('./pages/contact/contact').then((m) => m.Contact),
  },

  {
    path: 'coming-soon',
    loadComponent: () => import('./pages/coming-soon/coming-soon').then((m) => m.ComingSoon),
  },

  {
    path: 'privacy-policy',
    loadComponent: () =>
      import('./sections/shared/pirvacy-policy/pirvacy-policy').then((m) => m.PirvacyPolicy),
  },

  {
    path: '**',
    loadComponent: () =>
      import('./sections/shared/not-found/not-found').then((m) => m.NotFound),
  },
];
