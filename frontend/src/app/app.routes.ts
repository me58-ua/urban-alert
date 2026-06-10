import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { CrearIncidenciaPage } from './crear-incidencia/crear-incidencia.page';

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
    loadComponent: () =>
      import('./admin/admin-dashboard.page').then((m) => m.AdminDashboardPage),
  },
  {
    path: 'admin/equipos',
    loadComponent: () =>
      import('./admin/equipos-management.page').then((m) => m.EquiposManagementPage),
  },
  {
    path: 'crear-incidencia',
    component: CrearIncidenciaPage,
  },
  {
    path: 'detalle-incidencia',
    loadComponent: () =>
      import('./detalle-incidencia/detalle-incidencia.page').then(
        (m) => m.DetalleIncidenciaPage
      ),
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
  {
    path: 'urban-alert',
    loadComponent: () => import('./urban-alert/urban-alert.page').then( m => m.UrbanAlertPage)
  },
];
