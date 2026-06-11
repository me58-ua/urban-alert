import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { environment } from '../../../environments/environment';
import { AppMenuComponent } from './app-menu.component';
import { Notificacion } from '../../services/notificaciones.service';
import {
  AuthService,
  EMAIL_KEY,
  ROLE_KEY,
  TOKEN_KEY,
} from '../../services/auth.service';

function notif(id: number, leida = false): Notificacion {
  return {
    id,
    incidencia_id: 1,
    mensaje: `Aviso ${id}`,
    estado_nuevo: 'en_progreso',
    leida,
    fecha_creacion: '2026-06-01T10:00:00Z',
  };
}

describe('AppMenuComponent', () => {
  let component: AppMenuComponent;
  let fixture: ComponentFixture<AppMenuComponent>;
  let httpMock: HttpTestingController;
  const base = environment.apiUrl;

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
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

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
    httpMock.expectOne(`${base}/notificaciones?leida=false`).flush([]);

    expect(component.isAuthenticated()).toBeTrue();
    expect(component.email()).toBe('admin@test.com');
    expect(component.roleLabel()).toBe('Administrador');
  });

  it('roleLabel() traduce el rol ciudadano', () => {
    localStorage.setItem(TOKEN_KEY, 'jwt-123');
    localStorage.setItem(ROLE_KEY, 'ciudadano');

    component.toggle(new Event('click'));
    httpMock.expectOne(`${base}/notificaciones?leida=false`).flush([]);

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
    httpMock.expectOne(`${base}/notificaciones?leida=false`).flush([]);
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

  // ── Badge de no leídas (#64) ────────────────────────────────────────────────
  it('unreadCount() arranca en 0 sin abrir el menú (no pide nada)', () => {
    fixture.detectChanges();
    expect(component.unreadCount()).toBe(0);
    // Sin toggle no debe haber petición pendiente (verify en afterEach).
  });

  it('al abrir el menú pide ?leida=false y fija el nº de no leídas', () => {
    component.toggle(new Event('click'));

    const req = httpMock.expectOne(`${base}/notificaciones?leida=false`);
    expect(req.request.method).toBe('GET');
    req.flush([notif(1), notif(2), notif(3)]);

    expect(component.unreadCount()).toBe(3);
  });

  it('el item de notificaciones es el que recibe el badge (route /notificaciones)', () => {
    fixture.detectChanges();
    const notifItem = component.items.find((i) => i.route === '/notificaciones');
    expect(notifItem).withContext('debe existir el item de notificaciones').toBeTruthy();
    expect(notifItem!.label).toBe('Notificaciones');
  });

  it('el badge sólo se muestra cuando unreadCount() > 0', () => {
    // La plantilla condiciona el ion-badge a (route === /notificaciones && unreadCount() > 0).
    component.refreshUnreadCount();
    httpMock.expectOne(`${base}/notificaciones?leida=false`).flush([]);
    expect(component.unreadCount()).toBe(0);

    component.refreshUnreadCount();
    httpMock.expectOne(`${base}/notificaciones?leida=false`).flush([notif(1), notif(2)]);
    expect(component.unreadCount()).toBe(2);
  });

  it('si la petición de no leídas falla, el contador queda en 0', () => {
    component.refreshUnreadCount();
    httpMock
      .expectOne(`${base}/notificaciones?leida=false`)
      .flush('boom', { status: 500, statusText: 'Server Error' });

    expect(component.unreadCount()).toBe(0);
  });

  it('cerrar el menú (segundo toggle) no vuelve a pedir las no leídas', () => {
    component.toggle(new Event('click')); // abre -> pide
    httpMock.expectOne(`${base}/notificaciones?leida=false`).flush([notif(1)]);
    expect(component.unreadCount()).toBe(1);

    component.toggle(new Event('click')); // cierra -> no pide
    // verify() en afterEach garantiza que no quedó ninguna petición pendiente.
  });
});
