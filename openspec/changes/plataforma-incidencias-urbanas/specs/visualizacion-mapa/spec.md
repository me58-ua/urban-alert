# Spec: visualizacion-mapa

## User Story
Como ciudadano o administrador, quiero visualizar las incidencias en un mapa interactivo para poder identificar rápidamente los problemas y su distribución geográfica en la ciudad.

## Requirements

### Funcionales
1. **Endpoint de datos**: Los clientes consumen `GET /incidencias` con filtros para poblar el mapa.
2. **Estructura Geo-compatible**: La API debe entregar datos fácilmente parseables por librerías de mapas (lat, lng separados) para Leaflet / OpenLayers.

### No Funcionales
1. **Rendimiento**: Si hay más de 1000 incidencias en el viewport, es recomendable permitir límites (`limit`, `offset`) u ofrecer paginación básica, aunque el agrupamiento visual se asume como responsabilidad del frontend.

## Technical Details

- **Integración API-Frontend**: Este backend (`GET /incidencias`) devuelve un JSON con un array. Ejemplo:
```json
[
  {
    "id": 1,
    "titulo": "Bache en calle",
    "latitud": 38.477,
    "longitud": -0.791,
    "estado": "abierta",
    "prioridad": "alta",
    "categoria": "infraestructura"
  }
]
```
- **Nota técnica**: El backend no sirve HTML/JS de los mapas, es 100% puro REST en FastAPI. La visualización en el frontend es consumidora de esta capability.

## Open Questions
- ¿Formatos estándares como GeoJSON? *Acuerdo en MVP: el JSON planto actual es suficiente; el frontend reconstruirá los markers.*
