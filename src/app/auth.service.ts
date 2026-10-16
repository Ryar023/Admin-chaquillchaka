import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';

export const API_URL = 'https://backend-chaquillchaka.onrender.com/api';
export type AdminRole = 'ADMIN' | 'RECEPTION' | 'ACCOUNTING' | 'HR';
export interface AdminUser { id: string; name: string; email: string; role: AdminRole; }
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  login(email: string, password: string) {
    return this.http.post<{ token: string; user: AdminUser }>(`${API_URL}/auth/login`, { email, password }).pipe(tap(({ token, user }) => {
      localStorage.setItem('admin_token', token);
      localStorage.setItem('admin_user', JSON.stringify(user));
    }));
  }
  token(): string | null { return localStorage.getItem('admin_token'); }
  user(): AdminUser | null {
    try { return JSON.parse(localStorage.getItem('admin_user') ?? 'null') as AdminUser | null; }
    catch { return null; }
  }
  hasRole(roles: AdminRole[]): boolean { const role = this.user()?.role; return !!role && roles.includes(role); }
  logout(): void { localStorage.removeItem('admin_token'); localStorage.removeItem('admin_user'); }
}
