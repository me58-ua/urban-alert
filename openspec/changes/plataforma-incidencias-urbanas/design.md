# Design: Plataforma de Incidencias Urbanas (Backend)

## Overview

Backend REST API para la gestión de incidencias urbanas. Scope limitado a la práctica: solo backend, sin frontend, sin almacenamiento de imágenes, sin PostGIS. La geolocalización se almacena como campos `lat`/`lng` simples (FLOAT).

## Architecture

Arquitectura en capas clásica, simple y directa:

```
HTTP Request
     │
     ▼
┌─────────────┐
│   Router    │  Define rutas y métodos HTTP
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Handlers   │  Valida request, llama al servicio, devuelve JSON
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Services   │  Lógica de negocio (reglas, transformaciones)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Repository  │  Acceso a la base de datos (CRUD)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ PostgreSQL  │
└─────────────┘
```

### Stack

| Capa | Tecnología |
|------|-----------|
| Lenguaje | Python 3.11+ |
| Framework | FastAPI |
| ORM | SQLAlchemy (con Alembic para migraciones) |
| Driver BD | psycopg2-binary |
| Base de datos | PostgreSQL |
| Formato de respuesta | JSON |

## Key Technical Decisions

### 1. Sin PostGIS — lat/lng como FLOAT
- **Decisión**: Almacenar `latitud` y `longitud` como campos `FLOAT` simples.
- **Razón**: PostGIS añade complejidad innecesaria para una práctica. El filtrado por proximidad puede hacerse con la fórmula de Haversine en el servicio si se requiere.
- **Trade-off**: El filtrado geográfico es menos eficiente, pero suficiente para el scope de la práctica.

### 2. Imágenes en volumen local
- **Decisión**: Las imágenes se suben al backend (endpoint `POST /incidencias/:id/imagenes`), se guardan en un directorio local configurable (volumen en disco), y se almacena la **ruta relativa** del fichero en la base de datos.
- **Razón**: Enfoque simple sin dependencias externas; el directorio puede montarse como volumen Docker si la práctica se conteneriza.
- **Trade-off**: No escala a múltiples instancias (no hay almacenamiento compartido), pero es suficiente para la práctica.

### 3. Autenticación simplificada por rol via header
- **Decisión**: Distinguir ciudadano/admin mediante un header `X-Role: admin` o `X-Role: ciudadano` en la request.
- **Razón**: Sin sistema de login real en MVP; el middleware lee el header y aplica las reglas de acceso.
- **Trade-off**: Sin seguridad real — apropiado para práctica, no para producción.

### 4. FastAPI + SQLAlchemy
- **Decisión**: FastAPI como framework REST, SQLAlchemy como ORM, Alembic para migraciones.
- **Razón**: FastAPI genera documentación OpenAPI automática (`/docs`), es rápido de desarrollar y SQLAlchemy abstrae el acceso a PostgreSQL de forma sencilla.
- **Trade-off**: Requiere entorno Python (virtualenv/pip) y PostgreSQL disponible o en Docker.

## Data Model

```sql
CREATE TYPE categoria_enum AS ENUM ('infraestructura','alumbrado','residuos','trafico','zonas_verdes','otro');
CREATE TYPE prioridad_enum AS ENUM ('baja','media','alta');
CREATE TYPE estado_enum   AS ENUM ('abierta','en_progreso','resuelta','rechazada');

CREATE TABLE incidencias (
  id                  SERIAL PRIMARY KEY,
  titulo              VARCHAR(200) NOT NULL,
  descripcion         TEXT,
  categoria           categoria_enum NOT NULL,
  prioridad           prioridad_enum NOT NULL DEFAULT 'media',
  estado              estado_enum    NOT NULL DEFAULT 'abierta',
  latitud             DOUBLE PRECISION NOT NULL,
  longitud            DOUBLE PRECISION NOT NULL,
  fecha_creacion      TIMESTAMPTZ DEFAULT now(),
  fecha_actualizacion TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE imagenes (
  id              SERIAL PRIMARY KEY,
  incidencia_id   INTEGER NOT NULL REFERENCES incidencias(id) ON DELETE CASCADE,
  ruta            TEXT NOT NULL,  -- ruta relativa en el volumen, ej: "uploads/1/foto.jpg"
  fecha_subida    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE historial_estados (
  id              SERIAL PRIMARY KEY,
  incidencia_id   INTEGER NOT NULL REFERENCES incidencias(id) ON DELETE CASCADE,
  estado_anterior estado_enum,
  estado_nuevo    estado_enum NOT NULL,
  cambiado_por    VARCHAR(100) DEFAULT 'admin',
  fecha           TIMESTAMPTZ DEFAULT now()
);
```

## API Design

| Método | Endpoint | Descripción | Rol |
|--------|----------|-------------|-----|
| GET | `/incidencias` | Listar con filtros opcionales (`estado`, `categoria`, `prioridad`) | Todos |
| POST | `/incidencias` | Crear incidencia | Ciudadano |
| GET | `/incidencias/:id` | Detalle de incidencia + historial | Todos |
| PATCH | `/incidencias/:id` | Cambiar estado y/o prioridad | Admin |
| POST | `/incidencias/:id/imagenes` | Subir imagen (multipart/form-data) → guarda fichero en volumen y ruta en BD | Ciudadano |

## Known Risks and Trade-offs

| Riesgo | Mitigación |
|--------|------------|
| Coordenadas inválidas | Validar rangos: lat ∈ [-90,90], lng ∈ [-180,180] |
| Estado inválido en PATCH | Validar contra enum permitido en la capa de servicio |
| Sin autenticación real | Aceptado — práctica universitaria, no producción |
| Volumen local no compartido | Aceptado — single instance; si se dockeriza, montar volumen named |

## Constitution & TDD Rules (Implementation Guidelines)
Para la fase de implementación de este change, todo el código debe regirse por las siguientes reglas estrictas:

### 1. Reglas TDD Estrictas
La implementación **DEBE** seguir el ciclo Test-Driven Development (TDD):
1. **Rojo**: Escribir primero el test en `pytest` para la funcionalidad descrita en la tarea (el test debe fallar inicialmente).
2. **Verde**: Escribir el código mínimo en FastAPI/SQLAlchemy para que el test pase de manera exitosa.
3. **Refactor**: Limpiar el código manteniendo el estado Verde.
> **Importante**: Los tests deben usar un motor de BD en memoria (ej. `sqlite:///:memory:`) o configurar aisladamente el entorno usando `pytest-asyncio` y `TestClient`.

### 2. Estándares Técnicos
- Inyección de dependencias estricta (*Dependency Injection*) mediante `Depends()` de FastAPI.
- Código limpio estructurado en capas (Router → Service → Repository).
- Nomenclatura en español para el modelo de dominio/negocio (ej. clases `Incidencia`, métodos `crear_incidencia()`); convenciones en inglés solo donde el framework lo requiera nativamente.
- Manejo de excepciones centralizado (ej. mapear errores de modelo a `HTTPException` en el router).
