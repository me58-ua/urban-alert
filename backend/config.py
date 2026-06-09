"""Configuración centralizada por entorno (issue #12).

Carga valores desde variables de entorno y/o un fichero `.env` (no versionado).
Evita credenciales/secretos hardcodeados repartidos por el código.
"""
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)

    # Base de datos. Por defecto apunta al contenedor del proyecto (puerto 5433).
    # Sobreescribir con la variable de entorno DATABASE_URL.
    database_url: str = "postgresql+psycopg2://admin:adminpassword@localhost:5433/incidencias_db"

    # Seguridad / JWT. En producción DEFINIR SECRET_KEY por entorno.
    secret_key: str = "dev-secret-change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # CORS: orígenes permitidos separados por comas (None => valores por defecto de dev).
    allowed_origins: Optional[str] = None

    # Subida de imágenes: tamaño máximo en bytes.
    max_imagen_bytes: int = 5 * 1024 * 1024

    # Almacenamiento de imágenes (issue #8): "local" | "s3".
    storage_backend: str = "local"
    # 'local': directorio (montable como volumen para persistir).
    upload_dir: str = "uploads"
    # 's3' (S3-compatible). Requiere boto3.
    s3_bucket: Optional[str] = None
    s3_region: Optional[str] = None
    s3_endpoint_url: Optional[str] = None
    s3_public_base_url: Optional[str] = None
    s3_access_key: Optional[str] = None
    s3_secret_key: Optional[str] = None


settings = Settings()
