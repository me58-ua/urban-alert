# Spec: geolocalizacion

## User Story
Como ciudadano, al reportar una incidencia quiero poder añadir mi ubicación exacta mediante latitud y longitud, y como usuario consultar incidencias filtradas por cercanía a un punto.

## Requirements

### Funcionales
1. **Guardar ubicación**: Al crear una incidencia (`POST /incidencias`) se debe enviar la latitud y longitud. Es requerido.
2. **Filtrar por proximidad**: El endpoint `GET /incidencias` soporta los query parameters `lat`, `lng` y `radio` (metros). Retorna incidencias dentro de ese radio usando la fórmula matemática de Haversine o similar para calcular distancia entre puntos.
3. **Validación de coordenadas**: Latitud entre -90 y 90. Longitud entre -180 y 180.

### No Funcionales
1. **Tipos de datos**: Almacenados en base de datos como formato `DOUBLE PRECISION` o `FLOAT`.
2. **Precisión**: Soporte de al menos 6 decimales para precisión métrica.

## Technical Details

- **BD**: Columnas `latitud` y `longitud` en la tabla `incidencias`.
- **Query / Filter**: En SQLAlchemy, implementar una función o filtro personalizado usando fórmulas matemáticas sql básicas si es posible (ej. Haversine proxy con suma de cuadrados o módulo Postgres `earthdistance` / `cube` si está habilitado por defecto, sino cálculo post-fetch o math puro).
- **Validadores FastAPI**: Pydantic `pydantic.confloat(ge=-90, le=90)` para latitud, etc.

## Open Questions
- ¿Cálculo de distancias directamente en SQL (Haversine manual o módulos adicionales) o en memoria (Python)? *Acordado en diseño: preferible en SQL con fórmula simple por eficiencia básica.*
