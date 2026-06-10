import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { Notificacion, NotificacionesService } from './notificaciones.service';

describe('NotificacionesService', () => {
  let service: NotificacionesService;
  let httpMock: HttpTestingController;
  const base = environment.apiUrl;

  const notificaciones: Notificacion[] = [
    {
      id: 3,
      incidencia_id: 10,
      mensaje: 'La incidencia ha cambiado a en progreso',
      estado_nuevo: 'en_progreso',
      leida: false,
      fecha_creacion: '2026-06-10T12:00:00Z',
    },
    {
      id: 2,
      incidencia_id: 10,
      mensaje: 'La incidencia ha sido registrada',
      estado_nuevo: 'abierta',
      leida: true,
      fecha_creacion: '2026-06-09T08:30:00Z',
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NotificacionesService,
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(NotificacionesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('listar() sin filtros hace GET a {apiUrl}/notificaciones (sin params) y devuelve el array', () => {
    let received: Notificacion[] | undefined;
    service.listar().subscribe((res) => (received = res));

    const req = httpMock.expectOne(`${base}/notificaciones`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys().length).toBe(0);
    req.flush(notificaciones);

    expect(received).toEqual(notificaciones);
    expect(received?.length).toBe(2);
  });

  it('listar({ incidencia_id }) propaga el filtro incidencia_id', () => {
    service.listar({ incidencia_id: 10 }).subscribe();

    const req = httpMock.expectOne(
      (r) => r.url === `${base}/notificaciones` && r.params.get('incidencia_id') === '10',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.has('leida')).toBeFalse();
    req.flush(notificaciones);
  });

  it('listar({ leida: false }) propaga el filtro leida=false', () => {
    service.listar({ leida: false }).subscribe();

    const req = httpMock.expectOne(
      (r) => r.url === `${base}/notificaciones` && r.params.get('leida') === 'false',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.has('incidencia_id')).toBeFalse();
    req.flush([notificaciones[0]]);
  });

  it('listar({ incidencia_id, leida }) propaga ambos filtros a la vez', () => {
    service.listar({ incidencia_id: 10, leida: true }).subscribe();

    const req = httpMock.expectOne(
      (r) =>
        r.url === `${base}/notificaciones` &&
        r.params.get('incidencia_id') === '10' &&
        r.params.get('leida') === 'true',
    );
    expect(req.request.method).toBe('GET');
    req.flush([notificaciones[1]]);
  });

  it('marcarLeida() hace PATCH a {apiUrl}/notificaciones/{id}/leer y devuelve la notificacion con leida:true', () => {
    let received: Notificacion | undefined;
    service.marcarLeida(3).subscribe((res) => (received = res));

    const req = httpMock.expectOne(`${base}/notificaciones/3/leer`);
    expect(req.request.method).toBe('PATCH');
    const actualizada: Notificacion = { ...notificaciones[0], leida: true };
    req.flush(actualizada);

    expect(received?.id).toBe(3);
    expect(received?.leida).toBeTrue();
  });
});
