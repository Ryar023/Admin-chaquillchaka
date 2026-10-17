import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from './auth.service';

const ROLE_LABELS: Record<string, string> = { ADMIN: 'Administrador', RECEPTION: 'Recepción', ACCOUNTING: 'Contabilidad', HR: 'Recursos Humanos' };

@Component({
  selector: 'app-admin-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <header class="topbar">
      <div class="shell topbar-inner">
        <a routerLink="/dashboard" class="brand" aria-label="Chaquill Chak'a, panel interno">
          <img src="/assets/chaquillchaka-logo.png" alt="Chaquill Chak'a Hostal, desde 2008" width="150" height="56">
        </a>
        <nav aria-label="Secciones del panel" class="sections">
          <a *ngIf="auth.hasRole(['ADMIN','RECEPTION','ACCOUNTING'])" routerLink="/dashboard" routerLinkActive="active" ariaCurrentWhenActive="page" class="nav-btn">Reservas</a>
          <a *ngIf="auth.hasRole(['ADMIN','HR'])" routerLink="/users" routerLinkActive="active" ariaCurrentWhenActive="page" class="nav-btn">Usuarios</a>
        </nav>
        <div class="session">
          <span class="who" *ngIf="auth.user() as u"><strong>{{ u.name }}</strong><small>{{ roleLabel(u.role) }}</small></span>
          <button class="nav-btn logout" type="button" (click)="logout()">Cerrar sesión</button>
        </div>
      </div>
    </header>`,
  styles: [`
    .topbar{background:#183b32;color:#fff}.topbar-inner{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:10px 0;flex-wrap:wrap}
    .brand{display:inline-flex;background:#fff;border-radius:10px;padding:4px 8px}.brand img{display:block;height:48px;width:auto}
    .sections{display:flex;gap:10px;flex-wrap:wrap}.session{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
    .nav-btn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;min-width:44px;padding:0 18px;border:2px solid rgba(255,255,255,.55);border-radius:8px;background:transparent;color:#fff;font:inherit;font-weight:700;text-decoration:none;cursor:pointer}
    .nav-btn:hover{background:rgba(255,255,255,.14)}.nav-btn.active{background:#fff;color:#183b32;border-color:#fff}.logout{border-color:#fff}
    .who{display:flex;flex-direction:column;text-align:right;font-size:14px}.who small{color:#cfe3d9}
  `]
})
export class AdminHeaderComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  roleLabel(role: string): string { return ROLE_LABELS[role] ?? role; }
  logout(): void { this.auth.logout(); this.router.navigateByUrl('/login'); }
}
