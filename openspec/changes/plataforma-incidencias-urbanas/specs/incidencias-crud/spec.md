# Spec: incidencias-crud

## User Story
Como ciudadano y administrador, quiero poder crear, ver, listar y actualizar incidencias para gestionar eficazmente los reportes de problemas urbanos en la ciudad.

## Requirements

### Funcionales
1. **Crear incidencia**: Endpoint para registrar una incidencia con título, descripción, categoría, prioridad, latitud y longitud.
2. **Listar incidencias**: Endpoint para obtener incidencias con paginación y filtros opcionales (categoría, estado, prioridad).
3. **Ver detalle**: Endpoint para consultar toda la información de una incidencia específica por ID.
4. **Validaciones**: Los campos obligatorios son título, categoría, latitud y longitud. La categoría debe pertenecer a un ENUM predefinido.

### No Funcionales
1. **Rendimiento**: La creación y listado básico debe responder en < 200ms.
2. **Formato**: Toda la comunicación API usa JSON.

## Technical Details

- **Endpoints**:
  - `POST /incidencias`
  - `GET /incidencias`
  - `GET /incidencias/{id}`
- **Modelo de BD**: Tabla `incidencias` en PostgreSQL. Depende de ENUMs `categoria_enum`, `prioridad_enum`, `estado_enum`.
- **Capa Servicio**: Validación de negocio (Enum matching, rangos de coordenadas válidos).
- **Controlador**: Retornar HTTP 201 Created al crear, HTTP 200 OK al listar/ver.

## Open Questions
Ninguna en este punto. El diseño base de CRUD está definido en el MVP.
