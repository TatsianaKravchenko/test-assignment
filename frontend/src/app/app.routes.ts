import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/main-page/main-page-component').then((m) => m.MainPageComponent),
  },
];
