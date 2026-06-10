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

    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())
    fecha_actualizacion = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    autor = relationship("User", back_populates="incidencias")
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
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())

    incidencias = relationship("Incidencia", back_populates="autor")

class Notificacion(Base):
    __tablename__ = "notificaciones"

    id = Column(Integer, primary_key=True, index=True)
    incidencia_id = Column(Integer, ForeignKey("incidencias.id", ondelete="CASCADE"), nullable=False)
    mensaje = Column(String(255), nullable=False)
    estado_nuevo = Column(SQLEnum(EstadoEnum), nullable=False)
    leida = Column(Boolean, default=False, nullable=False)
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())

    incidencia = relationship("Incidencia", back_populates="notificaciones")
