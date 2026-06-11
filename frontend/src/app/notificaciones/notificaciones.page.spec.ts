import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { Notificacion, NotificacionesService } from '../services/notificaciones.service';
import { NotificacionesPage } from './notificaciones.page';

/** Stub controlable de NotificacionesService. */
class NotificacionesServiceStub {
  listarResponse: Notificacion[] = [];
  listarShouldFail = false;

  listar = jasmine.createSpy('listar').and.callFake(() =>
    this.listarShouldFail
      ? throwError(() => ({ status: 500 }))
      : of(this.listarResponse),
  );

  marcarLeida = jasmine.createSpy('marcarLeida').and.callFake((id: number) =>
    of({ ...notif(id), leida: true }),
  );
}

function notif(id: number, leida = false): Notificacion {
  return {
    id,
    incidencia_id: 10,
    mensaje: `Cambio de estado #${id}`,
    estado_nuevo: 'en_progreso',
    leida,
    fecha_creacion: '2026-06-10T12:00:00Z',
  };
}

describe('NotificacionesPage', () => {
  let stub: NotificacionesServiceStub;

  function setup(): {
    component: NotificacionesPage;
    fixture: ComponentFixture<NotificacionesPage>;
  } {
    stub = new NotificacionesServiceStub();

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: NotificacionesService, useValue: stub },
      ],
    });

    const fixture = TestBed.createComponent(NotificacionesPage);
    const component = fixture.componentInstance;
    return { component, fixture };
  }

  it('al iniciar pide listar() y carga las notificaciones (loading -> false)', () => {
    const { component } = setup();
    stub.listarResponse = [notif(3, false), notif(2, true)];

    // El constructor ya disparó cargar() con la respuesta por defecto (vacía).
    // Volvemos a cargar para usar la respuesta configurada.
    component.cargar();

    expect(stub.listar).toHaveBeenCalled();
    expect(component.loading()).toBeFalse();
    expect(component.error()).toBeNull();
    expect(component.items().length).toBe(2);
    expect(component.items()[0].id).toBe(3);
  });

  it('si listar() falla muestra error y deja de cargar', () => {
    const { component } = setup();
    stub.listarShouldFail = true;

    component.cargar();

    expect(component.loading()).toBeFalse();
    expect(component.error()).not.toBeNull();
    expect(component.items().length).toBe(0);
  });

  it('marcarLeida() llama al servicio y actualiza ese item a leida:true', () => {
    const { component } = setup();
    stub.listarResponse = [notif(3, false), notif(4, false)];
    component.cargar();

    expect(component.items()[0].leida).toBeFalse();

    component.marcarLeida(3);

    expect(stub.marcarLeida).toHaveBeenCalledWith(3);
    const actualizada = component.items().find((n) => n.id === 3);
    const otra = component.items().find((n) => n.id === 4);
    expect(actualizada?.leida).toBeTrue();
    // El resto de items no se ven afectados.
    expect(otra?.leida).toBeFalse();
    expect(component.isMarking(3)).toBeFalse();
  });

  it('formatStatus() traduce estados conocidos y titula los desconocidos', () => {
    const { component } = setup();
    expect(component.formatStatus('en_progreso')).toBe('En progreso');
    expect(component.formatStatus('algo_raro')).toBe('Algo Raro');
  });
});
