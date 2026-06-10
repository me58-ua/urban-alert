import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { Equipo, EquiposService, Trabajador } from './equipos.service';

describe('EquiposService', () => {
  let service: EquiposService;
  let httpMock: HttpTestingController;
  const base = environment.apiUrl;

  const trabajador: Trabajador = {
    id: 10,
    nombre: 'Laura Martin',
    puesto: 'Electricista',
    disponible: true,
    equipo_id: 1,
  };

  const equipo: Equipo = {
    id: 1,
    nombre: 'Luz Norte',
    categoria: 'alumbrado',
    trabajadores: [trabajador],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        EquiposService,
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(EquiposService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('listarEquipos() hace GET a {apiUrl}/equipos y devuelve Equipo[]', () => {
    let received: Equipo[] | undefined;
    service.listarEquipos().subscribe((res) => {
      received = res;
    });

    const req = httpMock.expectOne(`${base}/equipos`);
    expect(req.request.method).toBe('GET');
    req.flush([equipo]);

    expect(received).toEqual([equipo]);
    expect(received?.length).toBe(1);
    expect(received?.[0].trabajadores.length).toBe(1);
    expect(received?.[0].categoria).toBe('alumbrado');
  });

  it('crearEquipo() hace POST JSON a {apiUrl}/equipos', () => {
    let received: Equipo | undefined;
    service
      .crearEquipo({ nombre: 'Luz Norte', categoria: 'alumbrado' })
      .subscribe((res) => {
        received = res;
      });

    const req = httpMock.expectOne(`${base}/equipos`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ nombre: 'Luz Norte', categoria: 'alumbrado' });
    req.flush(equipo);

    expect(received).toEqual(equipo);
  });

  it('actualizarEquipo() hace PATCH a {apiUrl}/equipos/:id', () => {
    service
      .actualizarEquipo(1, { nombre: 'Luz Sur', categoria: 'trafico' })
      .subscribe();

    const req = httpMock.expectOne(`${base}/equipos/1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ nombre: 'Luz Sur', categoria: 'trafico' });
    req.flush({ ...equipo, nombre: 'Luz Sur', categoria: 'trafico' });
  });

  it('eliminarEquipo() hace DELETE a {apiUrl}/equipos/:id', () => {
    service.eliminarEquipo(1).subscribe();

    const req = httpMock.expectOne(`${base}/equipos/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('crearTrabajador() hace POST a {apiUrl}/equipos/:id/trabajadores', () => {
    let received: Trabajador | undefined;
    service
      .crearTrabajador(1, { nombre: 'Hugo Vidal', puesto: 'Operario', disponible: true })
      .subscribe((res) => {
        received = res;
      });

    const req = httpMock.expectOne(`${base}/equipos/1/trabajadores`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      nombre: 'Hugo Vidal',
      puesto: 'Operario',
      disponible: true,
    });
    req.flush({ ...trabajador, id: 11, nombre: 'Hugo Vidal' });

    expect(received?.id).toBe(11);
    expect(received?.nombre).toBe('Hugo Vidal');
  });

  it('quitarTrabajador() hace DELETE a {apiUrl}/equipos/:id/trabajadores/:tid', () => {
    service.quitarTrabajador(1, 10).subscribe();

    const req = httpMock.expectOne(`${base}/equipos/1/trabajadores/10`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('asignarEquipoAIncidencia() hace PATCH a {apiUrl}/incidencias/:id/equipo con {equipo_id}', () => {
    let ok = false;
    service.asignarEquipoAIncidencia(7, 1).subscribe(() => {
      ok = true;
    });

    const req = httpMock.expectOne(`${base}/incidencias/7/equipo`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ equipo_id: 1 });
    req.flush({ id: 7 });

    expect(ok).toBeTrue();
  });

  it('asignarEquipoAIncidencia(null) desasigna enviando {equipo_id: null}', () => {
    service.asignarEquipoAIncidencia(7, null).subscribe();

    const req = httpMock.expectOne(`${base}/incidencias/7/equipo`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ equipo_id: null });
    req.flush({ id: 7 });
  });

  it('asignarEquipoAIncidencia() propaga el 409 de categoria incompatible', () => {
    let status: number | undefined;
    service.asignarEquipoAIncidencia(7, 99).subscribe({
      next: () => fail('no debería completarse con éxito'),
      error: (err) => {
        status = err.status;
      },
    });

    const req = httpMock.expectOne(`${base}/incidencias/7/equipo`);
    expect(req.request.method).toBe('PATCH');
    req.flush(
      { detail: 'Categoria del equipo incompatible con la incidencia' },
      { status: 409, statusText: 'Conflict' },
    );

    expect(status).toBe(409);
  });

  it('asignarEquipoAIncidencia() propaga el 404 cuando no existe', () => {
    let status: number | undefined;
    service.asignarEquipoAIncidencia(999, 1).subscribe({
      next: () => fail('no debería completarse con éxito'),
      error: (err) => {
        status = err.status;
      },
    });

    const req = httpMock.expectOne(`${base}/incidencias/999/equipo`);
    req.flush({ detail: 'No encontrado' }, { status: 404, statusText: 'Not Found' });

    expect(status).toBe(404);
  });
});
