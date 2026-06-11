import {
  HttpClient,
  HttpHeaders,
  HttpParams,
} from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

// ── Tipos espejo del backend (FastAPI / Pydantic) ──────────────────────────────
export type Rol = 'ciudadano' | 'admin';

export interface Usuario {
  id: number;
  email: string;
  rol: Rol;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

/** Clave de localStorage donde se persiste el JWT. */
export const TOKEN_KEY = 'urban-alert-token';
/** Clave de localStorage donde se persiste el rol (la lee el guard de rutas). */
export const ROLE_KEY = 'urban-alert-role';
/** Clave de localStorage donde se persiste el email del usuario autenticado. */
export const EMAIL_KEY = 'urban-alert-email';

/**
 * Servicio de autenticación contra la API (`/auth/*`).
 *
 * - `register` → POST `/auth/register` (JSON) → 201 `{id,email,rol}`.
 * - `login`    → POST `/auth/login` (`application/x-www-form-urlencoded`,
 *               `username`=email, `password`) → `{access_token, token_type}`.
 * - `me`       → GET  `/auth/me` (Bearer) → `{id,email,rol}`.
 * - `logout`   → limpia token y rol del almacenamiento.
 *
 * La URL base se toma de `environment.apiUrl`.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  /** Registra un nuevo ciudadano. */
  register(email: string, password: string): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.base}/auth/register`, {
      email,
      password,
    });
  }

  /**
   * Inicia sesión con OAuth2 password flow (form-urlencoded) y persiste el
   * token devuelto. Tras obtener el token recupera el perfil para guardar el
   * rol real.
   */
  login(email: string, password: string): Observable<TokenResponse> {
    const body = new HttpParams()
      .set('username', email)
      .set('password', password);
    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
    });
    return this.http
      .post<TokenResponse>(`${this.base}/auth/login`, body.toString(), {
        headers,
      })
      .pipe(tap((res) => this.setToken(res.access_token)));
  }

  /** Obtiene el perfil autenticado y persiste el rol y el email reales. */
  me(): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.base}/auth/me`).pipe(
      tap((user) => {
        this.setRole(user.rol);
        this.setEmail(user.email);
      }),
    );
  }

  /** Cierra sesión: borra token, rol y email del almacenamiento local. */
  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(EMAIL_KEY);
  }

  /** Devuelve el JWT almacenado, o `null` si no hay sesión. */
  token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  /** `true` si hay un token persistido. */
  isAuthenticated(): boolean {
    return this.token() !== null;
  }

  /** Devuelve el rol persistido (`ciudadano` | `admin`) o `null`. */
  role(): Rol | null {
    const stored = localStorage.getItem(ROLE_KEY);
    return stored === 'admin' || stored === 'ciudadano' ? stored : null;
  }

  /** Devuelve el email del usuario autenticado, o `null` si no se conoce. */
  email(): string | null {
    return localStorage.getItem(EMAIL_KEY);
  }

  /** Persiste el JWT. */
  private setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  }

  /** Persiste el rol en la clave que lee el guard de redirección. */
  private setRole(rol: Rol): void {
    localStorage.setItem(ROLE_KEY, rol);
  }

  /** Persiste el email del usuario autenticado. */
  private setEmail(email: string): void {
    localStorage.setItem(EMAIL_KEY, email);
  }
}
