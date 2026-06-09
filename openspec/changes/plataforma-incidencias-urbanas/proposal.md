# Proposal: Plataforma de Incidencias Urbanas

## Why

Los ciudadanos carecen de un canal digital unificado para reportar incidencias urbanas (baches, alumbrado defectuoso, basura, etc.), lo que provoca una gestión municipal reactiva, ineficiente y poco transparente. Las administraciones públicas no tienen visibilidad geolocalizada en tiempo real de los problemas urbanos, lo que alarga los tiempos de resolución y reduce la satisfacción ciudadana.

Esta plataforma resuelve ese problema proporcionando un canal estructurado de reporte, seguimiento y gestión de incidencias, con geolocalización, categorización y priorización automática/manual.

## What Changes

Se crea desde cero una plataforma web/mobile REST con las siguientes capacidades principales:

- **Reporte de incidencias**: ciudadanos pueden crear incidencias con foto, ubicación GPS, categoría, descripción y prioridad.
- **Visualización y filtrado**: listado e integración con mapa (Google Maps / OpenStreetMap) con filtros por estado, categoría y prioridad.
- **Gestión de incidencias**: administradores municipales pueden cambiar el estado (abierta → en progreso → resuelta / rechazada) y gestionar prioridades.
- **Seguimiento**: cualquier usuario puede ver el detalle de una incidencia e historial de cambios de estado.
- **API REST**: endpoints para crear, consultar y actualizar incidencias, con soporte de filtros geográficos.

No se afectan sistemas externos existentes. Se integra con servicio de mapas (Google Maps / OSM) y almacenamiento de imágenes (S3 o compatible).

## Impacted Capabilities

- **incidencias-crud** – Operaciones CRUD completas sobre incidencias (crear, listar, actualizar estado/prioridad, ver detalle).
- **geolocalizacion** – Soporte de ubicación geográfica en creación y filtrado geográfico por radio lat/lng.
- **gestion-estados** – Cambio de estado de incidencias restringido a administradores municipales, con historial.
- **visualizacion-mapa** – Visualización de incidencias geolocalizadas sobre mapa interactivo con filtros.
- **subida-imagenes** – Subida y almacenamiento optimizado de imágenes asociadas a cada incidencia.

## Impact

| Área | Impacto |
|------|---------|
| Participación ciudadana | Incremento de reportes por disponer de canal digital accesible |
| Eficiencia municipal | Reducción del tiempo medio de resolución (objetivo: ↓30%) |
| Visibilidad | % incidencias geolocalizadas → trazabilidad total |
| SLA | Tiempo de respuesta inicial < 24h por prioridad |

**Riesgos principales:** baja adopción inicial (mitigación: UX simple), datos incorrectos (mitigación: validación de inputs y moderación), sobrecarga municipal (mitigación: priorización automática por categoría/volumen).
