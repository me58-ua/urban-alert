import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { AdminMenuComponent } from './admin-menu.component';
import { AuthService } from '../../services/auth.service';

describe('AdminMenuComponent', () => {
  let component: AdminMenuComponent;
  let fixture: ComponentFixture<AdminMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminMenuComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('expone los 6 enlaces de navegación admin con sus rutas', () => {
    const routes = component.menuItems.map((item) => item.route);
    expect(component.menuItems.length).toBe(6);
    expect(routes).toEqual([
      '/admin',
      '/admin/incidencias',
      '/admin/equipos',
      '/admin/usuarios',
      '/mapa-incidencias',
      '/home',
    ]);
  });

  it('openMenu() abre el popover y guarda el evento', () => {
    const event = new Event('click');
    component.openMenu(event);

    expect(component.isMenuOpen()).toBeTrue();
    expect(component.popoverEvent()).toBe(event);
  });

  it('closeMenu() cierra el popover y limpia el evento', () => {
    component.openMenu(new Event('click'));
    component.closeMenu();

    expect(component.isMenuOpen()).toBeFalse();
    expect(component.popoverEvent()).toBeUndefined();
  });

  it('logout() cierra el menú, cierra sesión y navega a /login', () => {
    const auth = TestBed.inject(AuthService);
    const router = TestBed.inject(Router);
    const logoutSpy = spyOn(auth, 'logout');
    const navSpy = spyOn(router, 'navigateByUrl').and.resolveTo(true);

    component.openMenu(new Event('click'));
    component.logout();

    expect(logoutSpy).toHaveBeenCalled();
    expect(navSpy).toHaveBeenCalledWith('/login');
    expect(component.isMenuOpen()).toBeFalse();
  });
});
