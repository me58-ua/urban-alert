import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import {
  AuthService,
  EMAIL_KEY,
  ROLE_KEY,
  TOKEN_KEY,
  TokenResponse,
  Usuario,
} from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  const base = environment.apiUrl;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('login hace POST form-urlencoded a {apiUrl}/auth/login y guarda el token', () => {
    const fake: TokenResponse = { access_token: 'jwt-123', token_type: 'bearer' };

    service.login('user@test.com', 'secret').subscribe((res) => {
      expect(res).toEqual(fake);
    });

    const req = httpMock.expectOne(`${base}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Content-Type')).toBe(
      'application/x-www-form-urlencoded',
    );
    expect(req.request.body).toContain('username=user@test.com');
    expect(req.request.body).toContain('password=secret');
    req.flush(fake);

    expect(localStorage.getItem(TOKEN_KEY)).toBe('jwt-123');
  });

  it('register hace POST JSON a {apiUrl}/auth/register', () => {
    const fake: Usuario = { id: 1, email: 'new@test.com', rol: 'ciudadano' };

    service.register('new@test.com', 'pwd').subscribe((res) => {
      expect(res).toEqual(fake);
    });

    const req = httpMock.expectOne(`${base}/auth/register`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'new@test.com', password: 'pwd' });
    req.flush(fake);
  });

  it('me hace GET /auth/me y persiste el rol y el email reales', () => {
    const fake: Usuario = { id: 2, email: 'admin@test.com', rol: 'admin' };

    service.me().subscribe((res) => {
      expect(res).toEqual(fake);
    });

    const req = httpMock.expectOne(`${base}/auth/me`);
    expect(req.request.method).toBe('GET');
    req.flush(fake);

    expect(service.role()).toBe('admin');
    expect(localStorage.getItem(ROLE_KEY)).toBe('admin');
    expect(service.email()).toBe('admin@test.com');
    expect(localStorage.getItem(EMAIL_KEY)).toBe('admin@test.com');
  });

  it('logout limpia token, rol y email del almacenamiento', () => {
    localStorage.setItem(TOKEN_KEY, 'jwt-123');
    localStorage.setItem(ROLE_KEY, 'admin');
    localStorage.setItem(EMAIL_KEY, 'admin@test.com');

    service.logout();

    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(ROLE_KEY)).toBeNull();
    expect(localStorage.getItem(EMAIL_KEY)).toBeNull();
    expect(service.isAuthenticated()).toBeFalse();
    expect(service.role()).toBeNull();
    expect(service.email()).toBeNull();
  });

  it('token() / isAuthenticated() reflejan el estado de sesión', () => {
    expect(service.isAuthenticated()).toBeFalse();
    expect(service.token()).toBeNull();

    localStorage.setItem(TOKEN_KEY, 'abc');
    expect(service.isAuthenticated()).toBeTrue();
    expect(service.token()).toBe('abc');
  });

  it('email() devuelve el email persistido o null', () => {
    expect(service.email()).toBeNull();

    localStorage.setItem(EMAIL_KEY, 'user@test.com');
    expect(service.email()).toBe('user@test.com');
  });
});
