from pydantic import BaseModel, Field, ConfigDict, conlist
from typing import Optional, List
from datetime import datetime
from models import CategoriaEnum, PrioridadEnum, EstadoEnum, RolEnum

class ImagenResponse(BaseModel):
    id: int
    ruta: str
    fecha_subida: datetime

    model_config = ConfigDict(from_attributes=True)

class HistorialResponse(BaseModel):
    id: int
    estado_anterior: Optional[EstadoEnum]
    estado_nuevo: EstadoEnum
    prioridad_anterior: Optional[PrioridadEnum] = None
    prioridad_nueva: Optional[PrioridadEnum] = None
    cambiado_por: str
    fecha: datetime

    model_config = ConfigDict(from_attributes=True)

class IncidenciaCreate(BaseModel):
    titulo: str = Field(..., min_length=3, max_length=200)
    descripcion: Optional[str] = None
    categoria: CategoriaEnum
    prioridad: PrioridadEnum = PrioridadEnum.media
    latitud: float = Field(..., ge=-90, le=90)
    longitud: float = Field(..., ge=-180, le=180)

class EstadoUpdate(BaseModel):
    estado: Optional[EstadoEnum] = None
    prioridad: Optional[PrioridadEnum] = None

class IncidenciaResponse(BaseModel):
    id: int
    titulo: str
    descripcion: Optional[str]
    categoria: CategoriaEnum
    prioridad: PrioridadEnum
    estado: EstadoEnum
    latitud: float
    longitud: float
    fecha_creacion: datetime
    fecha_actualizacion: datetime
    imagenes: List[ImagenResponse] = []
    historial: List[HistorialResponse] = []

    model_config = ConfigDict(from_attributes=True)

class IncidenciaPage(BaseModel):
    """Respuesta paginada del listado de incidencias."""
    items: List[IncidenciaResponse]
    total: int
    limit: int
    offset: int

    model_config = ConfigDict(from_attributes=True)

# ── Autenticación ────────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)

class UserResponse(BaseModel):
    id: int
    email: str
    rol: RolEnum

    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

# ── Notificaciones ───────────────────────────────────────────────────────────
class NotificacionResponse(BaseModel):
    id: int
    incidencia_id: int
    mensaje: str
    estado_nuevo: EstadoEnum
    leida: bool
    fecha_creacion: datetime

    model_config = ConfigDict(from_attributes=True)
