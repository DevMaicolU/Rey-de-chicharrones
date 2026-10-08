import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../servicios/auth.service';
import { DatabaseService } from '../servicios/database.service';
import { UserRole } from '../entidades/modelos';

/**
 * Permite el acceso solo a usuarios con sesión válida y el rol indicado.
 * - Sin sesión (o usuario eliminado): va al login.
 * - Con sesión pero rol distinto: va a su propia área en vez de al login.
 */
export const roleGuard = (role: UserRole): CanActivateFn => () => {
  const auth = inject(AuthService);
  const database = inject(DatabaseService);
  const router = inject(Router);

  const user = auth.activeUser;
  if (!user || !database.userExists(user.id)) {
    auth.logout();
    return router.createUrlTree(['/login']);
  }
  return auth.hasRole(role) ? true : router.createUrlTree([auth.rutaInicio]);
};
