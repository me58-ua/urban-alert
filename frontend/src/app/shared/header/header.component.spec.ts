import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { environment } from '../../../environments/environment';
import { HeaderComponent } from './header.component';
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

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;
  let httpMock: HttpTestingController;
  const base = environment.apiUrl;

  beforeEach(async () => {
    localStorage.clear();
    document.body.classList.remove('app-header-menu-open');
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    document.body.classList.remove('app-header-menu-open');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('usa el logo de marca local (no la URL de Figma)', () => {
    expect(component.brandMarkUrl).toBe('assets/media/images/logo-v3.png');
  });

  it('arranca cerrado y con aria-label "Abrir menú"', () => {
    fixture.detectChanges();
    expect(component.isOpen()).toBeFalse();
    expect(component.toggleLabel()).toBe('Abrir menú');
  });

  it('sin sesión: isAuthenticated() es false y no hay email/rol', () => {
    fixture.detectChanges();
    expect(component.isAuthenticated()).toBeFalse();
    expect(component.email()).toBeNull();
    expect(component.roleLabel()).toBeNull();
  });

  it('open() abre el panel, pide ?leida=false y cambia el aria-label', () => {
    component.open();

    const req = httpMock.expectOne(`${base}/notificaciones?leida=false`);
    expect(req.request.method).toBe('GET');
    req.flush([notif(1), notif(2), notif(3)]);

    expect(component.isOpen()).toBeTrue();
    expect(component.toggleLabel()).toBe('Cerrar menú');
    expect(component.unreadCount()).toBe(3);
    expect(document.body.classList.contains('app-header-menu-open')).toBeTrue();
  });

  it('toggle() abre y vuelve a cerrar; al cerrar restaura el scroll del body', () => {
    component.toggle(); // abre
    httpMock.expectOne(`${base}/notificaciones?leida=false`).flush([notif(1)]);
    expect(component.isOpen()).toBeTrue();
    expect(component.unreadCount()).toBe(1);
    expect(document.body.classList.contains('app-header-menu-open')).toBeTrue();

    component.toggle(); // cierra -> no vuelve a pedir
    expect(component.isOpen()).toBeFalse();
    expect(document.body.classList.contains('app-header-menu-open')).toBeFalse();
  });

  it('con sesión: refleja email y rol legible tras abrir el panel', () => {
    localStorage.setItem(TOKEN_KEY, 'jwt-123');
    localStorage.setItem(ROLE_KEY, 'admin');
    localStorage.setItem(EMAIL_KEY, 'admin@test.com');

    component.open();
    httpMock.expectOne(`${base}/notificaciones?leida=false`).flush([]);

    expect(component.isAuthenticated()).toBeTrue();
    expect(component.email()).toBe('admin@test.com');
    expect(component.roleLabel()).toBe('Administrador');
  });

  it('roleLabel() traduce el rol ciudadano', () => {
    localStorage.setItem(TOKEN_KEY, 'jwt-123');
    localStorage.setItem(ROLE_KEY, 'ciudadano');

    component.open();
    httpMock.expectOne(`${base}/notificaciones?leida=false`).flush([]);

    expect(component.roleLabel()).toBe('Ciudadano');
  });

  it('Escape cierra el panel cuando está abierto', () => {
    component.open();
    httpMock.expectOne(`${base}/notificaciones?leida=false`).flush([]);
    expect(component.isOpen()).toBeTrue();

    component.onEscape();
    expect(component.isOpen()).toBeFalse();
    expect(document.body.classList.contains('app-header-menu-open')).toBeFalse();
  });

  it('logout() cierra sesión, vuelve reactivo el estado y navega a /login', (done) => {
    const auth = TestBed.inject(AuthService);
    const router = TestBed.inject(Router);
    const logoutSpy = spyOn(auth, 'logout').and.callThrough();
    const navSpy = spyOn(router, 'navigateByUrl').and.resolveTo(true);

    localStorage.setItem(TOKEN_KEY, 'jwt-123');
    localStorage.setItem(EMAIL_KEY, 'admin@test.com');
    component.open();
    httpMock.expectOne(`${base}/notificaciones?leida=false`).flush([]);
    expect(component.isAuthenticated()).toBeTrue();

    component.logout(new Event('click'));

    expect(logoutSpy).toHaveBeenCalled();
    expect(component.isAuthenticated()).toBeFalse();
    expect(component.email()).toBeNull();
    expect(component.isOpen()).toBeFalse();

    // La navegación se hace en un setTimeout(0).
    setTimeout(() => {
      expect(navSpy).toHaveBeenCalledWith('/login');
      done();
    }, 0);
  });

  it('goTo() cierra el panel y navega a la ruta indicada', (done) => {
    const router = TestBed.inject(Router);
    const navSpy = spyOn(router, 'navigateByUrl').and.resolveTo(true);

    component.open();
    httpMock.expectOne(`${base}/notificaciones?leida=false`).flush([]);

    component.goTo('/mapa-incidencias', new Event('click'));
    expect(component.isOpen()).toBeFalse();

    setTimeout(() => {
      expect(navSpy).toHaveBeenCalledWith('/mapa-incidencias');
      done();
    }, 0);
  });

  // ── Badge de no leídas ──────────────────────────────────────────────────────
  it('unreadCount() arranca en 0 sin abrir el panel (no pide nada)', () => {
    fixture.detectChanges();
    expect(component.unreadCount()).toBe(0);
    // Sin open() no debe haber petición pendiente (verify en afterEach).
  });

  it('el item de notificaciones es el que recibe el badge (route /notificaciones)', () => {
    fixture.detectChanges();
    const notifItem = component.items.find((i) => i.route === '/notificaciones');
    expect(notifItem).withContext('debe existir el item de notificaciones').toBeTruthy();
    expect(notifItem!.label).toBe('Notificaciones');
  });

  it('si la petición de no leídas falla, el contador queda en 0', () => {
    component.refreshUnreadCount();
    httpMock
      .expectOne(`${base}/notificaciones?leida=false`)
      .flush('boom', { status: 500, statusText: 'Server Error' });

    expect(component.unreadCount()).toBe(0);
  });

  it('subtitle es opcional y se proyecta cuando se asigna', () => {
    component.subtitle = 'Mis incidencias';
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const subtitle = el.querySelector('.app-header__subtitle');
    expect(subtitle?.textContent?.trim()).toBe('Mis incidencias');
  });
});
