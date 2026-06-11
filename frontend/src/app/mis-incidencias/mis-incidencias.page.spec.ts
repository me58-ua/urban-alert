import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';
import { Incidencia, IncidenciaPage } from '../services/incidencias.service';
import { MisIncidenciasPage } from './mis-incidencias.page';

/**
 * Stub de AuthService cuyo `isAuthenticated()` se controla por test. Incluye
 * `email()`/`role()`/`logout()` porque ahora la página renderiza <app-header>,
 * que los consulta al pintar el panel de sesión.
 */
class AuthServiceStub {
  authenticated = true;
  isAuthenticated(): boolean {
    return this.authenticated;
  }
  email(): string | null {
    return this.authenticated ? 'ciudadano@test.com' : null;
  }
  role(): 'admin' | 'ciudadano' | null {
    return this.authenticated ? 'ciudadano' : null;
  }
  logout(): void {
    this.authenticated = false;
  }
}

describe('MisIncidenciasPage', () => {
  let httpMock: HttpTestingController;
  let authStub: AuthServiceStub;
  const base = environment.apiUrl;

  function incidencia(id: number): Incidencia {
    return {
      id,
      titulo: `Incidencia ${id}`,
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
    };
  }

  const page: IncidenciaPage = {
    items: [incidencia(3)],
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
    spyOn(router, 'navigateByUrl').and.resolveTo(true);

    const fixture = TestBed.createComponent(MisIncidenciasPage);
    const component = fixture.componentInstance;
    return { component, fixture, router };
  }

  afterEach(() => httpMock.verify());

  it('con sesión: pide GET /incidencias/mias con limit/offset y guarda items + total', () => {
    const { component, fixture } = setup(true);
    fixture.detectChanges(); // dispara ngOnInit

    expect(component.loading()).toBeTrue();

    const req = httpMock.expectOne(
      `${base}/incidencias/mias?limit=20&offset=0`,
    );
    expect(req.request.method).toBe('GET');
    req.flush(page);

    expect(component.loading()).toBeFalse();
    expect(component.error()).toBeNull();
    expect(component.incidents().length).toBe(1);
    expect(component.incidents()[0].id).toBe(3);
    expect(component.total()).toBe(1);
  });

  it('muestra un mensaje de error si la petición falla', () => {
    const { component, fixture } = setup(true);
    fixture.detectChanges();

    const req = httpMock.expectOne(`${base}/incidencias/mias?limit=20&offset=0`);
    req.flush('boom', { status: 500, statusText: 'Server Error' });

    expect(component.incidents().length).toBe(0);
    expect(component.error()).toBe(
      'No se pudieron cargar tus incidencias. Intentalo de nuevo en unos minutos.',
    );
    expect(component.loading()).toBeFalse();
  });

  it('sin sesión: redirige a /login y NO dispara ninguna petición', () => {
    const { fixture, router } = setup(false);
    fixture.detectChanges();

    httpMock.expectNone(`${base}/incidencias/mias`);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });

  it('nextPage()/prevPage() avanzan el offset y recargan; deshabilitan en los extremos', () => {
    const { component, fixture } = setup(true);
    fixture.detectChanges();

    const items25 = Array.from({ length: 20 }, (_v, i) => incidencia(i + 1));
    httpMock
      .expectOne(`${base}/incidencias/mias?limit=20&offset=0`)
      .flush({ items: items25, total: 25, limit: 20, offset: 0 });

    // Primera página: no se puede retroceder, sí avanzar (25 > 20).
    expect(component.offset()).toBe(0);
    expect(component.canPrev()).toBeFalse();
    expect(component.canNext()).toBeTrue();
    expect(component.rangeLabel()).toBe('1-20 de 25');

    // Avanza a la segunda página.
    component.nextPage();
    expect(component.offset()).toBe(20);
    httpMock
      .expectOne(`${base}/incidencias/mias?limit=20&offset=20`)
      .flush({ items: [incidencia(21)], total: 25, limit: 20, offset: 20 });

    expect(component.canPrev()).toBeTrue();
    expect(component.canNext()).toBeFalse();
    expect(component.rangeLabel()).toBe('21-25 de 25');

    // Retrocede a la primera página.
    component.prevPage();
    expect(component.offset()).toBe(0);
    httpMock
      .expectOne(`${base}/incidencias/mias?limit=20&offset=0`)
      .flush({ items: items25, total: 25, limit: 20, offset: 0 });

    expect(component.canPrev()).toBeFalse();
  });

  it('no recarga si se intenta retroceder en la primera página', () => {
    const { component, fixture } = setup(true);
    fixture.detectChanges();

    httpMock
      .expectOne(`${base}/incidencias/mias?limit=20&offset=0`)
      .flush(page);

    component.prevPage();
    httpMock.expectNone(`${base}/incidencias/mias?limit=20&offset=0`);
    expect(component.offset()).toBe(0);
  });
});
