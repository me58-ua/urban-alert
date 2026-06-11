import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Categoria } from './incidencias.service';

// Reexportamos Categoria para que los consumidores de equipos puedan importarla
// desde aquí sin acoplarse al servicio de incidencias.
export { Categoria } from './incidencias.service';

// ── Tipos espejo del backend (FastAPI / Pydantic) ──────────────────────────────

/** Trabajador tal y como lo expone la API de administración. */
export interface Trabajador {
  id: number;
  nombre: string;
  puesto: string | null;
  disponible: boolean;
  equipo_id: number | null;
}

/** Equipo con sus trabajadores embebidos (`GET /equipos`). */
export interface Equipo {
  id: number;
  nombre: string;
  categoria: Categoria;
  trabajadores: Trabajador[];
}

/** Cuerpo de alta de equipo (`POST /equipos`). */
export interface EquipoCreate {
  nombre: string;
  categoria: Categoria;
}

/** Cuerpo de edición de equipo (`PATCH /equipos/{id}`). */
export interface EquipoUpdate {
  nombre?: string;
  categoria?: Categoria;
}

/** Cuerpo de alta de trabajador en un equipo (`POST /equipos/{id}/trabajadores`). */
export interface TrabajadorCreate {
  nombre: string;
  puesto?: string | null;
  disponible?: boolean;
}

/** Cuerpo de edición de trabajador (`PATCH /trabajadores/{id}`). */
export interface TrabajadorUpdate {
  nombre?: string;
  puesto?: string | null;
  disponible?: boolean;
}

/**
 * Cliente HTTP de la API de gestión de equipos y trabajadores (solo admin).
 * La URL base se toma de `environment.apiUrl`.
 *
 * Todos los endpoints requieren rol admin + `Authorization: Bearer <token>`
 * (el interceptor de auth añade el token automáticamente).
 */
@Injectable({ providedIn: 'root' })
export class EquiposService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  /** Lista todos los equipos con sus trabajadores (`GET /equipos`). */
  listarEquipos(): Observable<Equipo[]> {
    return this.http.get<Equipo[]>(`${this.base}/equipos`);
  }

  /** Crea un nuevo equipo (`POST /equipos`). */
  crearEquipo(data: EquipoCreate): Observable<Equipo> {
    return this.http.post<Equipo>(`${this.base}/equipos`, data);
  }

  /** Actualiza nombre y/o categoría de un equipo (`PATCH /equipos/{id}`). */
  actualizarEquipo(id: number, cambios: EquipoUpdate): Observable<Equipo> {
    return this.http.patch<Equipo>(`${this.base}/equipos/${id}`, cambios);
  }

  /** Elimina un equipo (`DELETE /equipos/{id}`). */
  eliminarEquipo(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/equipos/${id}`);
  }

  /**
   * Crea un trabajador y lo asigna al equipo
   * (`POST /equipos/{id}/trabajadores`). Devuelve el trabajador creado.
   */
  crearTrabajador(
    equipoId: number,
    data: TrabajadorCreate,
  ): Observable<Trabajador> {
    return this.http.post<Trabajador>(
      `${this.base}/equipos/${equipoId}/trabajadores`,
      data,
    );
  }

  /**
   * Desasigna (quita) un trabajador de un equipo
   * (`DELETE /equipos/{id}/trabajadores/{trabajador_id}`).
   */
  quitarTrabajador(
    equipoId: number,
    trabajadorId: number,
  ): Observable<void> {
    return this.http.delete<void>(
      `${this.base}/equipos/${equipoId}/trabajadores/${trabajadorId}`,
    );
  }

  // ── CRUD independiente de trabajadores ────────────────────────────────────

  /**
   * Lista TODOS los trabajadores (`GET /trabajadores`), incluidos los que no
   * pertenecen a ningún equipo (`equipo_id === null`).
   */
  listarTrabajadores(): Observable<Trabajador[]> {
    return this.http.get<Trabajador[]>(`${this.base}/trabajadores`);
  }

  /**
   * Actualiza nombre, puesto y/o disponibilidad de un trabajador
   * (`PATCH /trabajadores/{id}`). Devuelve el trabajador actualizado.
   */
  actualizarTrabajador(
    id: number,
    cambios: TrabajadorUpdate,
  ): Observable<Trabajador> {
    return this.http.patch<Trabajador>(
      `${this.base}/trabajadores/${id}`,
      cambios,
    );
  }

  /** Elimina un trabajador de forma permanente (`DELETE /trabajadores/{id}`). */
  eliminarTrabajador(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/trabajadores/${id}`);
  }

  /**
   * Asigna (o desasigna con `null`) un equipo a una incidencia
   * (`PATCH /incidencias/{id}/equipo`).
   *
   * El backend responde:
   *  - 409 si la categoría del equipo NO coincide con la de la incidencia.
   *  - 404 si la incidencia o el equipo no existen.
   *
   * El error se propaga sin transformar para que el caller pueda distinguir
   * el 409 (categoría incompatible) por `err.status`.
   */
  asignarEquipoAIncidencia(
    incidenciaId: number,
    equipoId: number | null,
  ): Observable<unknown> {
    return this.http.patch<unknown>(
      `${this.base}/incidencias/${incidenciaId}/equipo`,
      { equipo_id: equipoId },
    );
  }
}
