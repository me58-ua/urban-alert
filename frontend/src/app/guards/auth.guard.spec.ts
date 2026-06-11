import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { provideRouter } from '@angular/router';
import { TOKEN_KEY } from '../services/auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
  });

  afterEach(() => localStorage.clear());

  const run = () =>
    TestBed.runInInjectionContext(() =>
      authGuard(
        {} as never,
        {} as never,
      ),
    );

  it('permite el acceso cuando hay sesión iniciada', () => {
    localStorage.setItem(TOKEN_KEY, 'un-token-cualquiera');
    expect(run()).toBeTrue();
  });

  it('redirige a /login cuando no hay sesión', () => {
    const result = run();
    expect(result instanceof UrlTree).toBeTrue();
    const expected = TestBed.inject(Router).parseUrl('/login');
    expect((result as UrlTree).toString()).toBe(expected.toString());
  });
});
