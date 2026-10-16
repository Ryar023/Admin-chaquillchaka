import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { AdminRole } from './auth.service';
export function authGuard(roles: AdminRole[] = []): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    if (!auth.token()) return inject(Router).createUrlTree(['/login']);
    if (!roles.length || auth.hasRole(roles)) return true;
    return inject(Router).createUrlTree(auth.hasRole(['HR']) ? ['/users'] : ['/login']);
  };
}
