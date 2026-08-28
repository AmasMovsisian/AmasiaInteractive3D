import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./sections/hero/hero').then((m) => m.HeroComponent),
  },
  {
    path: 'coming-soon',
    loadComponent: () => import('./pages/coming-soon/coming-soon').then((m) => m.ComingSoon),
  },
  {
    path: 'privacy-policy',
    loadComponent: () => import('./sections/shared/pirvacy-policy/pirvacy-policy').then((m) => m.PirvacyPolicy),
  },
];
