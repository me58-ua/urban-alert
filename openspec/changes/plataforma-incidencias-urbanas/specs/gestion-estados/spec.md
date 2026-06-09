# Spec: gestion-estados

## User Story
Como administrador municipal, quiero poder cambiar el estado y la prioridad de una incidencia, y que el sistema registre un historial de quién y cuándo hizo el cambio, para mantener trazabilidad y control.

## Requirements

### Funcionales
1. **Actualizar estado**: Solo los administradores pueden hacer un `PATCH /incidencias/{id}`.
2. **Historial automático**: Cualquier cambio de estado debe insertar un registro en la tabla `historial_estados`. El cambio de estado en la incidencia no ocurre si la inserción del historial falla (transacción atómica).
3. **Rol Requerido**: El header `X-Role: admin` es obligatorio para este endpoint.

### No Funcionales
1. **Auditoría Básica**: El campo `cambiado_por` puede venir pre-fijado como "admin" o mediante un ID si se proporciona más identidad en Fase 2.

## Technical Details

- **Endpoints**: `PATCH /incidencias/{id}`
- **Middlewares**: `AdminRoleMiddleware` que valida `X-Role`.
- **Transacciones**: Usa una sesión de SQLAlchemy con `session.commit()` solo después de actualizar la incidencia y añadir el log. En caso de error, `session.rollback()`.
- **Relaciones BD**: Modelo `Incidencia` (1 -> N) `HistorialEstado`.

## Open Questions
- En ausencia de un login real, ¿qué hacemos si mandan un `PATCH` sin el rol adecuado? *Respuesta: devolvemos `HTTP 403 Forbidden`.*
