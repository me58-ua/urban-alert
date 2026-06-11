import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import {
  Incidencia,
  IncidenciaPage,
  IncidenciasService,
} from './incidencias.service';

describe('IncidenciasService', () => {
  let service: IncidenciasService;
  let httpMock: HttpTestingController;
  const base = environment.apiUrl;

  const incidencia: Incidencia = {
    id: 1,
    titulo: 'Farola fundida',
    descripcion: null,
    categoria: 'alumbrado',
    prioridad: 'media',
    estado: 'abierta',
    latitud: 38.3852,
    longitud: -0.5132,
    fecha_creacion: '2026-06-01T10:00:00Z',
    fecha_actualizacion: '2026-06-01T10:00:00Z',
    imagenes: [],
    historial: [],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        IncidenciasService,
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(IncidenciasService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('listar() hace GET a {apiUrl}/incidencias y espera la forma paginada { items, total, limit, offset }', () => {
    const page: IncidenciaPage = {
      items: [incidencia],
      total: 1,
      limit: 20,
      offset: 0,
    };

    let received: IncidenciaPage | undefined;
    service.listar().subscribe((res) => {
      received = res;
    });

    const req = httpMock.expectOne(`${base}/incidencias`);
    expect(req.request.method).toBe('GET');
    req.flush(page);

    expect(received).toEqual(page);
    expect(received?.items.length).toBe(1);
    expect(received?.total).toBe(1);
    expect(received?.limit).toBe(20);
    expect(received?.offset).toBe(0);
  });

  it('listar() propaga filtros (incluido limit/offset) como query params', () => {
    service
      .listar({ estado: 'abierta', categoria: 'trafico', limit: 5, offset: 10 })
      .subscribe();

    const req = httpMock.expectOne(
      (r) => r.url === `${base}/incidencias`,
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('estado')).toBe('abierta');
    expect(req.request.params.get('categoria')).toBe('trafico');
    expect(req.request.params.get('limit')).toBe('5');
    expect(req.request.params.get('offset')).toBe('10');
    req.flush({ items: [], total: 0, limit: 5, offset: 10 } as IncidenciaPage);
  });

  it('misIncidencias() hace GET a {apiUrl}/incidencias/mias y espera la forma paginada { items, total, limit, offset }', () => {
    const page: IncidenciaPage = {
      items: [incidencia],
      total: 1,
      limit: 20,
      offset: 0,
    };

    let received: IncidenciaPage | undefined;
    service.misIncidencias().subscribe((res) => {
      received = res;
    });

    const req = httpMock.expectOne(`${base}/incidencias/mias`);
    expect(req.request.method).toBe('GET');
    req.flush(page);

    expect(received).toEqual(page);
    expect(received?.items.length).toBe(1);
  });

  it('misIncidencias() propaga limit/offset como query params', () => {
    service.misIncidencias({ limit: 5, offset: 10 }).subscribe();

    const req = httpMock.expectOne((r) => r.url === `${base}/incidencias/mias`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('limit')).toBe('5');
    expect(req.request.params.get('offset')).toBe('10');
    req.flush({ items: [], total: 0, limit: 5, offset: 10 } as IncidenciaPage);
  });

  it('obtener() hace GET a {apiUrl}/incidencias/:id', () => {
    service.obtener(7).subscribe((res) => {
      expect(res).toEqual(incidencia);
    });

    const req = httpMock.expectOne(`${base}/incidencias/7`);
    expect(req.request.method).toBe('GET');
    req.flush(incidencia);
  });

  it('actualizar() hace PATCH a {apiUrl}/incidencias/:id SIN cabecera X-Role', () => {
    service
      .actualizar(7, { estado: 'resuelta', prioridad: 'alta' })
      .subscribe((res) => {
        expect(res).toEqual(incidencia);
      });

    const req = httpMock.expectOne(`${base}/incidencias/7`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ estado: 'resuelta', prioridad: 'alta' });
    // El interceptor de auth añade el Bearer; aquí ya NO se envía X-Role.
    expect(req.request.headers.has('X-Role')).toBeFalse();
    req.flush(incidencia);
  });

  it('crear() hace POST JSON a {apiUrl}/incidencias', () => {
    service
      .crear({
        titulo: 'Zonas verdes',
        categoria: 'zonas_verdes',
        latitud: 38.3852,
        longitud: -0.5132,
      })
      .subscribe((res) => {
        expect(res).toEqual(incidencia);
      });

    const req = httpMock.expectOne(`${base}/incidencias`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.categoria).toBe('zonas_verdes');
    req.flush(incidencia);
  });
});
