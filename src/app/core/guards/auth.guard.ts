import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard de autenticación para protección de rutas privadas.
 * Valida de forma asíncrona la sesión con Supabase Auth antes de autorizar la navegación.
 */
export const authGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isAuthenticated = await authService.ensureAuthenticated();
  if (isAuthenticated) {
    return true;
  }

  // Redirigir a login preservando la URL de retorno de forma segura
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url }
  });
};
