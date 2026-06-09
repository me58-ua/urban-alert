# 🔍 Auditoría #001 — Urban Alert

| | |
|---|---|
| **Fecha** | 2026-06-09 |
| **Alcance** | Frontend (Angular/Ionic) + Backend (FastAPI) desplegados en local |
| **Método** | Pruebas en navegador con MCP de Chrome sobre `http://localhost:4200`, revisión de red/consola, y verificación de API contra el contenedor PostgreSQL (`urban-alert-db`, :5433) |
| **Entorno** | Backend `:8000` · Frontend `:4200` · BD PostgreSQL en Docker `:5433` |

---

## 🧭 Resumen ejecutivo

La infraestructura está **operativa**: backend, frontend y base de datos arrancan y se comunican. El backend (API REST) está **completo y verificado**. El frontend, en cambio, es **mayoritariamente una maqueta visual**: la única funcionalidad realmente conectada al backend es **crear incidencia**. El resto de la interfaz (home, login, mapa, listados, categorías) usa **datos ficticios** o son **botones sin acción**.

> **Conclusión:** la app "funciona" como demo visual + creación de incidencias, pero **no como producto end-to-end**. Falta conectar la lectura/visualización de datos y eliminar/implementar los elementos placeholder.

---

## ✅ Lo que SÍ funciona

- **Despliegue completo** vía `script/deploy.ps1` (BD en contenedor + backend + frontend).
- **Backend / API REST**: CRUD de incidencias, filtros, subida de imágenes e historial de estados. **6/6 tests** en verde.
- **CORS** configurado → el navegador puede llamar a la API.
- **Crear incidencia (frontend → backend)**: el formulario recoge tipo, prioridad, descripción y fotos, mapea los datos al esquema del backend y hace `POST /incidencias`. Verificado a nivel de API (se crea y persiste en PostgreSQL).
- **Navegación principal**: el botón **"Reportar incidencia"** lleva correctamente a `/crear-incidencia`.

---

## 🖥️ Problemas del FRONTEND

### 🔴 Críticos (funcionalidad ausente o rota)
1. **Botón "LOGIN"** (cabecera): **no hace nada**. No hay autenticación ni pantalla de login.
2. **"Ver incidencias en el mapa"**: no abre ningún mapa ni listado; solo cambia el hash a `#trust`. **No existe vista de mapa ni de listado de incidencias.**
3. **Ruta `/urban-alert`**: página **vacía** (stub por defecto de Ionic, solo un título "urban-alert" y cuerpo en blanco).
4. **La home no consume el backend**: se confirmó por red que la home hace **0 llamadas a `:8000`**. Todos los datos son **ficticios/hardcodeados**:
   - "124 Activas", tarjeta "Farola fundida / PENDIENTE".
   - Métricas "94% / 24h / 12k / 8.5".
   - "MAPA EN TIEMPO REAL" es una imagen decorativa, no un mapa real.

### 🟠 Importantes (UX / consistencia)
5. **Geolocalización bloqueante**: al enviar una incidencia, `navigator.geolocation` lanza el permiso del navegador y, si el usuario **no responde**, el envío queda **colgado indefinidamente** (el `timeout` no salta mientras el permiso está pendiente). No hay selector de ubicación en mapa; el campo "Dirección" es texto libre que **no se convierte a coordenadas**.
6. **"Ver todas las categorías"** y **tarjetas de categoría** (Alumbrado, Basura, Baches…): **sin acción** (solo hash `#steps`). No filtran ni navegan.
7. **Idioma inconsistente**: los enlaces de cabecera están en **inglés** ("Report an Incident", "View Map") mientras el resto de la UI está en español. Además son anclas `#hero`/`#categories` que con `ion-content` **no hacen scroll** de forma fiable.
8. **Solo se usa 1 de 6 operaciones de la API**: el frontend únicamente consume `POST /incidencias` (crear) + subida de imagen. **No se consumen** `GET /incidencias` (listar), `GET /incidencias/{id}` (detalle), ni `PATCH /incidencias/{id}` (gestión de estado por admin).

### 🟡 Menores
9. **Iconos de categoría** se renderizan como **círculos vacíos** (no cargan las imágenes/iconos).
10. **Logo de marca** se carga desde una **URL externa de Figma** (`figma.com/api/mcp/asset/...`) → dependencia frágil (rompe sin conexión o si el asset se elimina). Debería alojarse en `assets/`.
11. **Presupuesto CSS de producción**: `home.page.scss` (~12,9 kB) supera el límite de `angular.json` (4 kB) → `npm run build` (producción) falla. No afecta a `ng serve` (dev).

---

## ⚙️ Problemas del BACKEND

### 🟠 Importantes
1. **Sin autenticación real**: la "seguridad" de admin es solo una cabecera `X-Role: admin` (`dependencies.get_admin_role`). Cualquiera puede enviarla. (El PRD marca auth como "futuro").
2. **Filtro geográfico (Haversine) en Python**: `listar_incidencias` carga **todas** las filas y filtra en memoria, en lugar de hacerlo en SQL. No escala a los "miles de incidencias" del PRD.
3. **Sin paginación** en `GET /incidencias` → devuelve todo el conjunto.
4. **Lógica de historial incompleta** en `actualizar_incidencia`: solo registra el cambio cuando cambia el **estado**; los cambios de **solo prioridad** no quedan en `historial_estados`, pese a comentarios en el código que sugieren registrar "todo cambio". Hay ramas de código muertas (`pass`).

### 🟡 Menores
5. **Avisos de deprecación de Pydantic v2**: `schemas.py` usa `class Config` (deprecado) → migrar a `ConfigDict`.
6. **Credenciales en claro** (`admin`/`adminpassword`) en `alembic.ini` y `docker-compose.yml`; sin `.env`/secrets.
7. **Almacenamiento de imágenes en disco local** (`uploads/`) → no persiste de forma fiable en escenarios de contenedor (no está en volumen).
8. **Extensión de archivo** derivada de `filename.split(".")[-1]` sin validación robusta (solo se valida `content_type`).
9. **`DATABASE_URL` por defecto apunta a `:5432`**: si se arranca el backend a mano (sin el script), conecta al Postgres nativo, no al contenedor del proyecto (`:5433`). Hay que exportar `DATABASE_URL`.

---

## 🔗 Estado de la integración Backend ↔ Frontend

| Operación API | Implementada en backend | Consumida por el frontend |
|---|:---:|:---:|
| `POST /incidencias` (crear) | ✅ | ✅ (crear-incidencia) |
| `POST /incidencias/{id}/imagenes` (subir foto) | ✅ | ✅ (best-effort) |
| `GET /incidencias` (listar/filtrar) | ✅ | ❌ |
| `GET /incidencias/{id}` (detalle + historial) | ✅ | ❌ |
| `PATCH /incidencias/{id}` (estado, admin) | ✅ | ❌ |
| `GET /ping` (salud) | ✅ | ❌ |

---

## 📋 Lo que falta por hacer

### Frontend
- [ ] **Vista de listado de incidencias** consumiendo `GET /incidencias` (sustituir la tarjeta mock "Farola fundida").
- [ ] **Mapa real** de incidencias (Leaflet / Google Maps) para "Ver incidencias en el mapa".
- [ ] **Vista de detalle** (`GET /incidencias/{id}`) con imágenes e historial.
- [ ] **Panel de gestión / cambio de estado** (admin) usando `PATCH` + `X-Role`.
- [ ] **Datos reales en la home** (contadores y métricas desde el backend, no hardcodeados).
- [ ] **Login / autenticación** funcional (el botón actual no hace nada).
- [ ] **Selector de ubicación en mapa** y arreglar la **UX de geolocalización** (no bloquear si se ignora el permiso; geocodificar la dirección).
- [ ] **Filtrado por categoría** (las tarjetas/categorías deben filtrar).
- [ ] Rellenar o eliminar la **página `/urban-alert`** (vacía).
- [ ] **Localizar** los enlaces de cabecera al español y corregir el scroll de anclas.
- [ ] Alojar el **logo** en `assets/` (no depender de Figma) y arreglar los **iconos de categoría**.
- [ ] Ajustar el **presupuesto CSS** en `angular.json` para que `npm run build` (prod) pase.

### Backend
- [ ] **Autenticación real** (p. ej. JWT) en lugar de la cabecera `X-Role`.
- [ ] **Paginación** y mover el **filtro Haversine a SQL**.
- [ ] Corregir el **registro de historial** en `actualizar_incidencia` (incluir cambios de prioridad / limpiar ramas muertas).
- [ ] Migrar `class Config` → **`ConfigDict`** (Pydantic v2).
- [ ] **Gestión de secretos** (variables de entorno / `.env`) y almacenamiento de imágenes en volumen/persistente.

### Integración / DevOps
- [ ] Conectar el resto de operaciones de la API al frontend (hoy solo "crear").
- [ ] Datos de **seed** para demos (que la home/listado muestren incidencias reales).

---

## 🧪 Evidencias de la auditoría

- **Red (home)**: 69 peticiones, todas a `localhost:4200` + 1 a `figma.com`; **0 a `localhost:8000`** → home estática.
- **Consola**: sin errores JS en la navegación probada.
- **Rutas probadas**: `/home` (OK), `/crear-incidencia` (OK, formulario funcional), `/urban-alert` (vacía).
- **Botones probados**: "Reportar incidencia" (✅ navega), "Ver incidencias en el mapa" (⚠️ solo ancla), "LOGIN" (❌ sin acción), "Ver todas las categorías" (⚠️ solo ancla), tarjetas de categoría (⚠️ sin acción).
- **API**: `POST /incidencias` verificado contra el contenedor PostgreSQL (creación + persistencia correctas).

> **Nota de método:** la verificación del `POST` desde el navegador quedó bloqueada por el prompt nativo de geolocalización; la creación se validó a nivel de API. El wiring del frontend (servicio + `provideHttpClient` + formulario) compila y está correctamente cableado.
