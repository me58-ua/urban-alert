# Tasks: Plataforma de Incidencias Urbanas

## 1. Setup inicial y Base de Datos (PostgreSQL + FastAPI)
- [ ] Inicializar proyecto Python (virtualenv) y requerimientos (`fastapi`, `uvicorn`, `sqlalchemy`, `alembic`, `psycopg2-binary`, `pydantic`).
- [ ] Configurar conexión a PostgreSQL usando variables de entorno o `config.py`.
- [ ] Inicializar Alembic para migraciones (`alembic init alembic`).
- [ ] Definir el base model de SQLAlchemy (`Base = declarative_base()`).
- [ ] Crear el script principal de FastAPI (`main.py`) con un endpoint `/ping` de prueba.

## 2. Modelos de Datos (SQLAlchemy)
- [ ] Crear ENUMs nativos en SQLAlchemy (`CategoriaEnum`, `PrioridadEnum`, `EstadoEnum`).
- [ ] Crear modelo `Incidencia` (id, titulo, descripcion, categoria, prioridad, estado, latitud, longitud, timestamps).
- [ ] Crear modelo `Imagen` (id, incidencia_id, ruta, timestamps).
- [ ] Crear modelo `HistorialEstado` (id, incidencia_id, estado_anterior, estado_nuevo, cambiado_por, timestamps).
- [ ] Generar la primera migración de Alembic y aplicarla a la base de datos local.

## 3. Schemas de Pydantic (Validación)
- [ ] Crear schemas de entrada (`IncidenciaCreate`, `EstadoUpdate`) con validaciones (ej. latitud entre -90 y 90, longitud -180 y 180).
- [ ] Crear schemas de salida (`IncidenciaResponse`, `ImagenResponse`, `HistorialResponse`).

## 4. Capability: Incidencias CRUD & Geolocalización (TDD)
- [ ] **Test**: Escribir tests en `pytest` para `POST /incidencias` (validación de campos y creación exitosa).
- [ ] **Implementar**: Endpoint `POST /incidencias` y servicio asociado hasta que el test pase (Verde).
- [ ] **Test**: Escribir tests para `GET /incidencias/{id}` (incidencia existente e inexistente).
- [ ] **Implementar**: Endpoint `GET /incidencias/{id}` hasta que el test pase (Verde).
- [ ] **Test**: Escribir tests para `GET /incidencias` (listado con paginación y filtros básicos).
- [ ] **Implementar**: Endpoint `GET /incidencias` con filtros (`estado`, `categoria`, `prioridad`) hasta pasar el test (Verde).
- [ ] **Test**: Escribir tests para filtro geográfico (`lat`, `lng`, `radio`).
- [ ] **Implementar**: Añadir lógica de proximidad (Haversine en SQL/SQLAlchemy) al `GET /incidencias` hasta que pase el test (Verde).
- [ ] **Refactor**: Revisar código de CRUD y limpieza.

## 5. Capability: Gestión de Estados (TDD)
- [ ] **Dependencies**: Crear dependencia `get_admin_role` para validar el header `X-Role: admin`.
- [ ] **Test**: Escribir tests para `PATCH /incidencias/{id}` probando acceso denegado (sin rol) y éxito (con rol).
- [ ] **Test**: Escribir test comprobando que el historial se guarda al cambiar estado.
- [ ] **Implementar**: Endpoint `PATCH /incidencias/{id}` mediante transacción atómica (actualizar `estado` + insertar en `historial_estados`) hasta pasar tests (Verde).

## 6. Capability: Subida de Imágenes (TDD)
- [ ] **Test**: Escribir tests simulando subida de archivo (multipart) a `POST /incidencias/{id}/imagenes`.
- [ ] **Test**: Testear validación de MIME types (rechazar PDF) y límites de tamaño si es posible mockear.
- [ ] **Implementar**: Endpoint con `UploadFile` validando tipo y guardando en disco local (`uploads/`).
- [ ] **Implementar**: Guardar registro en la tabla `imagenes` y montar carpeta de estáticos en FastAPI.
- [ ] **Refactor**: Extraer lógica de manejo de ficheros a un servicio independiente.

## 7. Refactoreo y Documentación final
- [ ] Asegurar que `/docs` de FastAPI carga correctamente con toda la metadata (Tags, descripciones).
- [ ] Correr suite de `pytest` completa y verificar 100% verde.
- [ ] Revisión final del código según reglas establecidas en constitution.
