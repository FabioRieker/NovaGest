import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user.model';

/**
 * Guard para control de acceso basado en roles (RBAC).
 * Verifica que el usuario cuente con los permisos necesarios según la metadata de la ruta.
 */
export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticatedSignal()) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }

  const expectedRole = route.data['role'] as UserRole | undefined;
  const expectedRoles = route.data['roles'] as UserRole[] | undefined;

  const currentUser = authService.currentUserSignal();

  if (expectedRole && currentUser?.role !== expectedRole) {
    return router.createUrlTree(['/unauthorized']);
  }

  if (expectedRoles && (!currentUser || !expectedRoles.includes(currentUser.role))) {
    return router.createUrlTree(['/unauthorized']);
  }

  return true;
};
