# Plataforma de Incidencias Urbanas

![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Pytest](https://img.shields.io/badge/pytest-0A9EDC?style=for-the-badge&logo=pytest&logoColor=white)

API REST backend para una plataforma ciudadana de reporte y gestión de incidencias urbanas. Desarrollada como práctica universitaria aplicando metodologías de **Test-Driven Development (TDD)** y flujos de trabajo basados en especificaciones (OpenSpec).

## 🚀 Características Principales

1. **Gestión de Incidencias (CRUD)**: Creación de reportes categorizados (infraestructura, alumbrado, residuos, etc.) con niveles de prioridad.
2. **Geolocalización Inmersiva**: Búsqueda nativa de incidencias cercanas mediante Latitud, Longitud y un Radio (aplicando la fórmula matemática de *Haversine* desde la base de datos).
3. **Gestión de Estados y Auditoría**: Endpoint securizado (`PATCH`) protegido por rol para que los administradores actualicen el estado de un ticket. Todo cambio queda inmutable en un `historial_estados` automático.
4. **Subida de Imágenes Locales**: endpoints `multipart/form-data` para adjuntar fotos como evidencia física, alojadas de forma persistente y expuestas libremente como archivos estáticos (`/uploads`).
5. **Data para Interfaz de Mapas**: La API está estructurada para que un frontend con Leaflet o Google Maps pueda consumirla directamente.

---

## 🛠️ Stack Tecnológico

- **Framework Web:** [FastAPI](https://fastapi.tiangolo.com/) (Python 3.11+)
- **Base de Datos:** PostgreSQL 15
- **ORM & Migraciones:** SQLAlchemy 2.0 y Alembic
- **Validación de Datos:** Pydantic V2
- **Testing:** Pytest (Suite automatizada con base de datos TDD in-memory con `StaticPool`).

---

## 💻 Inicio Rápido (Setup Local)

### Requisitos Previos
- Docker y Docker Compose (para correr la base de datos).
- Python 3.10 o superior.

### 1. Levantar la Base de Datos
Inicia la instancia de PostgreSQL en segundo plano usando Docker:
```bash
docker compose up -d
```
*(Se creará un usuario `admin` con la contraseña `adminpassword` mapeado al puerto 5432).*

### 2. Configurar Entorno Python
Crea un entorno virtual e instala todas las dependencias:
```bash
# Usuarios Windows:
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 3. Migraciones a la Base de Datos
Sincroniza el código actual de los modelos con la base real en PostgreSQL:
```bash
alembic upgrade head
```

### 4. Lanzar la Aplicación
Arranca el servidor en desarrollo con auto-recarga:
```bash
uvicorn main:app --reload
```
¡La API ya está lista! Puedes acceder a la documentación interactiva en:
👉 **[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)**

---

## 🧪 Pruebas Unitarias (TDD)

El proyecto fue desarrollado utilizando Test-Driven Development. La suite de pruebas está configurada para no manchar tu base de datos de Docker, en lugar de eso inyecta una base paralela (`sqlite:///:memory:`) para ser veloz y segura.

Para correr los tests:
```bash
pytest tests/
```

Deberías ver una salida indicando de cobertura exitosa al 100%:
> `= 6 passed in 0.25s =`

---

## 📜 Endpoints Rápidos (API Reference)

- `GET /ping`: Verifica salud del servidor.
- `POST /incidencias`: Crea una nueva incidencia.
- `GET /incidencias`: Devuelve todas las incidencias (soporta Query Params para filtros por `estado`, `categoria`, `prioridad`, `lat`, `lng`, `radio`).
- `GET /incidencias/{id}`: Trae detalle de la incidencia, junto con lista de imágenes subidas y su historial de estados.
- `PATCH /incidencias/{id}`: (Requiere header `X-Role: admin`) Actualiza estado y/o prioridad del ticket.
- `POST /incidencias/{id}/imagenes`: Sube un archivo `multipart` (.png, .jpg) al servidor.
