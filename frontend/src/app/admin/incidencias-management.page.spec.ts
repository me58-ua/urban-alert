import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import {
  Incidencia,
  IncidenciaPage,
  IncidenciasService,
} from '../services/incidencias.service';
import { IncidenciasManagementPage } from './incidencias-management.page';

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

describe('IncidenciasManagementPage', () => {
  let component: IncidenciasManagementPage;
  let incidenciasSpy: jasmine.SpyObj<IncidenciasService>;

  const page: IncidenciaPage = {
    items: [
      makeIncidencia({ id: 1, categoria: 'alumbrado', estado: 'abierta' }),
      makeIncidencia({ id: 2, categoria: 'residuos', estado: 'resuelta', titulo: 'Contenedor' }),
    ],
    total: 2,
    limit: 20,
    offset: 0,
  };

  function build(): void {
    incidenciasSpy = jasmine.createSpyObj<IncidenciasService>('IncidenciasService', [
      'listar',
    ]);
    incidenciasSpy.listar.and.returnValue(of(page));

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: IncidenciasService, useValue: incidenciasSpy },
      ],
    });

    const fixture = TestBed.createComponent(IncidenciasManagementPage);
    component = fixture.componentInstance;
  }

  beforeEach(() => build());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit carga las incidencias con filtros vacios', () => {
    component.ngOnInit();

    expect(incidenciasSpy.listar).toHaveBeenCalledTimes(1);
    expect(incidenciasSpy.listar).toHaveBeenCalledWith({});
    expect(component.incidencias().length).toBe(2);
    expect(component.loading()).toBeFalse();
    expect(component.error()).toBeNull();
  });

  it('applyFilters construye ListarFiltros solo con los selects activos', () => {
    component.ngOnInit();
    incidenciasSpy.listar.calls.reset();

    component.filtroEstado = 'abierta';
    component.filtroCategoria = 'alumbrado';
    component.filtroPrioridad = '';
    component.applyFilters();

    expect(incidenciasSpy.listar).toHaveBeenCalledWith({
      estado: 'abierta',
      categoria: 'alumbrado',
    });
  });

  it('applyFilters propaga los tres filtros cuando estan todos seleccionados', () => {
    component.filtroEstado = 'en_progreso';
    component.filtroCategoria = 'trafico';
    component.filtroPrioridad = 'alta';
    component.applyFilters();

    expect(incidenciasSpy.listar).toHaveBeenCalledWith({
      estado: 'en_progreso',
      categoria: 'trafico',
      prioridad: 'alta',
    });
  });

  it('muestra un mensaje de error si listar() falla', () => {
    incidenciasSpy.listar.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 500, statusText: 'Server' })),
    );

    component.loadIncidents();

    expect(component.incidencias().length).toBe(0);
    expect(component.error()).toBe('No se pudieron cargar las incidencias.');
    expect(component.loading()).toBeFalse();
  });

  it('helpers de presentacion devuelven etiquetas legibles', () => {
    expect(component.estadoLabel('en_progreso')).toBe('En progreso');
    expect(component.estadoTone('abierta')).toBe('red');
    expect(component.estadoTone('resuelta')).toBe('green');
    expect(component.categoriaLabel('zonas_verdes')).toBe('Zonas verdes');
    expect(component.prioridadLabel('alta')).toBe('Alta');
  });
});
