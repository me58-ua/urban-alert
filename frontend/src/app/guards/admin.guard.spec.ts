import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { provideRouter } from '@angular/router';
import { ROLE_KEY } from '../services/auth.service';
import { adminGuard } from './admin.guard';

describe('adminGuard', () => {
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
      adminGuard(
        {} as never,
        {} as never,
      ),
    );

  it('permite el acceso cuando el rol es admin', () => {
    localStorage.setItem(ROLE_KEY, 'admin');
    expect(run()).toBeTrue();
  });

  it('redirige a /home cuando el rol no es admin', () => {
    localStorage.setItem(ROLE_KEY, 'ciudadano');
    const result = run();
    expect(result instanceof UrlTree).toBeTrue();
    const expected = TestBed.inject(Router).parseUrl('/home');
    expect((result as UrlTree).toString()).toBe(expected.toString());
  });

  it('redirige a /home cuando no hay rol', () => {
    const result = run();
    expect(result instanceof UrlTree).toBeTrue();
  });
});
