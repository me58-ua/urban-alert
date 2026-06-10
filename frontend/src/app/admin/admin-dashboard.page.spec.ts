import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { environment } from '../../environments/environment';
import type { AdminViewModel } from './admin-dashboard.page';
import { IncidenciaPage } from '../services/incidencias.service';
import { Estadisticas } from '../services/stats.service';
import { AdminDashboardPage } from './admin-dashboard.page';

describe('AdminDashboardPage', () => {
  let component: AdminDashboardPage;
  let fixture: ComponentFixture<AdminDashboardPage>;
  let httpMock: HttpTestingController;
  const base = environment.apiUrl;

  const stats: Estadisticas = {
    total: 42,
    por_estado: { abierta: 20, en_progreso: 10, resuelta: 10, rechazada: 2 },
    por_categoria: {
      infraestructura: 8,
      alumbrado: 12,
      residuos: 7,
      trafico: 5,
      zonas_verdes: 4,
      otro: 6,
    },
    por_prioridad: { baja: 15, media: 18, alta: 9 },
    porcentaje_resueltas: 23.81,
    tiempo_medio_resolucion_horas: 14.5,
    reportes_ultimos_7_dias: 12,
    reportes_ultimos_30_dias: 30,
  };

  const page: IncidenciaPage = {
    items: [
      {
        id: 1,
        titulo: 'Farola fundida',
        descripcion: null,
        categoria: 'alumbrado',
        prioridad: 'media',
        estado: 'abierta',
        latitud: 40.4168,
        longitud: -3.7038,
        fecha_creacion: '2026-06-01T10:00:00Z',
        fecha_actualizacion: '2026-06-01T10:00:00Z',
        imagenes: [],
        historial: [],
      },
    ],
    total: 1,
    limit: 20,
    offset: 0,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminDashboardPage);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should create', () => {
    // vm$ es un observable frío: sin suscripción no se dispara ninguna petición.
    expect(component).toBeTruthy();
  });

  it('construye las métricas desde /stats y mantiene incidencias desde /incidencias', () => {
    const emissions: AdminViewModel[] = [];
    component.vm$.subscribe((vm) => emissions.push(vm));

    httpMock.expectOne(`${base}/stats`).flush(stats);
    httpMock.expectOne(`${base}/incidencias`).flush(page);

    // startWith(loading) + valor resuelto.
    expect(emissions[0].loading).toBeTrue();

    const vm = emissions[emissions.length - 1];
    expect(vm.loading).toBeFalse();
    expect(vm.error).toBeNull();
    expect(vm.metrics[0].value).toBe(42); // total
    expect(vm.metrics[1].value).toBe(20); // abiertas
    expect(vm.metrics[2].value).toBe(10); // en progreso
    expect(vm.metrics[3].value).toBe(10); // resueltas
    expect(vm.incidents.length).toBe(1);
    expect(vm.incidents[0].titulo).toBe('Farola fundida');
  });
});
