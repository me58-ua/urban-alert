import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { Estadisticas, StatsService } from './stats.service';

describe('StatsService', () => {
  let service: StatsService;
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

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        StatsService,
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(StatsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('obtener() hace GET a {apiUrl}/stats y devuelve las estadísticas', () => {
    let received: Estadisticas | undefined;
    service.obtener().subscribe((res) => {
      received = res;
    });

    const req = httpMock.expectOne(`${base}/stats`);
    expect(req.request.method).toBe('GET');
    req.flush(stats);

    expect(received).toEqual(stats);
    expect(received?.total).toBe(42);
    expect(received?.por_estado.abierta).toBe(20);
    expect(received?.por_estado.en_progreso).toBe(10);
    expect(received?.por_estado.resuelta).toBe(10);
    expect(received?.tiempo_medio_resolucion_horas).toBe(14.5);
  });

  it('obtener() acepta tiempo_medio_resolucion_horas null', () => {
    let received: Estadisticas | undefined;
    service.obtener().subscribe((res) => {
      received = res;
    });

    const req = httpMock.expectOne(`${base}/stats`);
    req.flush({ ...stats, tiempo_medio_resolucion_horas: null });

    expect(received?.tiempo_medio_resolucion_horas).toBeNull();
  });
});
