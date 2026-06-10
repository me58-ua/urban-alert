import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// ── Tipos espejo del backend (FastAPI / Pydantic) ──────────────────────────────

/**
 * Notificación tal y como la expone la API pública.
 * Espejo de `NotificacionResponse` del backend.
 */
export interface Notificacion {
  id: number;
  incidencia_id: number;
  mensaje: string;
  estado_nuevo: string;
  leida: boolean;
  fecha_creacion: string;
}

/** Filtros opcionales de `GET /notificaciones`. */
export interface NotificacionFiltros {
  incidencia_id?: number;
  leida?: boolean;
}

/**
 * Cliente HTTP de la API de notificaciones.
 * La URL base se toma de `environment.apiUrl`.
 *
 * Los endpoints son públicos (no requieren token).
 */
@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  /**
   * Lista las notificaciones (`GET /notificaciones`).
   * El backend devuelve un array ordenado de más reciente a más antiguo.
   * Sólo se envían los filtros realmente presentes como query params.
   */
  listar(filtros: NotificacionFiltros = {}): Observable<Notificacion[]> {
    let params = new HttpParams();
    if (filtros.incidencia_id !== undefined && filtros.incidencia_id !== null) {
      params = params.set('incidencia_id', String(filtros.incidencia_id));
    }
    if (filtros.leida !== undefined && filtros.leida !== null) {
      params = params.set('leida', String(filtros.leida));
    }
    return this.http.get<Notificacion[]>(`${this.base}/notificaciones`, { params });
  }

  /**
   * Marca una notificación como leída (`PATCH /notificaciones/{id}/leer`).
   * Devuelve la notificación actualizada con `leida: true`.
   */
  marcarLeida(id: number): Observable<Notificacion> {
    return this.http.patch<Notificacion>(`${this.base}/notificaciones/${id}/leer`, {});
  }
}
