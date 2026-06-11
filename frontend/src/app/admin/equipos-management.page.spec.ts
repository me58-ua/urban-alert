import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { Equipo, EquiposService, Trabajador } from '../services/equipos.service';
import {
  Incidencia,
  IncidenciaPage,
  IncidenciasService,
} from '../services/incidencias.service';
import { EquiposManagementPage } from './equipos-management.page';

function makeIncidencia(overrides: Partial<Incidencia> = {}): Incidencia {
  return {
    id: 1,
    titulo: 'Farola fundida',
    descripcion: null,
    categoria: 'alumbrado',
    prioridad: 'media',
    estado: 'abierta',
    latitud: 38.3852,
    longitud: -0.5132,
    fecha_creacion: '2026-06-01T10:00:00Z',
    fecha_actualizacion: '2026-06-01T10:00:00Z',
    imagenes: [],
    historial: [],
    ...overrides,
  };
}

describe('EquiposManagementPage', () => {
  let component: EquiposManagementPage;
  let equiposSpy: jasmine.SpyObj<EquiposService>;
  let incidenciasSpy: jasmine.SpyObj<IncidenciasService>;

  const trabajador: Trabajador = {
    id: 10,
    nombre: 'Laura Martin',
    puesto: 'Electricista',
    disponible: true,
    equipo_id: 1,
  };

  const trabajadorSinEquipo: Trabajador = {
    id: 20,
    nombre: 'Marta Solo',
    puesto: null,
    disponible: false,
    equipo_id: null,
  };

  const equipoAlumbrado: Equipo = {
    id: 1,
    nombre: 'Luz Norte',
    categoria: 'alumbrado',
    trabajadores: [trabajador],
  };

  const equipoResiduos: Equipo = {
    id: 2,
    nombre: 'Limpieza Centro',
    categoria: 'residuos',
    trabajadores: [],
  };

  const incidenciasPage: IncidenciaPage = {
    items: [
      makeIncidencia({ id: 1, categoria: 'alumbrado' }),
      makeIncidencia({ id: 2, categoria: 'residuos', titulo: 'Contenedor lleno' }),
    ],
    total: 2,
    limit: 20,
    offset: 0,
  };

  function build(): void {
    equiposSpy = jasmine.createSpyObj<EquiposService>('EquiposService', [
      'listarEquipos',
      'crearEquipo',
      'actualizarEquipo',
      'eliminarEquipo',
      'crearTrabajador',
      'quitarTrabajador',
      'asignarEquipoAIncidencia',
      'listarTrabajadores',
      'actualizarTrabajador',
      'eliminarTrabajador',
    ]);
    incidenciasSpy = jasmine.createSpyObj<IncidenciasService>('IncidenciasService', [
      'listar',
    ]);

    equiposSpy.listarEquipos.and.returnValue(of([equipoAlumbrado, equipoResiduos]));
    equiposSpy.listarTrabajadores.and.returnValue(of([trabajador, trabajadorSinEquipo]));
    incidenciasSpy.listar.and.returnValue(of(incidenciasPage));

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: EquiposService, useValue: equiposSpy },
        { provide: IncidenciasService, useValue: incidenciasSpy },
      ],
    });

    const fixture = TestBed.createComponent(EquiposManagementPage);
    component = fixture.componentInstance;
  }

  beforeEach(() => build());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit carga equipos e incidencias y selecciona el primer equipo', () => {
    component.ngOnInit();

    expect(equiposSpy.listarEquipos).toHaveBeenCalledTimes(1);
    expect(incidenciasSpy.listar).toHaveBeenCalledTimes(1);
    expect(component.equipos().length).toBe(2);
    expect(component.incidencias().length).toBe(2);
    expect(component.selectedTeam()?.id).toBe(1);
    expect(component.draftName).toBe('Luz Norte');
    expect(component.draftCategory).toBe('alumbrado');
    expect(component.loading()).toBeFalse();
  });

  it('availableWorkersCount cuenta trabajadores disponibles de todos los equipos', () => {
    component.ngOnInit();
    expect(component.availableWorkersCount()).toBe(1);
  });

  it('error al cargar equipos rellena error() y no rompe', () => {
    equiposSpy.listarEquipos.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 500, statusText: 'Server' })),
    );
    component.loadTeams();
    expect(component.error()).toBe('No se pudieron cargar los equipos.');
    expect(component.loading()).toBeFalse();
  });

  it('error al cargar incidencias no bloquea la gestion de equipos', () => {
    incidenciasSpy.listar.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 500, statusText: 'Server' })),
    );
    component.loadIncidents();
    expect(component.incidentsError()).toContain('No se pudieron cargar las incidencias');
    expect(component.incidencias().length).toBe(0);
  });

  it('createTeam() llama crearEquipo y recarga equipos', () => {
    component.ngOnInit();
    equiposSpy.crearEquipo.and.returnValue(
      of({ id: 3, nombre: 'Nuevo', categoria: 'trafico', trabajadores: [] }),
    );

    component.newTeam = { nombre: '  Nuevo  ', categoria: 'trafico' };
    component.createTeam();

    expect(equiposSpy.crearEquipo).toHaveBeenCalledWith({
      nombre: 'Nuevo',
      categoria: 'trafico',
    });
    // recarga: listarEquipos llamado de nuevo (init + create).
    expect(equiposSpy.listarEquipos).toHaveBeenCalledTimes(2);
    expect(component.newTeam.nombre).toBe('');
  });

  it('createTeam() no llama al backend con nombre vacío', () => {
    component.newTeam = { nombre: '   ', categoria: 'otro' };
    component.createTeam();
    expect(equiposSpy.crearEquipo).not.toHaveBeenCalled();
  });

  it('saveTeam() llama actualizarEquipo con los borradores', () => {
    component.ngOnInit();
    equiposSpy.actualizarEquipo.and.returnValue(of(equipoAlumbrado));

    component.draftName = 'Luz Sur';
    component.draftCategory = 'trafico';
    component.saveTeam(1);

    expect(equiposSpy.actualizarEquipo).toHaveBeenCalledWith(1, {
      nombre: 'Luz Sur',
      categoria: 'trafico',
    });
  });

  it('deleteTeam() elimina y limpia la selección si era el equipo activo', () => {
    component.ngOnInit();
    equiposSpy.eliminarEquipo.and.returnValue(of(void 0));
    // Tras borrar, listarEquipos devuelve solo el de residuos.
    equiposSpy.listarEquipos.and.returnValue(of([equipoResiduos]));

    component.deleteTeam(1);

    expect(equiposSpy.eliminarEquipo).toHaveBeenCalledWith(1);
    // Reseleccionado al primero disponible.
    expect(component.selectedTeam()?.id).toBe(2);
  });

  it('addWorker() crea trabajador en el equipo seleccionado', () => {
    component.ngOnInit();
    equiposSpy.crearTrabajador.and.returnValue(
      of({ id: 99, nombre: 'Hugo', puesto: 'Operario', disponible: true, equipo_id: 1 }),
    );

    component.newWorker = { nombre: 'Hugo', puesto: 'Operario' };
    component.addWorker();

    expect(equiposSpy.crearTrabajador).toHaveBeenCalledWith(1, {
      nombre: 'Hugo',
      puesto: 'Operario',
    });
    expect(component.newWorker.nombre).toBe('');
  });

  it('addWorker() envía puesto null cuando se deja vacío', () => {
    component.ngOnInit();
    equiposSpy.crearTrabajador.and.returnValue(
      of({ id: 99, nombre: 'Hugo', puesto: null, disponible: true, equipo_id: 1 }),
    );

    component.newWorker = { nombre: 'Hugo', puesto: '   ' };
    component.addWorker();

    expect(equiposSpy.crearTrabajador).toHaveBeenCalledWith(1, {
      nombre: 'Hugo',
      puesto: null,
    });
  });

  it('removeWorker() llama quitarTrabajador', () => {
    component.ngOnInit();
    equiposSpy.quitarTrabajador.and.returnValue(of(void 0));

    component.removeWorker(1, 10);
    expect(equiposSpy.quitarTrabajador).toHaveBeenCalledWith(1, 10);
  });

  it('eligibleTeams() solo devuelve equipos de la misma categoría que la incidencia', () => {
    component.ngOnInit();

    const incAlumbrado = makeIncidencia({ id: 1, categoria: 'alumbrado' });
    const incResiduos = makeIncidencia({ id: 2, categoria: 'residuos' });
    const incTrafico = makeIncidencia({ id: 3, categoria: 'trafico' });

    expect(component.eligibleTeams(incAlumbrado).map((t) => t.id)).toEqual([1]);
    expect(component.eligibleTeams(incResiduos).map((t) => t.id)).toEqual([2]);
    expect(component.eligibleTeams(incTrafico)).toEqual([]);
  });

  it('assignTeam() asigna correctamente y muestra mensaje de éxito', () => {
    component.ngOnInit();
    equiposSpy.asignarEquipoAIncidencia.and.returnValue(of({}));

    const inc = makeIncidencia({ id: 5, categoria: 'alumbrado' });
    component.assignTeam(inc, 1);

    expect(equiposSpy.asignarEquipoAIncidencia).toHaveBeenCalledWith(5, 1);
    expect(component.assignError()).toBeNull();
    expect(component.assignSuccess()).toContain('asignado');
  });

  it('assignTeam(null) desasigna y muestra el mensaje adecuado', () => {
    component.ngOnInit();
    equiposSpy.asignarEquipoAIncidencia.and.returnValue(of({}));

    const inc = makeIncidencia({ id: 5, categoria: 'alumbrado' });
    component.assignTeam(inc, null);

    expect(equiposSpy.asignarEquipoAIncidencia).toHaveBeenCalledWith(5, null);
    expect(component.assignSuccess()).toContain('desasignado');
  });

  it('assignTeam() con 409 muestra error de categoría incompatible', () => {
    component.ngOnInit();
    equiposSpy.asignarEquipoAIncidencia.and.returnValue(
      throwError(
        () => new HttpErrorResponse({ status: 409, statusText: 'Conflict' }),
      ),
    );

    const inc = makeIncidencia({ id: 5, categoria: 'alumbrado' });
    component.assignTeam(inc, 2);

    expect(component.assignSuccess()).toBeNull();
    expect(component.assignError()).toContain('incompatible');
  });

  it('assignTeam() con 404 muestra error de no encontrado', () => {
    component.ngOnInit();
    equiposSpy.asignarEquipoAIncidencia.and.returnValue(
      throwError(
        () => new HttpErrorResponse({ status: 404, statusText: 'Not Found' }),
      ),
    );

    const inc = makeIncidencia({ id: 5, categoria: 'alumbrado' });
    component.assignTeam(inc, 1);

    expect(component.assignError()).toContain('No se encontró');
  });

  it('categoryLabel() formatea las 6 categorías del backend', () => {
    expect(component.categoryLabel('infraestructura')).toBe('Infraestructura');
    expect(component.categoryLabel('alumbrado')).toBe('Alumbrado');
    expect(component.categoryLabel('residuos')).toBe('Residuos');
    expect(component.categoryLabel('trafico')).toBe('Tráfico');
    expect(component.categoryLabel('zonas_verdes')).toBe('Zonas verdes');
    expect(component.categoryLabel('otro')).toBe('Otro');
  });

  // ── CRUD global de trabajadores (#63) ─────────────────────────────────────

  it('ngOnInit carga todos los trabajadores, incluidos los sin equipo', () => {
    component.ngOnInit();

    expect(equiposSpy.listarTrabajadores).toHaveBeenCalledTimes(1);
    expect(component.workers().length).toBe(2);
    expect(component.unassignedWorkersCount()).toBe(1);
    expect(component.workersLoading()).toBeFalse();
  });

  it('loadWorkers() con error rellena workersError() y no rompe', () => {
    equiposSpy.listarTrabajadores.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 500, statusText: 'Server' })),
    );
    component.loadWorkers();
    expect(component.workersError()).toBe('No se pudieron cargar los trabajadores.');
    expect(component.workersLoading()).toBeFalse();
    expect(component.workers().length).toBe(0);
  });

  it('workerTeamLabel() muestra el equipo o "Sin asignar"', () => {
    component.ngOnInit();
    expect(component.workerTeamLabel(trabajador)).toBe('Luz Norte (EQ-1)');
    expect(component.workerTeamLabel(trabajadorSinEquipo)).toBe('Sin asignar');
  });

  it('startEditWorker() / cancelEditWorker() gestionan el borrador inline', () => {
    component.startEditWorker(trabajador);
    expect(component.editingWorkerId()).toBe(10);
    expect(component.workerDraft).toEqual({ nombre: 'Laura Martin', puesto: 'Electricista' });

    component.startEditWorker(trabajadorSinEquipo);
    expect(component.workerDraft.puesto).toBe('');

    component.cancelEditWorker();
    expect(component.editingWorkerId()).toBeNull();
    expect(component.workerDraft.nombre).toBe('');
  });

  it('saveWorker() hace PATCH con nombre/puesto y refresca', () => {
    component.ngOnInit();
    equiposSpy.actualizarTrabajador.and.returnValue(
      of({ ...trabajador, nombre: 'Laura M.', puesto: 'Jefa' }),
    );

    component.startEditWorker(trabajador);
    component.workerDraft = { nombre: '  Laura M.  ', puesto: '  Jefa  ' };
    component.saveWorker(10);

    expect(equiposSpy.actualizarTrabajador).toHaveBeenCalledWith(10, {
      nombre: 'Laura M.',
      puesto: 'Jefa',
    });
    expect(component.editingWorkerId()).toBeNull();
    // init (1) + tras guardar (1)
    expect(equiposSpy.listarTrabajadores).toHaveBeenCalledTimes(2);
  });

  it('saveWorker() envía puesto null cuando se deja vacío', () => {
    component.ngOnInit();
    equiposSpy.actualizarTrabajador.and.returnValue(of(trabajador));

    component.startEditWorker(trabajador);
    component.workerDraft = { nombre: 'Laura', puesto: '   ' };
    component.saveWorker(10);

    expect(equiposSpy.actualizarTrabajador).toHaveBeenCalledWith(10, {
      nombre: 'Laura',
      puesto: null,
    });
  });

  it('saveWorker() no llama al backend con nombre vacío', () => {
    component.ngOnInit();
    component.workerDraft = { nombre: '   ', puesto: 'Operario' };
    component.saveWorker(10);
    expect(equiposSpy.actualizarTrabajador).not.toHaveBeenCalled();
  });

  it('toggleWorkerAvailability() invierte disponible vía PATCH', () => {
    component.ngOnInit();
    equiposSpy.actualizarTrabajador.and.returnValue(
      of({ ...trabajador, disponible: false }),
    );

    component.toggleWorkerAvailability(trabajador); // estaba true
    expect(equiposSpy.actualizarTrabajador).toHaveBeenCalledWith(10, {
      disponible: false,
    });

    component.toggleWorkerAvailability(trabajadorSinEquipo); // estaba false
    expect(equiposSpy.actualizarTrabajador).toHaveBeenCalledWith(20, {
      disponible: true,
    });
  });

  it('deleteWorker() llama eliminarTrabajador y refresca trabajadores y equipos', () => {
    component.ngOnInit();
    equiposSpy.eliminarTrabajador.and.returnValue(of(void 0));

    component.deleteWorker(10);

    expect(equiposSpy.eliminarTrabajador).toHaveBeenCalledWith(10);
    // listarTrabajadores: init (1) + tras borrar (1)
    expect(equiposSpy.listarTrabajadores).toHaveBeenCalledTimes(2);
    // listarEquipos: init (1) + tras borrar (1)
    expect(equiposSpy.listarEquipos).toHaveBeenCalledTimes(2);
  });

  it('deleteWorker() cancela la edición inline si era el trabajador editado', () => {
    component.ngOnInit();
    equiposSpy.eliminarTrabajador.and.returnValue(of(void 0));

    component.startEditWorker(trabajador);
    expect(component.editingWorkerId()).toBe(10);

    component.deleteWorker(10);
    expect(component.editingWorkerId()).toBeNull();
  });

  it('deleteWorker() con error rellena workersError()', () => {
    component.ngOnInit();
    equiposSpy.eliminarTrabajador.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 500, statusText: 'Server' })),
    );

    component.deleteWorker(10);
    expect(component.workersError()).toBe('No se pudo eliminar el trabajador.');
  });
});
