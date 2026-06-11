import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import { environment } from '../../environments/environment';
import { Incidencia } from '../services/incidencias.service';
import { DetalleIncidenciaPage } from './detalle-incidencia.page';

const incidencia: Incidencia = {
  id: 5,
  titulo: 'Farola fundida',
  descripcion: 'Sin luz desde hace días.',
  categoria: 'alumbrado',
  prioridad: 'media',
  estado: 'en_progreso',
  latitud: 40.4168,
  longitud: -3.7038,
  fecha_creacion: '2026-06-01T10:00:00Z',
  fecha_actualizacion: '2026-06-03T12:00:00Z',
  user_id: 7,
  equipo_id: 3,
  equipo: { id: 3, nombre: 'Equipo Alumbrado', categoria: 'alumbrado' },
  imagenes: [],
  historial: [
    {
      id: 1,
      estado_anterior: null,
      estado_nuevo: 'abierta',
      cambiado_por: 'sistema',
      fecha: '2026-06-01T10:00:00Z',
    },
    {
      id: 2,
      estado_anterior: 'abierta',
      estado_nuevo: 'en_progreso',
      prioridad_anterior: 'media',
      prioridad_nueva: 'alta',
      cambiado_por: 'admin',
      fecha: '2026-06-03T12:00:00Z',
    },
  ],
};

describe('DetalleIncidenciaPage', () => {
  let component: DetalleIncidenciaPage;
  let fixture: ComponentFixture<DetalleIncidenciaPage>;
  let httpMock: HttpTestingController;
  const base = environment.apiUrl;

  function setup(id: string | null) {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap(id ? { id } : {}) },
          },
        },
      ],
    });

    fixture = TestBed.createComponent(DetalleIncidenciaPage);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  }

  afterEach(() => httpMock.verify());

  it('should create (sin id, sin petición, en estado de error)', () => {
    setup(null);
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.error).toBe('Incidencia no encontrada.');
    expect(component.loaded).toBeFalse();
  });

  it('construye el timeline real desde el historial (ordenado, mutable, con prioridad)', async () => {
    setup('5');

    const req = httpMock.expectOne(`${base}/incidencias/5`);
    expect(req.request.method).toBe('GET');
    req.flush(incidencia);

    // loadIncident() usa firstValueFrom (microtask); esperamos a que resuelva.
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.loaded).toBeTrue();
    expect(component.error).toBeNull();
    expect(component.timeline.length).toBe(2);
    expect(component.timeline[0].title).toBe('Abierta');
    expect(component.timeline[0].description).toBe('Cambiado por sistema');
    expect(component.timeline[1].title).toBe(
      'Abierta -> En progreso · Prioridad: Media -> Alta',
    );
    expect(component.timeline[1].description).toBe('Cambiado por admin');
    expect(component.timeline.every((item) => item.active)).toBeTrue();
  });

  it('muestra reporter y equipo reales del detalle', async () => {
    setup('5');

    httpMock.expectOne(`${base}/incidencias/5`).flush(incidencia);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.incident.reporter).toBe('Reporte ciudadano');
    expect(component.incident.team).toBe('Equipo Alumbrado');
    expect(
      component.details.some((d) => d.label === 'Equipo' && d.value === 'Equipo Alumbrado'),
    ).toBeTrue();
  });

  it('reporter "Anónimo" sin user_id y equipo "Sin asignar"', async () => {
    setup('5');

    httpMock
      .expectOne(`${base}/incidencias/5`)
      .flush({ ...incidencia, user_id: null, equipo: null });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.incident.reporter).toBe('Anónimo');
    expect(component.incident.team).toBe('Sin asignar');
  });
});
