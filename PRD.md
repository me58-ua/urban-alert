# 📄 PRD – Plataforma de Incidencias Urbanas

## 1. 📌 Visión del Producto
Crear una plataforma digital (web/mobile) que permita a ciudadanos reportar incidencias urbanas (baches, alumbrado defectuoso, basura, etc.) mediante fotos, ubicación geográfica y categorización, facilitando a las administraciones públicas la gestión eficiente y priorización de soluciones.

---

## 2. 🎯 Objetivos del Producto

| Objetivo | Métrica de éxito |
|----------|-----------------|
| Incrementar participación ciudadana | # reportes/mes |
| Reducir tiempo de resolución | Tiempo medio de cierre |
| Mejorar visibilidad de incidencias | % incidencias geolocalizadas |
| Optimizar gestión municipal | SLA por prioridad |

---

## 3. 👥 Usuarios / Actores

- **Ciudadano**
  - Reporta incidencias
  - Consulta estado
- **Administrador Municipal**
  - Gestiona incidencias
  - Cambia estados
  - Prioriza resolución
- **Sistema**
  - Procesa geolocalización
  - Notifica cambios

---

## 4. 🧩 Alcance Funcional (MVP)

### 4.1 Reporte de Incidencias
- Crear incidencia con:
  - Foto(s)
  - Ubicación (GPS / mapa)
  - Categoría
  - Descripción
  - Prioridad (opcional o automática)

### 4.2 Visualización
- Listado general de incidencias
- Visualización en mapa
- Filtros por:
  - Estado
  - Categoría
  - Prioridad

### 4.3 Gestión de Incidencias
- Cambio de estado:
  - Abierta
  - En progreso
  - Resuelta
  - Rechazada

### 4.4 Seguimiento
- Ver detalle de incidencia
- Historial de cambios

---

## 5. 🔌 API Endpoints

### GET /incidencias
Obtiene listado de incidencias

**Query params:**
- categoria
- prioridad
- estado
- lat, lng, radio (filtro geográfico)

---

### POST /incidencias
Crea nueva incidencia

**Body:**
```json
{
  "titulo": "Bache en calle principal",
  "descripcion": "Bache grande peligroso",
  "categoria": "infraestructura",
  "prioridad": "media",
  "ubicacion": {
    "lat": 38.477,
    "lng": -0.791
  },
  "imagenes": ["url1", "url2"]
}
```

### PATCH /incidencias/:id

Actualiza estado o atributos

Body:
```json
{
  "estado": "en_progreso",
  "prioridad": "alta"
}
```
## 6. 🗂️ Modelo de Datos (Simplificado)

Campo	Tipo	Descripción
id	UUID	Identificador
titulo	string	Título corto
descripcion	text	Detalle
categoria	enum	Tipo de incidencia
prioridad	enum	baja/media/alta
estado	enum	abierta/en_progreso/resuelta
ubicacion	geo	lat/lng
imagenes	array	URLs
fecha_creacion	datetime	Timestamp
fecha_actualizacion	datetime	Timestamp

## 7. ⚙️ Reglas de Negocio
Una incidencia debe tener ubicación obligatoria
Prioridad puede ser:
Manual (admin)
Automática (por categoría o volumen)
Solo admins pueden cambiar estado
Ciudadanos pueden crear y visualizar

## 8. 🚧 Restricciones No Funcionales
Soporte geolocalización en tiempo real
Escalabilidad para miles de incidencias
Subida de imágenes optimizada
Seguridad:
Validación inputs
Autenticación (futuro)

## 9. 🔗 Dependencias
API de mapas (Google Maps / OpenStreetMap)
Servicio de almacenamiento de imágenes (S3 o similar)
Backend REST

## 10. 📊 Métricas Clave
Métrica	Objetivo
Tiempo medio resolución	↓ 30%
Reportes por usuario	↑ engagement
% incidencias resueltas	> 70%
Tiempo respuesta inicial	< 24h

## 11. ⚠️ Riesgos Identificados
Baja adopción inicial → mitigación: UX simple
Datos incorrectos → validación y moderación
Sobrecarga municipal → priorización automática

## 12. 🧭 Roadmap Inicial
Fase	Entregables
MVP	Reporte + listado + gestión básica
Fase 2	Notificaciones + login
Fase 3	IA para priorización
Fase 4	Analytics y dashboard

## 13. ✅ Checklist de Calidad (Scrum)
✔ Historias futuras deberán cumplir INVEST
✔ Evitar backlog como lista estática
✔ Enfocar en entrega de valor continuo

🔚 Conclusión

Este PRD define un producto centrado en valor ciudadano y eficiencia operativa, listo para ser transformado en:
➡️ Historias de usuario
➡️ Backlog priorizado
➡️ Tickets técnicos


