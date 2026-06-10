import { HttpErrorResponse } from '@angular/common/http';
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
    ]);
    incidenciasSpy = jasmine.createSpyObj<IncidenciasService>('IncidenciasService', [
      'listar',
    ]);

    equiposSpy.listarEquipos.and.returnValue(of([equipoAlumbrado, equipoResiduos]));
    incidenciasSpy.listar.and.returnValue(of(incidenciasPage));

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
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
});
