import { Routes } from '@angular/router';
import { authGuard } from './auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'login', loadComponent: () => import('./pages/login.component').then(m => m.LoginComponent) },
  { path: 'dashboard', canActivate: [authGuard(['ADMIN', 'RECEPTION', 'ACCOUNTING'])], loadComponent: () => import('./pages/dashboard.component').then(m => m.DashboardComponent) },
  { path: 'users', canActivate: [authGuard(['ADMIN', 'HR'])], loadComponent: () => import('./pages/users.component').then(m => m.UsersComponent) },
  { path: '**', redirectTo: 'dashboard' }
];
