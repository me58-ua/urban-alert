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
| `lat`, `lng`, `radio` | float | Filtro geográfico (radio en **metros**); los tres juntos. Filtrado eficiente en SQL (bounding box) + refinamiento exacto Haversine — *issue #5* |
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
- `422` → validación de campos. *(issue #10)* `titulo` y `descripcion` se **sanean** (se recortan espacios) y se aplica **moderación básica**: si el texto contiene términos no permitidos, o el `titulo` queda con menos de 3 caracteres tras recortar, se devuelve `422`.

> *(issue #33)* **Autoría con auth opcional.** Si la petición incluye `Authorization: Bearer <token>`, la incidencia queda **asociada al usuario autor** (`user_id`). Si la petición es **anónima** (sin token), se crea igualmente y `user_id` queda `null`. Un token inválido/expirado **no** provoca error en este endpoint: simplemente se trata como anónima.

### `GET /incidencias/mias` — mis incidencias — *issue #33*
Devuelve, **paginadas**, **solo** las incidencias del **usuario autenticado**. **Requiere `Authorization: Bearer <token>`.**

**Query params** (opcionales): `limit` (1–100, def. `20`), `offset` (≥0, def. `0`).

**Respuesta `200`** — misma envoltura paginada que `GET /incidencias`:
```json
{
  "items": [ { /* IncidenciaResponse, con user_id = id del usuario */ } ],
  "total": 7,
  "limit": 20,
  "offset": 0
}
```
- `401` → sin token / token inválido o expirado.
- `422` → `limit`/`offset` fuera de rango.

> El frontend usa este endpoint para la pantalla **"Mis incidencias"**. `total` es el nº total de incidencias del usuario (antes de paginar).

### `GET /incidencias/{id}` — detalle
- `200` → `IncidenciaResponse` (incluye `imagenes` e `historial`).
- `404` → no existe.

### `PATCH /incidencias/{id}` — cambiar estado/prioridad — **solo admin**
Requiere `Authorization: Bearer <token de admin>` (sustituye a la antigua cabecera `X-Role`).
**Body JSON** (ambos opcionales):
```json
{ "estado": "en_progreso", "prioridad": "alta" }
```
- `200` → `IncidenciaResponse` actualizada. Se registra una entrada en `historial` ante **cualquier** cambio real de **estado y/o prioridad** (con sus valores anterior/nuevo); un PATCH sin cambios reales no genera entrada. *(issue #6)*
- `401` sin token · `403` si el rol no es admin · `404` si no existe.

### `POST /incidencias/{id}/imagenes` — subir imagen
`multipart/form-data` con campo **`file`**. Validación robusta *(issue #10)*:
- Solo **JPEG** o **PNG**, verificado por el **contenido real** (*magic bytes*), no solo por el `content_type` → un archivo que falsee el `content_type` se rechaza.
- Tamaño máximo **5 MB**; archivo vacío rechazado.
- La extensión del fichero guardado se deriva del tipo real detectado.
- `201` → `{ "id", "ruta": "/uploads/<uuid>.jpg", "fecha_subida" }`
- `400` → no es imagen válida / content_type no permitido / vacío / supera 5 MB · `404` → incidencia inexistente.

Las imágenes se sirven como estáticos en `GET /uploads/<archivo>`.

> *(issue #8)* El campo **`ruta`** es la URL pública de la imagen: con almacenamiento **local** es una ruta relativa (`/uploads/<archivo>`); con backend **S3** puede ser una **URL absoluta**. El frontend debe usar `ruta` tal cual como `src` de la imagen (anteponiendo la base de la API solo si es relativa).

---

## 🔔 Notificaciones — *issue #7*

Al **cambiar el estado** de una incidencia se crea automáticamente una notificación. (Un cambio de solo prioridad **no** genera notificación.)

### `GET /notificaciones`
**Query params** (opcionales): `incidencia_id` (int), `leida` (bool). Ordenadas de más reciente a más antigua.
```json
[ { "id": 1, "incidencia_id": 3, "mensaje": "La incidencia '…' cambió de estado: abierta → en_progreso",
    "estado_nuevo": "en_progreso", "leida": false, "fecha_creacion": "2026-06-09T20:00:00Z" } ]
```

### `PATCH /notificaciones/{id}/leer`
Marca la notificación como leída.
- `200` → `NotificacionResponse` con `leida: true` · `404` → no existe.

> Endpoints públicos (sin token) en esta fase. El frontend puede sondear `GET /notificaciones?incidencia_id=…` para mostrar avisos de cambios de estado.

---

## 📊 Métricas / Dashboard — *issue #9*

### `GET /stats` — **solo admin**
Agregados calculados desde la BD para el dashboard. **Requiere `Authorization: Bearer <token de admin>`** *(issue #26)*: `401` sin token, `403` si el rol no es admin.
```json
{
  "total": 42,
  "por_estado": { "abierta": 20, "en_progreso": 10, "resuelta": 10, "rechazada": 2 },
  "por_categoria": { "infraestructura": 8, "alumbrado": 12, "residuos": 7, "trafico": 5, "zonas_verdes": 4, "otro": 6 },
  "por_prioridad": { "baja": 15, "media": 18, "alta": 9 },
  "porcentaje_resueltas": 23.81,
  "tiempo_medio_resolucion_horas": 14.5,   // null si no hay incidencias resueltas
  "reportes_ultimos_7_dias": 12,
  "reportes_ultimos_30_dias": 30
}
```
> Los conteos `por_*` incluyen **todas** las claves del enum (con `0` si no hay). `tiempo_medio_resolucion_horas` es aproximado (última actualización − creación de las resueltas).

---

## 👥 Gestión de usuarios y roles — *issue #27* (solo admin)

Todos requieren `Authorization: Bearer <token de admin>` (`401` sin token, `403` si el rol no es admin).

### `GET /users`
Lista usuarios paginada. Query: `limit` (1–100, def. 20), `offset` (≥0).
```json
{ "items": [ { "id": 1, "email": "user@example.com", "rol": "ciudadano" } ], "total": 1, "limit": 20, "offset": 0 }
```

### `PATCH /users/{id}/rol`
Cambia el rol de un usuario (p. ej. **promover a admin**). **Body:** `{ "rol": "admin" }` (o `"ciudadano"`).
- `200` → `UserResponse` actualizado · `400` → intento de cambiar **tu propio** rol · `404` → no existe.

> **Primer admin (bootstrap):** como el registro público crea `ciudadano`, el primer administrador se crea con `python scripts/crear_admin.py <email> <password>` (o vía `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD`).

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
  "user_id": 1,                            // autor (issue #33); null si anónima
  "fecha_creacion": "2026-06-09T20:00:00Z",
  "fecha_actualizacion": "2026-06-09T20:00:00Z",
  "imagenes": [ { "id", "ruta", "fecha_subida" } ],
  "historial": [ { "id", "estado_anterior", "estado_nuevo", "prioridad_anterior", "prioridad_nueva", "cambiado_por", "fecha" } ]
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
| Filtro geográfico eficiente (SQL) | `GET /incidencias?lat&lng&radio` | #5 ✅ |
| Historial de estado **y prioridad** | `historial` en el detalle / tras `PATCH` | #6 ✅ |
| Notificaciones de cambio de estado | `GET /notificaciones`, `PATCH /notificaciones/{id}/leer` | #7 ✅ |
| Validación/moderación de inputs e imágenes | `POST /incidencias`, `POST /incidencias/{id}/imagenes` | #10 ✅ |
| Métricas / dashboard (solo admin) | `GET /stats` | #9, #26 ✅ |
| Almacenamiento de imágenes (local/S3, persistente) | `POST /incidencias/{id}/imagenes` | #8 ✅ |
| Gestión de usuarios y roles (solo admin) | `GET /users`, `PATCH /users/{id}/rol` | #27 ✅ |
| Autor de incidencia + "mis incidencias" | `POST /incidencias` (auth opcional), `GET /incidencias/mias` | #33 ✅ |
| Crear / detalle / imágenes | `POST`/`GET /incidencias`, `/imagenes` | base ✅ |

> Esta tabla y las secciones se ampliarán al completar nuevas issues del backend.
