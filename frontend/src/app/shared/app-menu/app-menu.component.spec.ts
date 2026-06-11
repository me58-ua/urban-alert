import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { AppMenuComponent } from './app-menu.component';
import {
  AuthService,
  EMAIL_KEY,
  ROLE_KEY,
  TOKEN_KEY,
} from '../../services/auth.service';

describe('AppMenuComponent', () => {
  let component: AppMenuComponent;
  let fixture: ComponentFixture<AppMenuComponent>;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppMenuComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => localStorage.clear());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('sin sesión: isAuthenticated() es false y no hay email/rol', () => {
    fixture.detectChanges();
    expect(component.isAuthenticated()).toBeFalse();
    expect(component.email()).toBeNull();
    expect(component.roleLabel()).toBeNull();
  });

  it('con sesión: refleja email y rol legible tras abrir el menú', () => {
    localStorage.setItem(TOKEN_KEY, 'jwt-123');
    localStorage.setItem(ROLE_KEY, 'admin');
    localStorage.setItem(EMAIL_KEY, 'admin@test.com');

    // toggle() refresca el estado de sesión derivado de localStorage.
    component.toggle(new Event('click'));

    expect(component.isAuthenticated()).toBeTrue();
    expect(component.email()).toBe('admin@test.com');
    expect(component.roleLabel()).toBe('Administrador');
  });

  it('roleLabel() traduce el rol ciudadano', () => {
    localStorage.setItem(TOKEN_KEY, 'jwt-123');
    localStorage.setItem(ROLE_KEY, 'ciudadano');

    component.toggle(new Event('click'));

    expect(component.roleLabel()).toBe('Ciudadano');
  });

  it('logout() cierra sesión, vuelve reactivo el estado y navega a /login', (done) => {
    const auth = TestBed.inject(AuthService);
    const router = TestBed.inject(Router);
    const logoutSpy = spyOn(auth, 'logout').and.callThrough();
    const navSpy = spyOn(router, 'navigateByUrl').and.resolveTo(true);

    localStorage.setItem(TOKEN_KEY, 'jwt-123');
    localStorage.setItem(EMAIL_KEY, 'admin@test.com');
    component.toggle(new Event('click'));
    expect(component.isAuthenticated()).toBeTrue();

    component.logout(new Event('click'));

    expect(logoutSpy).toHaveBeenCalled();
    expect(component.isAuthenticated()).toBeFalse();
    expect(component.email()).toBeNull();

    // La navegación se hace en un setTimeout(0).
    setTimeout(() => {
      expect(navSpy).toHaveBeenCalledWith('/login');
      done();
    }, 0);
  });
});
