import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService, TOKEN_KEY } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let auth: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('añade la cabecera Bearer cuando hay token', () => {
    localStorage.setItem(TOKEN_KEY, 'jwt-abc');

    http.get('/protegido').subscribe();

    const req = httpMock.expectOne('/protegido');
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-abc');
    req.flush({});
  });

  it('no añade cabecera cuando no hay token', () => {
    http.get('/publico').subscribe();

    const req = httpMock.expectOne('/publico');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('ante un 401 hace logout y redirige a /login', () => {
    localStorage.setItem(TOKEN_KEY, 'jwt-abc');
    const router = TestBed.inject(Router);
    const navSpy = spyOn(router, 'navigateByUrl');
    const logoutSpy = spyOn(auth, 'logout').and.callThrough();

    http.get('/protegido').subscribe({
      next: () => fail('debería fallar'),
      error: () => {
        /* esperado */
      },
    });

    const req = httpMock.expectOne('/protegido');
    req.flush('no autorizado', { status: 401, statusText: 'Unauthorized' });

    expect(logoutSpy).toHaveBeenCalled();
    expect(navSpy).toHaveBeenCalledWith('/login');
  });
});
