import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Categoria, Estado, Prioridad } from './incidencias.service';

/**
 * Estadísticas agregadas del dashboard de administración.
 * Espejo de `EstadisticasResponse` del backend (`GET /stats`, solo admin).
 */
export interface Estadisticas {
  total: number;
  por_estado: Record<Estado, number>;
  por_categoria: Record<Categoria, number>;
  por_prioridad: Record<Prioridad, number>;
  porcentaje_resueltas: number;
  tiempo_medio_resolucion_horas: number | null;
  reportes_ultimos_7_dias: number;
  reportes_ultimos_30_dias: number;
}

/**
 * Cliente HTTP de las métricas del dashboard.
 * La URL base se toma de `environment.apiUrl`.
 * `GET /stats` requiere rol admin + `Authorization: Bearer <token>`
 * (el interceptor de auth añade el token automáticamente).
 */
@Injectable({ providedIn: 'root' })
export class StatsService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  /** Obtiene los agregados del dashboard (`GET /stats`). */
  obtener(): Observable<Estadisticas> {
    return this.http.get<Estadisticas>(`${this.base}/stats`);
  }
}
