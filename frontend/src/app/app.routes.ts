import { Routes } from '@angular/router';
import { CrearIncidenciaPage } from './crear-incidencia/crear-incidencia.page';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
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
