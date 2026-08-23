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
    path: '**',
    redirectTo: '',
  },
];
