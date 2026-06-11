import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { CrearIncidenciaPage } from './crear-incidencia/crear-incidencia.page';
import { adminGuard } from './guards/admin.guard';
import { authGuard } from './guards/auth.guard';

const redirectAdminHome = () => {
  const router = inject(Router);
  return localStorage.getItem('urban-alert-role') === 'admin' ? router.parseUrl('/admin') : true;
};

export const routes: Routes = [
  {
    path: 'home',
    canActivate: [redirectAdminHome],
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./admin/admin-dashboard.page').then((m) => m.AdminDashboardPage),
  },
  {
    path: 'admin/incidencias',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./admin/incidencias-management.page').then((m) => m.IncidenciasManagementPage),
  },
  {
    path: 'admin/equipos',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./admin/equipos-management.page').then((m) => m.EquiposManagementPage),
  },
  {
    path: 'admin/usuarios',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./admin/users-management.page').then((m) => m.UsersManagementPage),
  },
  {
    path: 'crear-incidencia',
    canActivate: [authGuard],
    component: CrearIncidenciaPage,
  },
  {
    path: 'detalle-incidencia/:id',
    loadComponent: () =>
      import('./detalle-incidencia/detalle-incidencia.page').then(
        (m) => m.DetalleIncidenciaPage
      ),
  },
  {
    path: 'mis-incidencias',
    loadComponent: () =>
      import('./mis-incidencias/mis-incidencias.page').then(
        (m) => m.MisIncidenciasPage
      ),
  },
  {
    path: 'mapa-incidencias',
    loadComponent: () =>
      import('./mapa-incidencias/mapa-incidencias.page').then(
        (m) => m.MapaIncidenciasPage
      ),
  },
  {
    path: 'notificaciones',
    loadComponent: () =>
      import('./notificaciones/notificaciones.page').then(
        (m) => m.NotificacionesPage
      ),
  },
  {
    path: 'login',
    loadComponent: () => import('./auth/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'registrar',
    loadComponent: () =>
      import('./auth/registrar.page').then((m) => m.RegistrarPage),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
];
