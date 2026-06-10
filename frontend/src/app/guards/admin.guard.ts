import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard funcional para rutas `admin/*`: solo permite el acceso si el rol
 * persistido es `admin`; en caso contrario redirige a `/home`.
 */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.role() === 'admin' ? true : router.parseUrl('/home');
};
