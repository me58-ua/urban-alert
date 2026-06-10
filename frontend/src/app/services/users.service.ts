import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// ── Tipos espejo del backend (FastAPI / Pydantic) ──────────────────────────────
export type Rol = 'ciudadano' | 'admin';

/** Usuario tal y como lo expone la API de administración (`GET /users`). */
export interface Usuario {
  id: number;
  email: string;
  rol: Rol;
  activo: boolean;
}

/**
 * Respuesta paginada de `GET /users`.
 * El backend devuelve `{ items, total, limit, offset }`, no un array plano.
 */
export interface UsuariosPage {
  items: Usuario[];
  total: number;
  limit: number;
  offset: number;
}

/** Cuerpo de alta de usuario (`POST /users`). */
export interface UsuarioCreate {
  email: string;
  password: string;
  rol: Rol;
}

/**
 * Cliente HTTP de la API de gestión de usuarios (solo admin).
 * La URL base se toma de `environment.apiUrl`.
 *
 * Todos los endpoints requieren rol admin + `Authorization: Bearer <token>`
 * (el interceptor de auth añade el token automáticamente).
 */
@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  /**
   * Lista los usuarios paginados (`GET /users`).
   * Devuelve la respuesta paginada del backend: `{ items, total, limit, offset }`.
   */
  listar(limit?: number, offset?: number): Observable<UsuariosPage> {
    let params = new HttpParams();
    if (limit !== undefined && limit !== null) {
      params = params.set('limit', String(limit));
    }
    if (offset !== undefined && offset !== null) {
      params = params.set('offset', String(offset));
    }
    return this.http.get<UsuariosPage>(`${this.base}/users`, { params });
  }

  /** Crea un nuevo usuario (`POST /users`). */
  crear(data: UsuarioCreate): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.base}/users`, data);
  }

  /** Actualiza el email de un usuario (`PATCH /users/{id}`). */
  actualizarEmail(id: number, email: string): Observable<Usuario> {
    return this.http.patch<Usuario>(`${this.base}/users/${id}`, { email });
  }

  /**
   * Elimina un usuario (`DELETE /users/{id}`).
   * El backend devuelve 400 si intentas borrarte a ti mismo.
   */
  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/users/${id}`);
  }

  /** Cambia el rol de un usuario (`PATCH /users/{id}/rol`). */
  cambiarRol(id: number, rol: Rol): Observable<Usuario> {
    return this.http.patch<Usuario>(`${this.base}/users/${id}/rol`, { rol });
  }

  /**
   * Activa o desactiva un usuario (`PATCH /users/{id}/estado`).
   * El backend devuelve 400 si intentas desactivarte a ti mismo.
   */
  cambiarEstado(id: number, activo: boolean): Observable<Usuario> {
    return this.http.patch<Usuario>(`${this.base}/users/${id}/estado`, { activo });
  }
}
