from sqlalchemy import Column, Integer, String, Text, Float, Enum as SQLEnum, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from database import Base

class CategoriaEnum(str, enum.Enum):
    infraestructura = 'infraestructura'
    alumbrado = 'alumbrado'
    residuos = 'residuos'
    trafico = 'trafico'
    zonas_verdes = 'zonas_verdes'
    otro = 'otro'

class PrioridadEnum(str, enum.Enum):
    baja = 'baja'
    media = 'media'
    alta = 'alta'

class EstadoEnum(str, enum.Enum):
    abierta = 'abierta'
    en_progreso = 'en_progreso'
    resuelta = 'resuelta'
    rechazada = 'rechazada'

class RolEnum(str, enum.Enum):
    ciudadano = 'ciudadano'
    admin = 'admin'

class Incidencia(Base):
    __tablename__ = "incidencias"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String(200), nullable=False)
    descripcion = Column(Text, nullable=True)
    categoria = Column(SQLEnum(CategoriaEnum), nullable=False)
    prioridad = Column(SQLEnum(PrioridadEnum), default=PrioridadEnum.media, nullable=False)
    estado = Column(SQLEnum(EstadoEnum), default=EstadoEnum.abierta, nullable=False)
    latitud = Column(Float, nullable=False)
    longitud = Column(Float, nullable=False)

    # Autor de la incidencia (issue #33). NULLABLE: se permiten incidencias
    # anónimas (POST sin JWT). ON DELETE SET NULL: si se borra el usuario, la
    # incidencia se conserva pero queda sin autor.
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    # Equipo asignado a la incidencia (issue #36). NULLABLE: una incidencia
    # puede no tener equipo. ON DELETE SET NULL: si se borra el equipo, la
    # incidencia se conserva pero queda sin equipo. Un equipo solo puede
    # asignarse a incidencias de su MISMA categoria (validado en el servicio).
    equipo_id = Column(Integer, ForeignKey("equipos.id", ondelete="SET NULL"), nullable=True, index=True)

    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())
    fecha_actualizacion = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    autor = relationship("User", back_populates="incidencias")
    equipo = relationship("Equipo")
    imagenes = relationship("Imagen", back_populates="incidencia", cascade="all, delete-orphan")
    historial = relationship("HistorialEstado", back_populates="incidencia", cascade="all, delete-orphan")
    notificaciones = relationship("Notificacion", back_populates="incidencia", cascade="all, delete-orphan")

class Imagen(Base):
    __tablename__ = "imagenes"

    id = Column(Integer, primary_key=True, index=True)
    incidencia_id = Column(Integer, ForeignKey("incidencias.id", ondelete="CASCADE"), nullable=False)
    ruta = Column(String, nullable=False)
    fecha_subida = Column(DateTime(timezone=True), server_default=func.now())

    incidencia = relationship("Incidencia", back_populates="imagenes")

class HistorialEstado(Base):
    __tablename__ = "historial_estados"

    id = Column(Integer, primary_key=True, index=True)
    incidencia_id = Column(Integer, ForeignKey("incidencias.id", ondelete="CASCADE"), nullable=False)
    estado_anterior = Column(SQLEnum(EstadoEnum), nullable=True)
    estado_nuevo = Column(SQLEnum(EstadoEnum), nullable=False)
    prioridad_anterior = Column(SQLEnum(PrioridadEnum), nullable=True)
    prioridad_nueva = Column(SQLEnum(PrioridadEnum), nullable=True)
    cambiado_por = Column(String(100), default='admin')
    fecha = Column(DateTime(timezone=True), server_default=func.now())

    incidencia = relationship("Incidencia", back_populates="historial")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    rol = Column(SQLEnum(RolEnum), default=RolEnum.ciudadano, nullable=False)
    # Estado del usuario (issue #34). Un usuario inactivo no puede hacer login.
    # server_default="true" para que las filas existentes queden activas tras la
    # migración.
    activo = Column(Boolean, nullable=False, default=True, server_default="true")
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())

    incidencias = relationship("Incidencia", back_populates="autor")

class Equipo(Base):
    """Equipo operativo (issue #35). Su `categoria` reutiliza el CategoriaEnum
    del backend (las 6 categorías existentes). Solo lo gestiona un admin."""
    __tablename__ = "equipos"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(120), nullable=False)
    categoria = Column(SQLEnum(CategoriaEnum), nullable=False)

    trabajadores = relationship("Trabajador", back_populates="equipo")

class Trabajador(Base):
    """Trabajador asignable a un equipo (issue #35). Al borrar un equipo, sus
    trabajadores quedan con `equipo_id = NULL` (ON DELETE SET NULL): NO se
    borran."""
    __tablename__ = "trabajadores"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(120), nullable=False)
    puesto = Column(String(120), nullable=True)
    disponible = Column(Boolean, nullable=False, default=True)
    equipo_id = Column(Integer, ForeignKey("equipos.id", ondelete="SET NULL"), nullable=True, index=True)

    equipo = relationship("Equipo", back_populates="trabajadores")

class Notificacion(Base):
    __tablename__ = "notificaciones"

    id = Column(Integer, primary_key=True, index=True)
    incidencia_id = Column(Integer, ForeignKey("incidencias.id", ondelete="CASCADE"), nullable=False)
    mensaje = Column(String(255), nullable=False)
    estado_nuevo = Column(SQLEnum(EstadoEnum), nullable=False)
    leida = Column(Boolean, default=False, nullable=False)
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())

    incidencia = relationship("Incidencia", back_populates="notificaciones")
