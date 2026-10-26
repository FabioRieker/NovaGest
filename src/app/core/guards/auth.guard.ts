import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard de autenticación para protección de rutas privadas.
 * Comprueba que el usuario disponga de una sesión activa válida.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticatedSignal()) {
    return true;
  }

  // Redirigir a login preservando la URL de retorno
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url }
  });
};
