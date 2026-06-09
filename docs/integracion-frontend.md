# 🔌 Guía de integración Backend ↔ Frontend — Urban Alert

Documento para el equipo de **frontend**: cómo consumir la API REST del backend (FastAPI).
Se actualiza de forma incremental conforme se completan las issues del backend.

| | |
|---|---|
| **Base URL (dev)** | `http://localhost:8000` |
| **Formato** | JSON (salvo login y subida de imágenes, ver abajo) |
| **Docs interactivas** | `http://localhost:8000/docs` (Swagger) |

---

## 🌐 CORS

El backend permite por defecto estos orígenes: `http://localhost:4200` (ng serve), `http://localhost:8100` (ionic serve), `http://localhost`, `capacitor://localhost`, `ionic://localhost`.
Configurable con la variable de entorno `ALLOWED_ORIGINS` (separados por comas).

---

## 🔐 Autenticación (JWT) — *issue #3*

Roles: **`ciudadano`** (por defecto) y **`admin`**. El registro público crea siempre `ciudadano`.
Tras el login se obtiene un **JWT** que debe enviarse en la cabecera `Authorization: Bearer <token>` en los endpoints protegidos.

### `POST /auth/register`
Registro de un ciudadano. **Body JSON:**
```json
{ "email": "user@example.com", "password": "min8chars" }
```
- `201` → `{ "id": 1, "email": "user@example.com", "rol": "ciudadano" }`
- `400` → email ya registrado.

### `POST /auth/login`
⚠️ **No usa JSON**, sino `application/x-www-form-urlencoded` (estándar OAuth2). Campos:
- `username` → el **email** del usuario
- `password`

```
200 → { "access_token": "<jwt>", "token_type": "bearer" }
401 → credenciales inválidas
```

Ejemplo Angular:
```ts
const body = new HttpParams().set('username', email).set('password', password);
this.http.post<{access_token: string}>(`${API}/auth/login`, body, {
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
});
// Guardar el token y enviarlo luego: Authorization: `Bearer ${token}`
```

### `GET /auth/me`
Devuelve el usuario autenticado (requiere `Authorization: Bearer`).
- `200` → `{ "id", "email", "rol" }`
- `401` → sin token / token inválido o expirado.

### Códigos de estado de autorización
- `401 Unauthorized` → falta el token o no es válido/está expirado.
- `403 Forbidden` → el token es válido pero **el rol no tiene permiso** (p. ej. un ciudadano intentando una acción de admin).

---

## 🗂️ Incidencias

### `GET /incidencias` — listado paginado y filtrado — *paginación: issue #4*

**Query params** (todos opcionales):

| Param | Tipo | Descripción |
|---|---|---|
| `estado` | enum | `abierta` · `en_progreso` · `resuelta` · `rechazada` |
| `categoria` | enum | `infraestructura` · `alumbrado` · `residuos` · `trafico` · `zonas_verdes` · `otro` |
| `prioridad` | enum | `baja` · `media` · `alta` |
| `lat`, `lng`, `radio` | float | Filtro geográfico (radio en **metros**); los tres juntos |
| `limit` | int | Resultados por página. Por defecto `20`, rango `1–100` |
| `offset` | int | Resultados a saltar. Por defecto `0`, `≥ 0` |

**Respuesta `200`** — envoltura paginada:
```json
{
  "items": [ { /* IncidenciaResponse */ } ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```
> ⚠️ **Cambio respecto a versiones previas**: antes devolvía una lista plana; ahora devuelve `{ items, total, limit, offset }`. `total` es el nº de incidencias que cumplen los filtros (antes de paginar).

- `422` → `limit`/`offset` fuera de rango.

### `POST /incidencias` — crear incidencia
**Body JSON:**
```json
{
  "titulo": "Bache en calle principal",   // 3–200 chars (obligatorio)
  "descripcion": "Bache grande peligroso", // opcional
  "categoria": "infraestructura",          // enum (obligatorio)
  "prioridad": "media",                    // enum, por defecto "media"
  "latitud": 38.477,                       // -90..90 (obligatorio)
  "longitud": -0.791                       // -180..180 (obligatorio)
}
```
- `201` → `IncidenciaResponse` (con `estado: "abierta"`).
- `422` → validación de campos.

### `GET /incidencias/{id}` — detalle
- `200` → `IncidenciaResponse` (incluye `imagenes` e `historial`).
- `404` → no existe.

### `PATCH /incidencias/{id}` — cambiar estado/prioridad — **solo admin**
Requiere `Authorization: Bearer <token de admin>` (sustituye a la antigua cabecera `X-Role`).
**Body JSON** (ambos opcionales):
```json
{ "estado": "en_progreso", "prioridad": "alta" }
```
- `200` → `IncidenciaResponse` actualizada (se registra una entrada en `historial`).
- `401` sin token · `403` si el rol no es admin · `404` si no existe.

### `POST /incidencias/{id}/imagenes` — subir imagen
`multipart/form-data` con campo **`file`**. Solo `image/jpeg` o `image/png`.
- `201` → `{ "id", "ruta": "/uploads/<uuid>.jpg", "fecha_subida" }`
- `400` → formato inválido · `404` → incidencia inexistente.

Las imágenes se sirven como estáticos en `GET /uploads/<archivo>`.

---

## 🧱 Modelo de respuesta `IncidenciaResponse`
```json
{
  "id": 1,
  "titulo": "…",
  "descripcion": "… | null",
  "categoria": "infraestructura",
  "prioridad": "media",
  "estado": "abierta",
  "latitud": 38.477,
  "longitud": -0.791,
  "fecha_creacion": "2026-06-09T20:00:00Z",
  "fecha_actualizacion": "2026-06-09T20:00:00Z",
  "imagenes": [ { "id", "ruta", "fecha_subida" } ],
  "historial": [ { "id", "estado_anterior", "estado_nuevo", "cambiado_por", "fecha" } ]
}
```

## 🔢 Enums
- **categoria**: `infraestructura`, `alumbrado`, `residuos`, `trafico`, `zonas_verdes`, `otro`
- **prioridad**: `baja`, `media`, `alta`
- **estado**: `abierta`, `en_progreso`, `resuelta`, `rechazada`
- **rol**: `ciudadano`, `admin`

## ❤️ Salud
`GET /ping` → `{ "message": "pong" }`

---

## 📌 Estado por funcionalidad

| Funcionalidad | Endpoint(s) | Issue |
|---|---|---|
| Autenticación JWT + roles | `/auth/*`, protección de `PATCH` | #3 ✅ |
| Listado paginado + filtros | `GET /incidencias` (`limit`/`offset`) | #4 ✅ |
| Crear / detalle / imágenes | `POST`/`GET /incidencias`, `/imagenes` | base ✅ |

> Esta tabla y las secciones se ampliarán al completar nuevas issues del backend.
