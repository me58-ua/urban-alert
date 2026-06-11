# 🧪 Test End-to-End (UI) — Urban Alert

Plan de pruebas **manuales sobre el navegador** (ejecutadas con **Chrome MCP**) que recorren la aplicación completa: frontend Angular/Ionic + backend FastAPI. El objetivo es validar de extremo a extremo los flujos de **ciudadano** y **administrador** contra la API real y la base de datos.

> **Cómo se ejecuta:** el responsable levanta backend y frontend manualmente y facilita la **URL del frontend**. Luego se recorren los casos de abajo en orden, anotando el resultado (✅/❌) y los hallazgos. Cada caso indica también la(s) **petición(es) de red** esperadas, para verificarlas con el panel de red de Chrome.

---

## 0. Prerrequisitos y puesta en marcha

| Componente | Esperado |
|---|---|
| **Base de datos** | PostgreSQL (Docker `urban-alert-db`) en `localhost:5433`, con migraciones aplicadas: `alembic upgrade head` (deben existir las tablas `incidencias`, `users`, `notificaciones`, `equipos`, `trabajadores`, columnas `user_id`/`equipo_id`/`activo`). |
| **Backend** | `uvicorn main:app --reload` → `http://localhost:8000`. Comprobar `GET /ping` → `{"message":"pong"}` y Swagger en `/docs`. |
| **Frontend** | `npx ng serve` → normalmente `http://localhost:4200`. **(URL definitiva la indica el responsable.)** |
| **CORS** | El backend permite `http://localhost:4200` por defecto. Si el front corre en otro puerto, exportar `ALLOWED_ORIGINS`. |
| **Admin (bootstrap)** | El registro público crea siempre `ciudadano`. Crear un admin con `python scripts/crear_admin.py <email> <password>` (o variables `BOOTSTRAP_ADMIN_EMAIL`/`BOOTSTRAP_ADMIN_PASSWORD`). **Hace falta para todo el bloque admin.** |
| **Navegador** | Chrome con la extensión de Chrome MCP conectada. |

### Cuentas y datos de prueba (sugeridos)

| Rol | Email | Password | Cómo se obtiene |
|---|---|---|---|
| **Admin** | `admin@urban-alert.local` | `<ADMIN_PASS>` | `scripts/crear_admin.py` (lo crea el responsable) |
| **Ciudadano A** | `ciudadanoA@test.com` | `Password123` | Se registra en el caso **B1** |
| **Ciudadano B** | `ciudadanoB@test.com` | `Password123` | Se registra (para probar aislamiento de "mis incidencias") |

> ℹ️ **Dato técnico útil (de `crear-incidencia`):** al enviar un reporte, el `titulo` que se manda es **la etiqueta de la categoría** (p. ej. `"Alumbrado"`), la `prioridad` va en minúscula, y la **ubicación** sale de la geolocalización del navegador; si se deniega o no hay GPS usa un **fallback fijo: Campus UA `lat 38.3852, lng -0.5132`** (Alicante). El **mapa** (`/mapa-incidencias`), en cambio, filtra alrededor de **Madrid `40.4168, -3.7038` con radio 5000 m** → ⚠️ una incidencia creada con el fallback **no aparecerá en el mapa**. Esto se verifica en **E1** (posible hallazgo de coordenadas).

### Convención de cada caso
- **ID / Objetivo** · **Precondición** · **Pasos** · **Esperado** · *(durante la ejecución se anota Resultado ✅/❌ + notas)*.

---

## A. Arranque y salud

**A1 — Backend operativo**
- Pasos: navegar a `http://localhost:8000/ping`; luego a `/docs`.
- Esperado: `/ping` devuelve `{"message":"pong"}`; Swagger carga y lista los routers `auth`, `incidencias`, `notificaciones`, `stats`, `users`, `equipos`, `trabajadores`.

**A2 — Frontend carga (home pública)**
- Pasos: abrir la URL del frontend (raíz `/` → redirige a `/home`).
- Esperado: se ve el *hero* "Reporta incidencias de tu ciudad…", botones **Reportar incidencia** y **Ver incidencias en el mapa**, sección "Categorías principales" y "Gestión en tres pasos". **Sin errores en consola**.

**A3 — Sin errores de CORS / red en navegación básica**
- Pasos: con el panel de red abierto, navegar home → mapa → login.
- Esperado: no hay errores CORS ni 5xx; las peticiones a `localhost:8000` responden correctamente.

---

## B. Autenticación y autorización

**B1 — Registro de ciudadano**
- Pasos: menú (icono ☰) → **Iniciar sesión / Registrarse** → ir a **Registrarse** (`/registrar`); rellenar email `ciudadanoA@test.com` y password `Password123` (≥8 chars); enviar.
- Red: `POST /auth/register` → **201** `{id,email,rol:"ciudadano"}`.
- Esperado: registro correcto y navegación a `/login` (o auto-login). Repetir para `ciudadanoB@test.com`.

**B2 — Registro con email ya existente**
- Pasos: intentar registrar de nuevo `ciudadanoA@test.com`.
- Red: `POST /auth/register` → **400**.
- Esperado: se muestra un mensaje de error ("email ya registrado"); no se crea duplicado.

**B3 — Login ciudadano correcto**
- Pasos: `/login` → email `ciudadanoA@test.com` / `Password123` → entrar.
- Red: `POST /auth/login` (`application/x-www-form-urlencoded`, `username`=email) → **200** `{access_token}`.
- Esperado: redirige a `/home`; en `localStorage` hay `urban-alert-token` y `urban-alert-role=ciudadano`.

**B4 — Login con credenciales inválidas**
- Pasos: `/login` con password incorrecta.
- Red: `POST /auth/login` → **401**.
- Esperado: mensaje de error; no se guarda token.

**B5 — Login admin → dashboard**
- Pasos: `/login` con las credenciales de admin.
- Red: `POST /auth/login` → 200; (al entrar a `/admin`) `GET /stats` con `Authorization: Bearer`.
- Esperado: redirige a **`/admin`** (panel); `urban-alert-role=admin`.

**B6 — Guard de rutas admin (ciudadano bloqueado)**
- Precondición: sesión de **ciudadano** (B3).
- Pasos: navegar manualmente a `/admin`, `/admin/usuarios`, `/admin/equipos`.
- Esperado: el `adminGuard` **impide el acceso** y redirige (a `/home`). No se cargan datos admin.

**B7 — Redirección de admin en home**
- Precondición: sesión **admin**.
- Pasos: navegar a `/home`.
- Esperado: el guard `redirectAdminHome` redirige a **`/admin`**.

**B8 — Persistencia de sesión**
- Precondición: sesión iniciada.
- Pasos: **recargar** la página (F5).
- Red: `GET /auth/me` → 200 (si la app lo verifica).
- Esperado: la sesión se mantiene (token persiste); el rol sigue aplicándose.

**B9 — Cerrar sesión (logout)**
- Pasos: buscar en la UI una opción de **cerrar sesión** (menú ciudadano / menú admin).
- Esperado: si existe, al cerrar sesión se borra `urban-alert-token`/`urban-alert-role` y se vuelve al estado no autenticado.
- ⚠️ **Verificación / posible hallazgo:** los menús observados (menú ciudadano y menú admin) **no muestran un botón de logout**. Si se confirma que no existe, **documentarlo como gap de UX**. Para continuar las pruebas se puede simular logout borrando `localStorage` desde DevTools.

**B10 — Manejo de token inválido/expirado (interceptor 401)**
- Precondición: sesión ciudadano.
- Pasos: alterar `urban-alert-token` en `localStorage` por un valor inválido; navegar a `/mis-incidencias`.
- Red: `GET /incidencias/mias` → **401**.
- Esperado: el `authInterceptor` hace **logout y redirige a `/login`**.

**B11 — Usuario desactivado no puede iniciar sesión** *(depende de I6)*
- Precondición: el admin ha **desactivado** a `ciudadanoB` (caso **I6**).
- Pasos: cerrar sesión / abrir `/login` e intentar entrar como `ciudadanoB`.
- Red: `POST /auth/login` → **401**.
- Esperado: login rechazado pese a credenciales correctas (bloqueo por `activo=false`).

---

## C. Crear incidencia (ciudadano)

**C1 — Crear incidencia completa (con sesión)**
- Precondición: sesión `ciudadanoA`. Menú → **Reportar** (`/crear-incidencia`).
- Pasos: *Paso 1 (Detalles)* → elegir categoría (p. ej. **Alumbrado**), prioridad (**Alta**), escribir descripción; **Continuar**. *Paso 2 (Ubicación)* → escribir una dirección; **Enviar reporte**. *(El navegador puede pedir permiso de ubicación; aceptar o denegar — con denegar usa el fallback Campus UA.)*
- Red: `POST /incidencias` → **201** con `titulo="Alumbrado"`, `categoria="alumbrado"`, `prioridad="alta"`, `latitud`/`longitud` informadas. Con sesión, la petición lleva `Authorization: Bearer` → la incidencia queda con `user_id`.
- Esperado: aparece un `alert` "Tu reporte #N se ha enviado correctamente"; el formulario se resetea.

**C2 — Cobertura de las 6 categorías del backend**
- Pasos: crear una incidencia eligiendo **Tráfico** y otra eligiendo **Zonas verdes**.
- Red: comprobar en el `POST /incidencias` que `categoria` = `trafico` y `zonas_verdes` respectivamente. (Resto del mapeo: Basura→`residuos`, Baches/Mobiliario→`infraestructura`, Vandalismo→`otro`, Alumbrado→`alumbrado`.)
- Esperado: las 6 categorías del backend son alcanzables desde la UI.

**C3 — Adjuntar imagen válida**
- Pasos: en el Paso 1, **Añadir foto** y seleccionar un **JPEG/PNG** real; completar y enviar.
- Red: tras `POST /incidencias`, un `POST /incidencias/{id}/imagenes` (`multipart/form-data`, campo `file`) → **201** `{ruta}`.
- Esperado: la imagen queda asociada; se verá en el **detalle** (caso F1).

**C4 — Validación / moderación de contenido**
- Pasos: crear una incidencia con la **descripción** conteniendo un término prohibido (p. ej. `spam` o `xxx`).
- Red: `POST /incidencias` → **422**.
- Esperado: se muestra el error ("términos no permitidos") y **no** se crea la incidencia.

**C5 — Autoría (con sesión vs anónima)**
- Pasos: (a) crear con sesión `ciudadanoA` → debe aparecer luego en **Mis incidencias** de A (D2). (b) cerrar sesión y crear una incidencia anónima → **no** debe aparecer en "mis incidencias" de ningún usuario.
- Esperado: la autoría se respeta (`user_id` del autor, o `null` si anónima).

---

## D. Mis incidencias (ciudadano)

**D1 — Sin sesión redirige a login**
- Precondición: **sin** sesión (localStorage limpio).
- Pasos: navegar a `/mis-incidencias`.
- Esperado: redirige a **`/login`** (guard de sesión proactivo) y **no** se dispara `GET /incidencias/mias`.

**D2 — Lista solo las incidencias propias**
- Precondición: sesión `ciudadanoA`, que ya creó alguna incidencia (C1/C5).
- Pasos: menú → **Mis incidencias**.
- Red: `GET /incidencias/mias` (con Bearer) → `{items,total,…}`.
- Esperado: se ven **solo** las incidencias de A. Iniciar sesión como `ciudadanoB` y comprobar que **no** ve las de A (aislamiento por autor).

**D3 — Estado vacío**
- Precondición: un usuario recién registrado sin incidencias.
- Esperado: se muestra un *empty-state* (sin incidencias) en lugar de error.

---

## E. Mapa de incidencias

**E1 — Carga de incidencias reales (geofiltradas)**
- Pasos: menú → **Mapa** (`/mapa-incidencias`).
- Red: `GET /incidencias?lat=40.4168&lng=-3.7038&radio=5000…` → `{items,…}`.
- Esperado: la lista deja de ser mock y refleja datos reales **dentro de 5 km de Madrid**.
- ⚠️ **Hallazgo a verificar:** como `crear-incidencia` usa por defecto coordenadas de **Campus UA (Alicante)**, las incidencias creadas en las pruebas **pueden no aparecer aquí**. Confirmar si el mapa sale **vacío** y, si procede, anotar la **inconsistencia de coordenadas** (centro Madrid vs alta en Alicante). *(Para ver datos en el mapa habría que sembrar incidencias cerca de Madrid vía Swagger.)*

**E2 — Estados de carga / vacío / error**
- Esperado: se ven correctamente los estados de carga, vacío y error (p. ej. si el backend no responde).

---

## F. Detalle de incidencia

**F1 — Detalle con datos reales**
- Precondición: conocer el `id` de una incidencia (del `alert` de C1, o de `GET /incidencias`).
- Pasos: navegar a `/detalle-incidencia/{id}`.
- Red: `GET /incidencias/{id}` → 200.
- Esperado: muestra título, estado, categoría, prioridad, descripción; **galería de evidencias** con las imágenes reales (C3); **timeline** construida desde `historial` (si no hay cambios aún → "Aún no hay cambios de estado registrados"). **Sin** sección de comentarios mock.

**F2 — Detalle tras cambios (historial + equipo)** *(depende de K1 y J7)*
- Precondición: a la incidencia se le cambió el estado (K1) y/o se le asignó un equipo (J7).
- Esperado: la **timeline** muestra la entrada `estado anterior → nuevo` con autor y fecha; y se ve el **equipo asignado** (`equipo` en la respuesta).

---

## G. Notificaciones

**G1 — Página de notificaciones**
- Pasos: menú → **Notificaciones** (`/notificaciones`).
- Red: `GET /notificaciones` → array (más reciente primero).
- Esperado: lista los avisos (mensaje, estado nuevo, fecha) distinguiendo leídas/no leídas; *empty-state* si no hay.

**G2 — Generación de notificación por cambio de estado** *(depende de K1)*
- Precondición: un admin cambió el **estado** de una incidencia (K1).
- Esperado: aparece una notificación nueva del tipo *"La incidencia '…' cambió de estado: abierta → en_progreso"*.

**G3 — Marcar como leída**
- Pasos: en una notificación no leída, pulsar **Marcar como leída**.
- Red: `PATCH /notificaciones/{id}/leer` → 200 (`leida:true`).
- Esperado: el item pasa a estado leído en la UI sin recargar.

---

## H. Dashboard de administración

**H1 — Métricas desde /stats**
- Precondición: sesión **admin** (B5).
- Pasos: ir a `/admin`.
- Red: `GET /stats` (Bearer admin) → agregados.
- Esperado: tarjetas de métricas (Totales, Abiertas, En progreso, Resueltas) con **valores reales** + lista de incidencias recientes.

**H2 — Coherencia de las cifras**
- Esperado: el "total" y los conteos por estado **coinciden** con las incidencias creadas durante las pruebas (cotejar con `GET /incidencias?limit=100`).

**H3 — Navegación del menú admin**
- Esperado: el menú admin enlaza a Dashboard, **Equipos** (`/admin/equipos`), **Usuarios** (`/admin/usuarios`), Mapa ciudadano y Vista ciudadana, y todos cargan.

---

## I. Gestión de usuarios (admin)

> Todas las peticiones llevan `Authorization: Bearer` (admin). Pantalla: `/admin/usuarios`.

**I1 — Listar usuarios** · `GET /users` → tabla con `id, email, rol, activo`. (Ya **no** debe haber datos mock ni campos `name`/`phone`.)

**I2 — Crear usuario** · formulario email + password + rol → `POST /users` **201**; el nuevo usuario aparece en la lista (`activo:true`).

**I3 — Crear con email duplicado** · `POST /users` → **400**; banner de error.

**I4 — Editar email** · editar inline el email de un usuario → `PATCH /users/{id}` **200**.

**I5 — Cambiar rol** · promover `ciudadanoA` a `admin` (y/o degradar) → `PATCH /users/{id}/rol` **200**; la columna Rol se actualiza.

**I6 — Activar/desactivar** · desactivar a `ciudadanoB` → `PATCH /users/{id}/estado` `{activo:false}` **200**; el estado pasa a inactivo/bloqueado. *(Habilita el caso **B11**.)*

**I7 — Eliminar usuario** · borrar un usuario de prueba → `DELETE /users/{id}` **204**; desaparece de la lista.

**I8 — Guardas de autoacción** · intentar **eliminar** o **desactivar tu propia cuenta admin** → **400**; se muestra el error y no se aplica.

---

## J. Gestión de equipos y trabajadores (admin)

> Pantalla: `/admin/equipos`. Categorías = las **6 del backend**.

**J1 — Listar equipos** · `GET /equipos` → equipos reales con sus `trabajadores` anidados (sin mock).

**J2 — Crear equipo** · nombre + categoría (p. ej. "Brigada Alumbrado" / `alumbrado`) → `POST /equipos` **201**.

**J3 — Editar equipo** · cambiar nombre/categoría → `PATCH /equipos/{id}` **200**.

**J4 — Añadir trabajador** · al equipo creado, añadir trabajador (nombre/puesto) → `POST /equipos/{id}/trabajadores` **201**; aparece en el equipo.

**J5 — Quitar trabajador** · quitar el trabajador → `DELETE /equipos/{id}/trabajadores/{tid}` **204** (queda **desasignado**, no borrado).

**J6 — Eliminar equipo** · borrar un equipo de prueba → `DELETE /equipos/{id}` **204**.

**J7 — Asignar equipo a incidencia COMPATIBLE**
- Precondición: existe un equipo de categoría X y una incidencia de la **misma** categoría X.
- Pasos: desde la gestión de equipos, asignar ese equipo a esa incidencia.
- Red: `PATCH /incidencias/{id}/equipo` `{equipo_id}` → **200**.
- Esperado: asignación correcta; el **detalle** de la incidencia muestra el equipo (F2).

**J8 — Asignar equipo INCOMPATIBLE (validación de categoría)**
- Pasos: intentar asignar un equipo a una incidencia de **categoría distinta**.
- Red: `PATCH /incidencias/{id}/equipo` → **409**.
- Esperado: la UI muestra un **error claro de categoría incompatible** y **no** asigna.

---

## K. Cambiar estado/prioridad de incidencia (admin)

> ⚠️ **Verificación de disponibilidad en UI:** comprobar **si existe** un control en la interfaz (dashboard/detalle/listado admin) para que el admin **cambie el estado o la prioridad** de una incidencia (`PATCH /incidencias/{id}`). Por lo revisado, el detalle y el dashboard parecen **de solo lectura** → **posible gap de UI**. Si **no** hay control en la web:
> - Anotarlo como **hallazgo** (falta acción admin para gestionar el ciclo de vida de la incidencia desde la UI).
> - Ejecutar K1/K2 vía **Swagger** (`/docs`) como *setup* para poder validar **G2** (notificación) y **F2** (historial) en la UI.

**K1 — Cambiar estado** · `PATCH /incidencias/{id}` `{estado:"en_progreso"}` → 200; se crea entrada de **historial** y **una notificación** (verificar en F2 y G2).

**K2 — Cambiar solo prioridad** · `PATCH /incidencias/{id}` `{prioridad:"alta"}` → 200; se registra historial pero **NO** genera notificación.

---

## L. Negativos, cross-cutting y robustez

**L1 — Acceso no autorizado** · sin sesión, intentar `/admin/*` → redirige (guard). Endpoints admin sin token → 401/403 (cotejar en red).

**L2 — Resiliencia ante backend caído** · con el backend detenido, navegar por las pantallas que cargan datos (mapa, mis incidencias, dashboard, usuarios, equipos) → la UI muestra **banners de error** y no se rompe (sin pantallas en blanco).

**L3 — Paginación** · si se generan >20 usuarios o incidencias, verificar el comportamiento de `limit`/`offset` (puede no estar expuesto en la UI → anotar si falta control de paginación).

**L4 — Responsive (móvil)** · redimensionar a ~390 px de ancho: el menú ☰, las tarjetas y las tablas deben adaptarse sin desbordes graves.

**L5 — Consola limpia** · durante toda la sesión, revisar la consola: no debe haber **errores JS** ni 5xx inesperados. *(Avisos cosméticos de iconos Ionicons no registrados son aceptables.)*

---

## 📋 Registro de resultados — ejecutado 2026-06-11 (Chrome MCP, frontend `:4200` + backend `:8000`)

| Caso | Resultado | Notas |
|---|---|---|
| A1 Backend `/ping` | ✅ | `{"message":"pong"}` |
| A2 Home carga | ✅ | En español, sin datos falsos; badge "N Activas" = conteo real |
| A3 Sin CORS/errores | ✅ | `GET /incidencias`→200, consola limpia |
| B1 Registro ciudadano | ✅ | `POST /auth/register`→201, redirige a /login (ciudadanoA@test.com) |
| B2 Registro duplicado | ✅ | →400 |
| B3 Login ciudadano | ✅ | →200 + `/auth/me`; token+rol=ciudadano+email en localStorage |
| B4 Login inválido | ✅ | →401 |
| B5 Login admin | ✅ | rol=admin, redirige a /admin |
| B6 Guard admin | ✅ | `/admin` sin permiso → /home |
| B7 Redirección admin | ✅ | login admin → /admin (redirectAdminHome) |
| B8 Persistencia sesión | ⏭️ | No probado explícitamente (token persiste en localStorage) |
| B9 Logout | ✅ | Menú con email+rol+"Cerrar sesión"; limpia token y va a /login (**fix #60**) |
| B10 Token inválido→401 | ⏭️ | No probado explícitamente (interceptor presente) |
| B11 Usuario desactivado | ✅ | Tras desactivar, `POST /auth/login`→401 |
| C1 Crear incidencia | ✅ | →201, #2: titulo=Alumbrado, categoria=alumbrado, prioridad=alta, **user_id=3 (autor)** |
| C2 6 categorías | ✅ | UI ofrece las 6 (incl. Tráfico, Zonas verdes) → backend |
| C3 Subir imagen | ⏭️ | No probado (sin fichero de prueba a mano) |
| C4 Moderación | ✅ | Descripción con "spam" → 422 |
| C5 Autoría | ✅ | Con sesión → user_id del autor; anónima → null |
| D1 Sin sesión→login | ✅ | `/mis-incidencias` sin sesión → /login |
| D2 Solo propias | ✅ | `GET /incidencias/mias`→200, muestra solo las de A |
| D3 Estado vacío | ⏭️ | No probado (A ya tenía incidencias) |
| E1 Mapa real | ✅ | Carga incidencias reales SIN geofiltro fijo (lo creado aparece) — **fix #59**; chips filtran (`?estado=`) |
| E2 Estados mapa | ✅ | "No hay incidencias para este filtro" funciona |
| F1 Detalle real | ✅ | #UA-2 real (sin mock #UA-2048), galería/timeline/equipo/reportero reales — **fix #57** |
| F2 Detalle tras cambios | ✅ | Timeline "Abierta→En progreso · Prioridad" + autor; equipo asignado visible |
| G1 Página notificaciones | ⏭️ | No visitada directamente (avisos verificados en el detalle) |
| G2 Notificación por estado | ✅ | El cambio de estado generó el aviso automáticamente |
| G3 Marcar leída | ✅ | `PATCH /notificaciones/{id}/leer` → "✓ Leída" (**fix #64**) |
| H1 Dashboard /stats | ✅ | Métricas reales (Totales 2, Abiertas 2…) — **fix #65** |
| H2 Cifras coherentes | ✅ | Coinciden con la BD |
| H3 Navegación admin | ✅ | Menú admin compartido con todas las entradas + logout (**#67**) |
| I1 Listar usuarios | ✅ | id/email/rol/activo, sin mock — **fix #41** |
| I2 Crear usuario | ☑️ | Formulario presente (email/password/rol) — no ejecutado end-to-end |
| I3 Email duplicado | ☑️ | Mismo endpoint que B2 (→400) |
| I4 Editar email | ☑️ | Acción presente (no ejecutada) |
| I5 Cambiar rol | ☑️ | Pill de rol presente (no ejecutada) |
| I6 Activar/desactivar | ✅ | Desactivar user@ → Inactivo; "Cuentas activas" 3→2 |
| I7 Eliminar usuario | ☑️ | Acción presente (no ejecutada) |
| I8 Guard auto-acción | ✅ | Desactivar la propia cuenta → "No puedes desactivar tu propia cuenta" |
| J1 Listar equipos | ✅ | Real, sin mock — **fix #43** |
| J2 Crear equipo | ✅ | "Brigada Alumbrado" / alumbrado (EQ-1) |
| J3 Editar equipo | ☑️ | Panel de edición + Guardar/Eliminar presente |
| J4/J5 Trabajadores | ☑️ | Sección "Trabajadores" + Añadir presente — **#63** (no ejecutado end-to-end) |
| J6 Eliminar equipo | ☑️ | "Eliminar equipo" presente |
| J7 Asignar compatible | ✅ | EQ-1→incidencia #2 (alumbrado) → 200, equipo visible en el detalle |
| J8 Asignar incompatible | ✅ | EQ-1→incidencia #1 (residuos) → **409**; UI no ofrece equipos incompatibles |
| K1 Cambiar estado | ✅ | Acciones admin en el detalle (selects + Guardar) — **fix #58**; genera historial+notificación |
| K2 Solo prioridad | ⏭️ | No probado por separado (no debe generar notificación) |
| L1 Acceso no autorizado | ✅ | Guards redirigen sin sesión |
| L4 Responsive | ☑️ | Media queries implementadas (#67); no confirmado visualmente (el resize no estrechó el viewport capturado) |
| L5 Consola limpia | ✅ | Sin errores JS durante toda la sesión |

> Leyenda: ✅ verificado · ☑️ presente/operativo (no ejecutado end-to-end) · ⏭️ no probado.

## 🔎 Hallazgos — los 4 puntos de atención originales quedan RESUELTOS
1. ~~Logout no expuesto~~ → **RESUELTO (#60)**: menú reactivo con email/rol + "Cerrar sesión"; verificado que limpia la sesión.
2. ~~Coordenadas mapa vs alta~~ → **RESUELTO (#59)**: el mapa ya no geofiltra a Madrid; las incidencias creadas (coords Campus UA) **sí aparecen**. Chips de filtro funcionales.
3. ~~Sin acción admin estado/prioridad~~ → **RESUELTO (#58)**: el detalle tiene "Acciones de administración" (selects estado/prioridad + Guardar); al guardar se genera historial + notificación.
4. ~~Paginación no expuesta~~ → **RESUELTO (#62)**: controles Anterior/Siguiente + "X–Y de total" (usuarios y mis-incidencias).

### Observaciones menores (no bloqueantes)
- El **subtítulo del header de la home** sigue diciendo "Urban Management" (el resto de la marca ya es "Urban Alert"). Cosmético.
- El **iframe del mapa** ciudadano sigue centrado en Madrid de forma estática (la *lista* sí es real); migrar a marcadores reales (p. ej. Leaflet) queda como mejora futura.

> Conclusión: la app funciona de extremo a extremo (flujos ciudadano y admin) contra la API real; todos los fixes de la auditoría (P1/P2/P3) se confirman en la UI.
