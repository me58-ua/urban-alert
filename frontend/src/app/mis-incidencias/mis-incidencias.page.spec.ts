import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';
import { IncidenciaPage } from '../services/incidencias.service';
import { MisIncidenciasPage } from './mis-incidencias.page';

/** Stub de AuthService cuyo `isAuthenticated()` se controla por test. */
class AuthServiceStub {
  authenticated = true;
  isAuthenticated(): boolean {
    return this.authenticated;
  }
}

describe('MisIncidenciasPage', () => {
  let httpMock: HttpTestingController;
  let authStub: AuthServiceStub;
  const base = environment.apiUrl;

  const page: IncidenciaPage = {
    items: [
      {
        id: 3,
        titulo: 'Contenedor desbordado',
        descripcion: null,
        categoria: 'residuos',
        prioridad: 'media',
        estado: 'abierta',
        latitud: 38.3852,
        longitud: -0.5132,
        fecha_creacion: '2026-06-01T10:00:00Z',
        fecha_actualizacion: '2026-06-01T10:00:00Z',
        imagenes: [],
        historial: [],
      },
    ],
    total: 1,
    limit: 20,
    offset: 0,
  };

  function setup(authenticated: boolean): {
    component: MisIncidenciasPage;
    fixture: ComponentFixture<MisIncidenciasPage>;
    router: Router;
  } {
    authStub = new AuthServiceStub();
    authStub.authenticated = authenticated;

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: authStub },
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    const router = TestBed.inject(Router);
    const navSpy = spyOn(router, 'navigateByUrl').and.resolveTo(true);
    void navSpy;

    const fixture = TestBed.createComponent(MisIncidenciasPage);
    const component = fixture.componentInstance;
    return { component, fixture, router };
  }

  afterEach(() => httpMock.verify());

  it('con sesión: pide GET /incidencias/mias y mapea las incidencias del usuario', () => {
    const { component } = setup(true);

    const emissions: { incidents: { id: number }[]; loading: boolean; error: string | null }[] = [];
    component.vm$.subscribe((vm) => emissions.push(vm));

    const req = httpMock.expectOne(`${base}/incidencias/mias`);
    expect(req.request.method).toBe('GET');
    req.flush(page);

    expect(emissions[0].loading).toBeTrue();

    const vm = emissions[emissions.length - 1];
    expect(vm.loading).toBeFalse();
    expect(vm.error).toBeNull();
    expect(vm.incidents.length).toBe(1);
    expect(vm.incidents[0].id).toBe(3);
  });

  it('sin sesión: redirige a /login y NO dispara ninguna petición', () => {
    const { component, router } = setup(false);

    // No debe haber petición a /incidencias/mias.
    httpMock.expectNone(`${base}/incidencias/mias`);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');

    // vm$ no debe emitir nada (EMPTY) y completar sin error.
    let emitted = false;
    let completed = false;
    component.vm$.subscribe({
      next: () => (emitted = true),
      complete: () => (completed = true),
    });
    expect(emitted).toBeFalse();
    expect(completed).toBeTrue();
  });
});
