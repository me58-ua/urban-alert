import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import { Usuario, UsuariosPage, UsersService } from '../services/users.service';
import { UsersManagementPage } from './users-management.page';

describe('UsersManagementPage', () => {
  let component: UsersManagementPage;
  let fixture: ComponentFixture<UsersManagementPage>;
  let usersServiceSpy: jasmine.SpyObj<UsersService>;

  const usuarios: Usuario[] = [
    { id: 1, email: 'admin@urban-alert.local', rol: 'admin', activo: true },
    { id: 2, email: 'laura@example.com', rol: 'ciudadano', activo: true },
    { id: 3, email: 'diego@example.com', rol: 'ciudadano', activo: false },
  ];

  const page: UsuariosPage = { items: usuarios, total: 3, limit: 20, offset: 0 };

  beforeEach(async () => {
    usersServiceSpy = jasmine.createSpyObj<UsersService>('UsersService', [
      'listar',
      'crear',
      'actualizarEmail',
      'eliminar',
      'cambiarRol',
      'cambiarEstado',
    ]);
    usersServiceSpy.listar.and.returnValue(of(page));
    usersServiceSpy.crear.and.returnValue(of(usuarios[1]));
    usersServiceSpy.actualizarEmail.and.returnValue(of(usuarios[1]));
    usersServiceSpy.eliminar.and.returnValue(of(undefined));
    usersServiceSpy.cambiarRol.and.returnValue(of({ ...usuarios[1], rol: 'admin' }));
    usersServiceSpy.cambiarEstado.and.returnValue(of({ ...usuarios[2], activo: true }));

    await TestBed.configureTestingModule({
      imports: [UsersManagementPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: UsersService, useValue: usersServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UsersManagementPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('carga los usuarios reales desde listar(limit, offset) en ngOnInit y guarda el total', () => {
    fixture.detectChanges(); // dispara ngOnInit

    expect(usersServiceSpy.listar).toHaveBeenCalledTimes(1);
    expect(usersServiceSpy.listar).toHaveBeenCalledWith(20, 0);
    expect(component.users().length).toBe(3);
    expect(component.total()).toBe(3);
    expect(component.adminCount()).toBe(1);
    expect(component.activeCount()).toBe(2);
    expect(component.loading()).toBeFalse();
    expect(component.error()).toBeNull();
  });

  it('muestra un mensaje de error si listar() falla', () => {
    usersServiceSpy.listar.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 500, statusText: 'Server Error' })),
    );

    fixture.detectChanges();

    expect(component.users().length).toBe(0);
    expect(component.error()).toBe('No se pudieron cargar los usuarios.');
    expect(component.loading()).toBeFalse();
  });

  it('createUser() llama crear() con email/password/rol y recarga la lista', () => {
    fixture.detectChanges();
    usersServiceSpy.listar.calls.reset();

    component.newUser = { email: ' nuevo@example.com ', password: 'secreto', rol: 'admin' };
    component.createUser();

    expect(usersServiceSpy.crear).toHaveBeenCalledWith({
      email: 'nuevo@example.com',
      password: 'secreto',
      rol: 'admin',
    });
    expect(usersServiceSpy.listar).toHaveBeenCalledTimes(1);
    // formulario reseteado
    expect(component.newUser).toEqual({ email: '', password: '', rol: 'ciudadano' });
  });

  it('createUser() no llama crear() si falta email o password', () => {
    fixture.detectChanges();

    component.newUser = { email: '', password: 'x', rol: 'ciudadano' };
    component.createUser();
    component.newUser = { email: 'a@b.com', password: '', rol: 'ciudadano' };
    component.createUser();

    expect(usersServiceSpy.crear).not.toHaveBeenCalled();
  });

  it('createUser() muestra el detalle del backend cuando el email esta duplicado (400)', () => {
    fixture.detectChanges();
    usersServiceSpy.crear.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            statusText: 'Bad Request',
            error: { detail: 'El email ya existe' },
          }),
      ),
    );

    component.newUser = { email: 'dup@example.com', password: 'x', rol: 'ciudadano' };
    component.createUser();

    expect(component.error()).toBe('El email ya existe');
  });

  it('saveEdit() actualiza el email y recarga; cancela la edicion', () => {
    fixture.detectChanges();
    usersServiceSpy.listar.calls.reset();

    component.startEdit(usuarios[1]);
    component.draftEmail = '  cambiado@example.com ';
    component.saveEdit(2);

    expect(usersServiceSpy.actualizarEmail).toHaveBeenCalledWith(2, 'cambiado@example.com');
    expect(usersServiceSpy.listar).toHaveBeenCalledTimes(1);
    expect(component.editingUserId()).toBeNull();
  });

  it('changeRole() llama cambiarRol() y recarga', () => {
    fixture.detectChanges();
    usersServiceSpy.listar.calls.reset();

    component.changeRole(2, 'admin');

    expect(usersServiceSpy.cambiarRol).toHaveBeenCalledWith(2, 'admin');
    expect(usersServiceSpy.listar).toHaveBeenCalledTimes(1);
  });

  it('changeEstado() llama cambiarEstado() y recarga', () => {
    fixture.detectChanges();
    usersServiceSpy.listar.calls.reset();

    component.changeEstado(3, true);

    expect(usersServiceSpy.cambiarEstado).toHaveBeenCalledWith(3, true);
    expect(usersServiceSpy.listar).toHaveBeenCalledTimes(1);
  });

  it('deleteUser() elimina y recarga; muestra error 400 si te borras a ti mismo', () => {
    fixture.detectChanges();
    usersServiceSpy.listar.calls.reset();

    component.deleteUser(2);
    expect(usersServiceSpy.eliminar).toHaveBeenCalledWith(2);
    expect(usersServiceSpy.listar).toHaveBeenCalledTimes(1);

    usersServiceSpy.eliminar.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            statusText: 'Bad Request',
            error: { detail: 'No puedes eliminarte a ti mismo' },
          }),
      ),
    );
    component.deleteUser(1);
    expect(component.error()).toBe('No puedes eliminarte a ti mismo');
  });

  it('changeEstado() muestra el detalle del backend en autodesactivacion (400)', () => {
    fixture.detectChanges();
    usersServiceSpy.cambiarEstado.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            statusText: 'Bad Request',
            error: { detail: 'No puedes desactivarte a ti mismo' },
          }),
      ),
    );

    component.changeEstado(1, false);

    expect(component.error()).toBe('No puedes desactivarte a ti mismo');
  });

  it('nextPage()/prevPage() pasan limit/offset a listar() y actualizan el rango', () => {
    // 25 usuarios en total -> dos páginas (0..19 y 20..24).
    usersServiceSpy.listar.and.returnValue(
      of({ items: usuarios, total: 25, limit: 20, offset: 0 }),
    );
    fixture.detectChanges();

    expect(component.offset()).toBe(0);
    expect(component.total()).toBe(25);
    expect(component.canPrev()).toBeFalse();
    expect(component.canNext()).toBeTrue();
    expect(component.rangeLabel()).toBe('1-20 de 25');

    usersServiceSpy.listar.calls.reset();
    usersServiceSpy.listar.and.returnValue(
      of({ items: usuarios, total: 25, limit: 20, offset: 20 }),
    );
    component.nextPage();

    expect(usersServiceSpy.listar).toHaveBeenCalledWith(20, 20);
    expect(component.offset()).toBe(20);
    expect(component.canPrev()).toBeTrue();
    expect(component.canNext()).toBeFalse();
    expect(component.rangeLabel()).toBe('21-25 de 25');

    usersServiceSpy.listar.calls.reset();
    usersServiceSpy.listar.and.returnValue(
      of({ items: usuarios, total: 25, limit: 20, offset: 0 }),
    );
    component.prevPage();

    expect(usersServiceSpy.listar).toHaveBeenCalledWith(20, 0);
    expect(component.offset()).toBe(0);
    expect(component.canPrev()).toBeFalse();
  });

  it('prevPage() no hace nada en la primera página; nextPage() no pasa de la última', () => {
    fixture.detectChanges(); // total = 3, una sola página
    usersServiceSpy.listar.calls.reset();

    component.prevPage();
    component.nextPage();

    expect(usersServiceSpy.listar).not.toHaveBeenCalled();
    expect(component.offset()).toBe(0);
    expect(component.canPrev()).toBeFalse();
    expect(component.canNext()).toBeFalse();
  });
});
