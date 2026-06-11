# syntax=docker/dockerfile:1

# Imagen del backend FastAPI de Urban Alert.
# Construcción (desde backend/):  docker build -t naoufalcharafat/urban-alert:backend .
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    STORAGE_BACKEND=local \
    UPLOAD_DIR=/app/uploads

WORKDIR /app

# Dependencias primero (capa cacheada). psycopg2-binary trae sus wheels:
# no hacen falta libpq ni compiladores en la imagen.
COPY requirements.txt ./
RUN pip install -r requirements.txt

# Código de la aplicación.
COPY . .

# Usuario no-root + directorio de subidas (se monta como volumen para persistir).
RUN useradd --create-home --uid 1000 appuser \
    && mkdir -p /app/uploads \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# Arranque: migraciones Alembic -> admin inicial (best-effort, solo si hay
# BOOTSTRAP_ADMIN_*) -> servidor ASGI. `exec` deja a uvicorn como PID 1.
CMD ["sh", "-c", "alembic upgrade head && (python scripts/crear_admin.py || true) && exec uvicorn main:app --host 0.0.0.0 --port 8000"]
