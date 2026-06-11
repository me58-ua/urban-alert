import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { environment } from '../../environments/environment';
import type { AdminViewModel } from './admin-dashboard.page';
import { IncidenciaPage } from '../services/incidencias.service';
import { Estadisticas } from '../services/stats.service';
import { AuthService } from '../services/auth.service';
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
    // El view model ahora expone las estadísticas completas de /stats.
    expect(vm.stats).toEqual(stats);
  });

  it('activityByDay agrupa incidencias reales por día (7 cubos, sin valores fijos)', () => {
    const hoy = new Date();
    hoy.setHours(12, 0, 0, 0);
    const ayer = new Date(hoy);
    ayer.setDate(hoy.getDate() - 1);

    const incidents: any[] = [
      { ...page.items[0], id: 10, fecha_creacion: hoy.toISOString() },
      { ...page.items[0], id: 11, fecha_creacion: hoy.toISOString() },
      { ...page.items[0], id: 12, fecha_creacion: ayer.toISOString() },
    ];

    const bars = component.activityByDay(incidents);
    expect(bars.length).toBe(7);
    // Último cubo = hoy con 2 reportes (el día más activo → size 100).
    expect(bars[6].count).toBe(2);
    expect(bars[6].size).toBe(100);
    // Penúltimo = ayer con 1 reporte (mitad → size 50).
    expect(bars[5].count).toBe(1);
    expect(bars[5].size).toBe(50);
    expect(component.activityTotal(bars)).toBe(3);
  });

  it('activityByDay sin incidencias devuelve 7 cubos a cero', () => {
    const bars = component.activityByDay([]);
    expect(bars.length).toBe(7);
    expect(bars.every((bar) => bar.count === 0 && bar.size === 0)).toBeTrue();
    expect(component.activityTotal(bars)).toBe(0);
  });

  it('categoryBreakdown y priorityBreakdown ordenan y escalan desde /stats', () => {
    const categorias = component.categoryBreakdown(stats);
    expect(categorias.length).toBe(6);
    // alumbrado (12) es el máximo → primero y al 100%.
    expect(categorias[0].key).toBe('alumbrado');
    expect(categorias[0].size).toBe(100);

    const prioridades = component.priorityBreakdown(stats);
    expect(prioridades[0].key).toBe('media'); // 18, el máximo
    expect(prioridades[0].size).toBe(100);

    // Sin stats no peta y devuelve listas vacías.
    expect(component.categoryBreakdown(null)).toEqual([]);
    expect(component.priorityBreakdown(null)).toEqual([]);
  });

  it('formatea tiempo de resolución (— si null) y porcentajes', () => {
    expect(component.formatResolutionTime(14.53)).toBe('14.5 h');
    expect(component.formatResolutionTime(null)).toBe('—');
    expect(component.formatPercent(23.81)).toBe('23.8%');
    expect(component.formatPercent(null)).toBe('—');
  });

  it('hasIncidents distingue el estado "sin datos" del donut', () => {
    expect(component.hasIncidents([])).toBeFalse();
    expect(component.hasIncidents(page.items)).toBeTrue();
  });

  it('logout() cierra sesión y navega a /login', () => {
    const auth = TestBed.inject(AuthService);
    const router = TestBed.inject(Router);
    const logoutSpy = spyOn(auth, 'logout');
    const navSpy = spyOn(router, 'navigateByUrl').and.resolveTo(true);

    component.logout();

    expect(logoutSpy).toHaveBeenCalled();
    expect(navSpy).toHaveBeenCalledWith('/login');
  });
});
