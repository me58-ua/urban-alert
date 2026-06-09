# Spec: subida-imagenes

## User Story
Como ciudadano, al reportar una incidencia quiero adjuntar imágenes como evidencia visual del problema, para que las autoridades puedan evaluarlo más fácilmente. 

## Requirements

### Funcionales
1. **Subir imagen**: Endpoint `POST /incidencias/{id}/imagenes` que acepte una carga de tipo `multipart/form-data`.
2. **Almacenamiento Local**: La API debe guardar el archivo en disco (volumen local) en un directorio `uploads/` y registrar la ruta relativa en la base de datos (tabla `imagenes`).
3. **Validación de ID**: El ID de la incidencia debe existir. Si no existe, devolver `404 Not Found`.

### No Funcionales
1. **Tamaño máximo**: Limitar archivos a 5MB por imagen.
2. **Tipos permitidos**: Solo `image/jpeg`, `image/png`, `image/webp`. 
3. **Límite por incidencia**: Máximo 3 imágenes por incidencia.
4. **Nomenclatura**: Renombrar archivos con UUIDs o sumas de control (`uuid.uuid4().hex + ext`) para evitar colisiones de nombre, guardando de forma segura.

## Technical Details

- **FastAPI Endpoint**: `UploadFile` class de FastAPI. Valida el content_type y el tamaño leyendo los chunks (o headers).
- **Modelo de BD**: Tabla `imagenes` en PostgreSQL con `ruta` (ej. `uploads/abcd-1234.jpg`) y relación a `incidencia_id`.
- **Acceso público**: Se debe montar una ruta estática en FastAPI (`app.mount("/uploads", StaticFiles(directory="uploads"))`) para que las apps frontend puedan cargar las imágenes mediante la URL.

## Open Questions
- Si una incidencia se borra en cascada (`ON DELETE CASCADE`), ¿las imágenes (ficheros físicos) quedan huérfanos en disco o se implementa un hook en la BD/capa de servicio para vaciarlas? *Decisión MVP: No es prioritario gestionar disco; si hay tiempo, un hook básico en SQLAlchemy o tarea cron.*
