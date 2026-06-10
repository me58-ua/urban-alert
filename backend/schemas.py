from pydantic import BaseModel, Field, ConfigDict, conlist, field_validator
from typing import Optional, List, Dict
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

# Lista básica de moderación (ampliable). Si un texto contiene alguno de estos
# términos se rechaza la incidencia (issue #10).
PALABRAS_PROHIBIDAS = {"spam", "xxx"}

class IncidenciaCreate(BaseModel):
    titulo: str = Field(..., min_length=3, max_length=200)
    descripcion: Optional[str] = None
    categoria: CategoriaEnum
    prioridad: PrioridadEnum = PrioridadEnum.media
    latitud: float = Field(..., ge=-90, le=90)
    longitud: float = Field(..., ge=-180, le=180)

    @field_validator("titulo", "descripcion", mode="before")
    @classmethod
    def _sanitizar_y_moderar(cls, v):
        # Sanitiza (recorta espacios) ANTES de aplicar min/max_length y aplica
        # una moderación básica de contenido.
        if isinstance(v, str):
            v = v.strip()
            if any(p in v.lower() for p in PALABRAS_PROHIBIDAS):
                raise ValueError("El texto contiene términos no permitidos")
        return v

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
    user_id: Optional[int] = None
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
    activo: bool = True

    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class RolUpdate(BaseModel):
    rol: RolEnum

class UsuarioAdminCreate(BaseModel):
    """Alta de usuario por un admin: permite elegir el rol (issue #34)."""
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)
    rol: RolEnum = RolEnum.ciudadano

class UserUpdate(BaseModel):
    """Edición de datos de un usuario por un admin (issue #34)."""
    email: Optional[str] = Field(default=None, min_length=3, max_length=255)

class EstadoUsuarioUpdate(BaseModel):
    """Activar/desactivar un usuario (issue #34)."""
    activo: bool

class UsuariosPage(BaseModel):
    """Respuesta paginada del listado de usuarios (admin)."""
    items: List[UserResponse]
    total: int
    limit: int
    offset: int

    model_config = ConfigDict(from_attributes=True)

# ── Notificaciones ───────────────────────────────────────────────────────────
class NotificacionResponse(BaseModel):
    id: int
    incidencia_id: int
    mensaje: str
    estado_nuevo: EstadoEnum
    leida: bool
    fecha_creacion: datetime

    model_config = ConfigDict(from_attributes=True)

# ── Equipos y trabajadores (issue #35, solo admin) ───────────────────────────
class TrabajadorCreate(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=120)
    puesto: Optional[str] = Field(default=None, max_length=120)
    disponible: bool = True

class TrabajadorUpdate(BaseModel):
    nombre: Optional[str] = Field(default=None, min_length=1, max_length=120)
    puesto: Optional[str] = Field(default=None, max_length=120)
    disponible: Optional[bool] = None

class TrabajadorResponse(BaseModel):
    id: int
    nombre: str
    puesto: Optional[str] = None
    disponible: bool
    equipo_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

class EquipoCreate(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=120)
    categoria: CategoriaEnum

class EquipoUpdate(BaseModel):
    nombre: Optional[str] = Field(default=None, min_length=1, max_length=120)
    categoria: Optional[CategoriaEnum] = None

class EquipoResponse(BaseModel):
    id: int
    nombre: str
    categoria: CategoriaEnum
    trabajadores: List[TrabajadorResponse] = []

    model_config = ConfigDict(from_attributes=True)

# ── Métricas / Estadísticas ──────────────────────────────────────────────────
class EstadisticasResponse(BaseModel):
    total: int
    por_estado: Dict[str, int]
    por_categoria: Dict[str, int]
    por_prioridad: Dict[str, int]
    porcentaje_resueltas: float
    tiempo_medio_resolucion_horas: Optional[float] = None
    reportes_ultimos_7_dias: int
    reportes_ultimos_30_dias: int
