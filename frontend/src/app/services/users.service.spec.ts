import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { Usuario, UsuariosPage, UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let httpMock: HttpTestingController;
  const base = environment.apiUrl;

  const usuario: Usuario = {
    id: 1,
    email: 'admin@urban-alert.local',
    rol: 'admin',
    activo: true,
  };

  const page: UsuariosPage = {
    items: [
      usuario,
      { id: 2, email: 'laura@example.com', rol: 'ciudadano', activo: true },
      { id: 3, email: 'diego@example.com', rol: 'ciudadano', activo: false },
    ],
    total: 3,
    limit: 20,
    offset: 0,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        UsersService,
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(UsersService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('listar() sin argumentos hace GET a {apiUrl}/users (sin params) y devuelve la pagina', () => {
    let received: UsuariosPage | undefined;
    service.listar().subscribe((res) => (received = res));

    const req = httpMock.expectOne(`${base}/users`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys().length).toBe(0);
    req.flush(page);

    expect(received).toEqual(page);
    expect(received?.items.length).toBe(3);
    expect(received?.total).toBe(3);
  });

  it('listar(limit, offset) añade los query params', () => {
    service.listar(10, 20).subscribe();

    const req = httpMock.expectOne(
      (r) => r.url === `${base}/users` && r.params.get('limit') === '10' && r.params.get('offset') === '20',
    );
    expect(req.request.method).toBe('GET');
    req.flush(page);
  });

  it('crear() hace POST a {apiUrl}/users con email/password/rol', () => {
    let received: Usuario | undefined;
    const body = { email: 'nuevo@example.com', password: 'secreto', rol: 'ciudadano' as const };
    service.crear(body).subscribe((res) => (received = res));

    const req = httpMock.expectOne(`${base}/users`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    const creado: Usuario = { id: 9, email: 'nuevo@example.com', rol: 'ciudadano', activo: true };
    req.flush(creado);

    expect(received).toEqual(creado);
  });

  it('actualizarEmail() hace PATCH a {apiUrl}/users/{id} con {email}', () => {
    let received: Usuario | undefined;
    service.actualizarEmail(2, 'cambiado@example.com').subscribe((res) => (received = res));

    const req = httpMock.expectOne(`${base}/users/2`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ email: 'cambiado@example.com' });
    const actualizado: Usuario = { id: 2, email: 'cambiado@example.com', rol: 'ciudadano', activo: true };
    req.flush(actualizado);

    expect(received).toEqual(actualizado);
  });

  it('eliminar() hace DELETE a {apiUrl}/users/{id}', () => {
    let completed = false;
    service.eliminar(3).subscribe(() => (completed = true));

    const req = httpMock.expectOne(`${base}/users/3`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);

    expect(completed).toBeTrue();
  });

  it('eliminar() propaga el 400 si te borras a ti mismo', () => {
    let errorStatus: number | undefined;
    service.eliminar(1).subscribe({
      next: () => fail('no deberia completar'),
      error: (err) => (errorStatus = err.status),
    });

    const req = httpMock.expectOne(`${base}/users/1`);
    req.flush({ detail: 'No puedes eliminarte a ti mismo' }, { status: 400, statusText: 'Bad Request' });

    expect(errorStatus).toBe(400);
  });

  it('cambiarRol() hace PATCH a {apiUrl}/users/{id}/rol con {rol}', () => {
    let received: Usuario | undefined;
    service.cambiarRol(2, 'admin').subscribe((res) => (received = res));

    const req = httpMock.expectOne(`${base}/users/2/rol`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ rol: 'admin' });
    const actualizado: Usuario = { id: 2, email: 'laura@example.com', rol: 'admin', activo: true };
    req.flush(actualizado);

    expect(received?.rol).toBe('admin');
  });

  it('cambiarEstado() hace PATCH a {apiUrl}/users/{id}/estado con {activo}', () => {
    let received: Usuario | undefined;
    service.cambiarEstado(3, true).subscribe((res) => (received = res));

    const req = httpMock.expectOne(`${base}/users/3/estado`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ activo: true });
    const actualizado: Usuario = { id: 3, email: 'diego@example.com', rol: 'ciudadano', activo: true };
    req.flush(actualizado);

    expect(received?.activo).toBeTrue();
  });
});
