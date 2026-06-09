"""Abstracción de almacenamiento de imágenes (issue #8).

Permite elegir el backend con la variable ``STORAGE_BACKEND``:
- ``local`` (por defecto): guarda en un directorio (montable como volumen para
  persistir entre recreados del contenedor). Se sirve en ``/uploads``.
- ``s3``: guarda en un bucket S3-compatible (requiere ``boto3``).

Todas las implementaciones devuelven la **ruta/URL pública** de la imagen.
"""
import os
import uuid

from config import settings


class StorageError(Exception):
    """Error de configuración o de operación del almacenamiento."""


class Storage:
    def guardar(self, contenido: bytes, extension: str) -> str:
        """Guarda los bytes con la extensión dada y devuelve la ruta/URL pública."""
        raise NotImplementedError


class LocalStorage(Storage):
    """Guarda en el sistema de archivos local (directorio configurable)."""

    def __init__(self, directorio: str):
        self.directorio = directorio
        os.makedirs(self.directorio, exist_ok=True)

    def guardar(self, contenido: bytes, extension: str) -> str:
        nombre = f"{uuid.uuid4()}.{extension}"
        ruta_fs = os.path.join(self.directorio, nombre)
        with open(ruta_fs, "wb") as f:
            f.write(contenido)
        return f"/uploads/{nombre}"


class S3Storage(Storage):
    """Guarda en un bucket S3-compatible (AWS S3, MinIO, etc.)."""

    def __init__(self, bucket, region=None, endpoint_url=None,
                 public_base_url=None, access_key=None, secret_key=None):
        try:
            import boto3
        except ImportError as exc:  # pragma: no cover - depende del entorno
            raise StorageError("El backend de almacenamiento 's3' requiere boto3 (pip install boto3)") from exc
        self.bucket = bucket
        self.public_base_url = public_base_url
        self.client = boto3.client(
            "s3",
            region_name=region,
            endpoint_url=endpoint_url,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
        )

    def guardar(self, contenido: bytes, extension: str) -> str:
        nombre = f"{uuid.uuid4()}.{extension}"
        content_type = "image/png" if extension == "png" else "image/jpeg"
        self.client.put_object(Bucket=self.bucket, Key=nombre, Body=contenido, ContentType=content_type)
        if self.public_base_url:
            return f"{self.public_base_url.rstrip('/')}/{nombre}"
        return f"/{self.bucket}/{nombre}"


def get_storage() -> Storage:
    """Crea el backend de almacenamiento según la configuración."""
    if settings.storage_backend == "s3":
        if not settings.s3_bucket:
            raise StorageError("STORAGE_BACKEND=s3 requiere definir S3_BUCKET")
        return S3Storage(
            bucket=settings.s3_bucket,
            region=settings.s3_region,
            endpoint_url=settings.s3_endpoint_url,
            public_base_url=settings.s3_public_base_url,
            access_key=settings.s3_access_key,
            secret_key=settings.s3_secret_key,
        )
    return LocalStorage(settings.upload_dir)
