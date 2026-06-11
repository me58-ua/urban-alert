import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { environment } from '../../environments/environment';
import { IncidenciaPage } from '../services/incidencias.service';
import { MapaIncidenciasPage } from './mapa-incidencias.page';

describe('MapaIncidenciasPage', () => {
  let component: MapaIncidenciasPage;
  let fixture: ComponentFixture<MapaIncidenciasPage>;
  let httpMock: HttpTestingController;
  const base = environment.apiUrl;

  const page: IncidenciaPage = {
    items: [
      {
        id: 7,
        titulo: 'Bache en calzada',
        descripcion: null,
        categoria: 'infraestructura',
        prioridad: 'alta',
        estado: 'abierta',
        latitud: 40.42,
        longitud: -3.7,
        fecha_creacion: '2026-06-01T10:00:00Z',
        fecha_actualizacion: '2026-06-01T10:00:00Z',
        imagenes: [],
        historial: [],
      },
    ],
    total: 1,
    limit: 100,
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

    fixture = TestBed.createComponent(MapaIncidenciasPage);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('carga TODAS las incidencias sin geofiltro (limit alto, sin lat/lng/radio) y las mapea', () => {
    const emissions: { incidents: { id: number; title: string; category: string; status: string; tone: string }[]; loading: boolean; error: string | null }[] = [];
    component.vm$.subscribe((vm) => emissions.push(vm));

    const req = httpMock.expectOne((r) => r.url === `${base}/incidencias`);
    // Sin geofiltro fijo de Madrid: nada de lat/lng/radio.
    expect(req.request.params.get('lat')).toBeNull();
    expect(req.request.params.get('lng')).toBeNull();
    expect(req.request.params.get('radio')).toBeNull();
    // Filtro "Todas" no envía estado, pero sí un limit alto.
    expect(req.request.params.get('estado')).toBeNull();
    expect(req.request.params.get('limit')).toBe('100');
    req.flush(page);

    expect(emissions[0].loading).toBeTrue();

    const vm = emissions[emissions.length - 1];
    expect(vm.loading).toBeFalse();
    expect(vm.error).toBeNull();
    expect(vm.incidents.length).toBe(1);
    expect(vm.incidents[0].id).toBe(7);
    expect(vm.incidents[0].title).toBe('Bache en calzada');
    expect(vm.incidents[0].category).toBe('Infraestructura');
    expect(vm.incidents[0].status).toBe('Abierta');
    expect(vm.incidents[0].tone).toBe('danger');
  });

  it('al pulsar un chip reconstruye la consulta con el query param estado y recarga', () => {
    component.vm$.subscribe();

    // Carga inicial "Todas".
    httpMock.expectOne((r) => r.url === `${base}/incidencias`).flush(page);

    // Selecciona "En revisión" -> estado=en_progreso.
    component.selectFilter(2);
    const req = httpMock.expectOne((r) => r.url === `${base}/incidencias`);
    expect(req.request.params.get('estado')).toBe('en_progreso');
    expect(req.request.params.get('limit')).toBe('100');
    req.flush({ ...page, items: [] });
  });

  it('mapea los estados a los query params correctos por cada chip', () => {
    const esperado: Record<number, string | null> = {
      0: null, // Todas
      1: 'abierta', // Pendientes
      2: 'en_progreso', // En revisión
      3: 'resuelta', // Resueltas
    };

    component.vm$.subscribe();
    httpMock.expectOne((r) => r.url === `${base}/incidencias`).flush(page);

    for (const index of [1, 2, 3]) {
      component.selectFilter(index);
      const req = httpMock.expectOne((r) => r.url === `${base}/incidencias`);
      expect(req.request.params.get('estado')).toBe(esperado[index]);
      req.flush(page);
    }
  });
});
