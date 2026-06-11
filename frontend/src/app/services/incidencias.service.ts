import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// ── Tipos espejo del backend (FastAPI / Pydantic) ──────────────────────────────
export type Categoria =
  | 'infraestructura'
  | 'alumbrado'
  | 'residuos'
  | 'trafico'
  | 'zonas_verdes'
  | 'otro';

export type Prioridad = 'baja' | 'media' | 'alta';

export type Estado = 'abierta' | 'en_progreso' | 'resuelta' | 'rechazada';

export interface IncidenciaCreate {
  titulo: string;
  descripcion?: string | null;
  categoria: Categoria;
  prioridad?: Prioridad;
  latitud: number;
  longitud: number;
}

export interface Imagen {
  id: number;
  ruta: string;
  fecha_subida: string;
}

export interface Historial {
  id: number;
  estado_anterior?: Estado | null;
  estado_nuevo: Estado;
  prioridad_anterior?: Prioridad | null;
  prioridad_nueva?: Prioridad | null;
  cambiado_por: string;
  fecha: string;
}

export interface Equipo {
  id: number;
  nombre: string;
  categoria: Categoria;
}

export interface Incidencia {
  id: number;
  titulo: string;
  descripcion?: string | null;
  categoria: Categoria;
  prioridad: Prioridad;
  estado: Estado;
  latitud: number;
  longitud: number;
  fecha_creacion: string;
  fecha_actualizacion: string;
  user_id?: number | null;
  equipo_id?: number | null;
  equipo?: Equipo | null;
  imagenes: Imagen[];
  historial: Historial[];
}

export interface ListarFiltros {
  estado?: Estado;
  categoria?: Categoria;
  prioridad?: Prioridad;
  lat?: number;
  lng?: number;
  radio?: number;
  limit?: number;
  offset?: number;
}

/**
 * Respuesta paginada de `GET /incidencias`.
 * El backend devuelve `{ items, total, limit, offset }`, no un array plano.
 */
export interface IncidenciaPage {
  items: Incidencia[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Cliente HTTP de la API de Incidencias Urbanas.
 * La URL base se toma de `environment.apiUrl`.
 */
@Injectable({ providedIn: 'root' })
export class IncidenciasService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  /** Comprueba la conectividad con el backend (GET /ping). */
  ping(): Observable<{ message: string }> {
    return this.http.get<{ message: string }>(`${this.base}/ping`);
  }

  /**
   * Lista incidencias con filtros opcionales (estado, categoría, geográficos…).
   * Devuelve la respuesta paginada del backend: `{ items, total, limit, offset }`.
   */
  listar(filtros: ListarFiltros = {}): Observable<IncidenciaPage> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filtros)) {
      if (value !== undefined && value !== null) {
        params = params.set(key, String(value));
      }
    }
    return this.http.get<IncidenciaPage>(`${this.base}/incidencias`, { params });
  }

  /**
   * Lista SOLO las incidencias del usuario autenticado (`GET /incidencias/mias`).
   * Requiere sesión: el interceptor de auth añade el `Authorization: Bearer …`.
   * Devuelve la respuesta paginada del backend: `{ items, total, limit, offset }`.
   */
  misIncidencias(filtros: { limit?: number; offset?: number } = {}): Observable<IncidenciaPage> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filtros)) {
      if (value !== undefined && value !== null) {
        params = params.set(key, String(value));
      }
    }
    return this.http.get<IncidenciaPage>(`${this.base}/incidencias/mias`, { params });
  }

  /** Obtiene el detalle de una incidencia (incluye imágenes e historial). */
  obtener(id: number): Observable<Incidencia> {
    return this.http.get<Incidencia>(`${this.base}/incidencias/${id}`);
  }

  /** Crea una nueva incidencia. */
  crear(data: IncidenciaCreate): Observable<Incidencia> {
    return this.http.post<Incidencia>(`${this.base}/incidencias`, data);
  }

  /** Actualiza estado y/o prioridad (requiere rol admin → cabecera X-Role). */
  actualizar(
    id: number,
    cambios: { estado?: Estado; prioridad?: Prioridad },
    role = 'admin',
  ): Observable<Incidencia> {
    const headers = new HttpHeaders({ 'X-Role': role });
    return this.http.patch<Incidencia>(`${this.base}/incidencias/${id}`, cambios, { headers });
  }

  /** Sube una imagen (multipart) asociada a una incidencia. */
  subirImagen(id: number, file: File): Observable<Imagen> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<Imagen>(`${this.base}/incidencias/${id}/imagenes`, form);
  }
}
