from typing import Optional

from sqlalchemy.orm import Session
from models import Incidencia, HistorialEstado, EstadoEnum
from schemas import IncidenciaCreate
import services.notificaciones as notificaciones_service
from config import settings

def crear_incidencia(
    db: Session, incidencia_in: IncidenciaCreate, user_id: Optional[int] = None
) -> Incidencia:
    """Crea una incidencia. ``user_id`` es el autor (issue #33); puede ser None
    para incidencias anónimas (POST sin JWT)."""
    db_incidencia = Incidencia(
        titulo=incidencia_in.titulo,
        descripcion=incidencia_in.descripcion,
        categoria=incidencia_in.categoria,
        prioridad=incidencia_in.prioridad,
        latitud=incidencia_in.latitud,
        longitud=incidencia_in.longitud,
        estado=EstadoEnum.abierta,
        user_id=user_id,
    )
    db.add(db_incidencia)
    db.commit()
    db.refresh(db_incidencia)
    return db_incidencia

def get_incidencia(db: Session, incidencia_id: int) -> Incidencia:
    from fastapi import HTTPException
    incidencia = db.query(Incidencia).filter(Incidencia.id == incidencia_id).first()
    if not incidencia:
        raise HTTPException(status_code=404, detail="Incidencia no encontrada")
    return incidencia

def listar_incidencias(
    db: Session,
    estado: str = None,
    categoria: str = None,
    prioridad: str = None,
    lat: float = None,
    lng: float = None,
    radio: float = None,
    limit: int = 20,
    offset: int = 0,
):
    """Lista incidencias con filtros y paginación.

    Devuelve una tupla ``(items, total)`` donde ``total`` es el número de
    incidencias que cumplen los filtros (antes de aplicar limit/offset).
    """
    query = db.query(Incidencia)
    if estado:
        query = query.filter(Incidencia.estado == estado)
    if categoria:
        query = query.filter(Incidencia.categoria == categoria)
    if prioridad:
        query = query.filter(Incidencia.prioridad == prioridad)

    query = query.order_by(Incidencia.id)

    geo = lat is not None and lng is not None and radio is not None
    if geo:
        import math

        # Pre-filtro en SQL mediante un "bounding box" (caja de lat/lng) para NO
        # cargar toda la tabla: la BD solo devuelve las incidencias dentro de la
        # caja, aprovechable por índices. (issue #5)
        lat_delta = radio / 111_320.0  # ~metros por grado de latitud
        cos_lat = math.cos(math.radians(lat))
        lng_delta = radio / (111_320.0 * cos_lat) if abs(cos_lat) > 1e-12 else 180.0
        query = query.filter(
            Incidencia.latitud.between(lat - lat_delta, lat + lat_delta),
            Incidencia.longitud.between(lng - lng_delta, lng + lng_delta),
        )

        def haversine(lat1, lon1, lat2, lon2):
            R = 6371000  # radio de la Tierra en metros
            phi1 = math.radians(lat1)
            phi2 = math.radians(lat2)
            delta_phi = math.radians(lat2 - lat1)
            delta_lambda = math.radians(lon2 - lon1)
            a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
            return R * c

        # Refinamiento exacto (círculo Haversine) sobre los candidatos de la caja.
        resultados = [
            inc for inc in query.all()
            if haversine(lat, lng, inc.latitud, inc.longitud) <= radio
        ]
        total = len(resultados)
        items = resultados[offset:offset + limit]
    else:
        total = query.count()
        items = query.offset(offset).limit(limit).all()

    return items, total

def listar_incidencias_de_usuario(db: Session, user_id: int, limit: int = 20, offset: int = 0):
    """Lista, paginadas, SOLO las incidencias cuyo autor es ``user_id`` (issue #33).

    Devuelve una tupla ``(items, total)`` donde ``total`` es el número total de
    incidencias del usuario (antes de aplicar limit/offset).
    """
    query = db.query(Incidencia).filter(Incidencia.user_id == user_id).order_by(Incidencia.id)
    total = query.count()
    items = query.offset(offset).limit(limit).all()
    return items, total

def actualizar_incidencia(db: Session, incidencia_id: int, update_data, admin_user: str) -> Incidencia:
    incidencia = get_incidencia(db, incidencia_id)
    estado_anterior = incidencia.estado
    prioridad_anterior = incidencia.prioridad

    # Detectar qué cambia realmente (un valor None en el payload = "no tocar").
    cambia_estado = update_data.estado is not None and update_data.estado != estado_anterior
    cambia_prioridad = update_data.prioridad is not None and update_data.prioridad != prioridad_anterior

    if cambia_estado:
        incidencia.estado = update_data.estado
    if cambia_prioridad:
        incidencia.prioridad = update_data.prioridad

    # Registrar en el historial CUALQUIER cambio (estado y/o prioridad), con
    # los valores anterior/nuevo de ambos atributos y el autor del cambio.
    if cambia_estado or cambia_prioridad:
        historial = HistorialEstado(
            incidencia_id=incidencia.id,
            estado_anterior=estado_anterior,
            estado_nuevo=incidencia.estado,
            prioridad_anterior=prioridad_anterior,
            prioridad_nueva=incidencia.prioridad,
            cambiado_por=admin_user,
        )
        db.add(historial)

    # Notificar el cambio de ESTADO (issue #7).
    if cambia_estado:
        mensaje = (
            f"La incidencia '{incidencia.titulo}' cambió de estado: "
            f"{estado_anterior.value} → {incidencia.estado.value}"
        )
        notificaciones_service.crear_notificacion(
            db, incidencia_id=incidencia.id, estado_nuevo=incidencia.estado, mensaje=mensaje
        )

    db.commit()
    db.refresh(incidencia)
    return incidencia

from fastapi import UploadFile, HTTPException
from storage import get_storage

# Validación de imágenes (issue #10). Tamaño máximo desde la configuración (issue #12).
MAX_IMAGEN_BYTES = settings.max_imagen_bytes
_FIRMAS_IMAGEN = {
    b"\xff\xd8\xff": "jpg",          # JPEG
    b"\x89PNG\r\n\x1a\n": "png",     # PNG
}


def _detectar_tipo_imagen(contenido: bytes):
    """Devuelve 'jpg'/'png' según los magic bytes reales, o None si no es imagen válida."""
    for firma, ext in _FIRMAS_IMAGEN.items():
        if contenido.startswith(firma):
            return ext
    return None


def subir_imagen_incidencia(db: Session, incidencia_id: int, file: UploadFile):
    # Validar que la incidencia existe
    get_incidencia(db, incidencia_id)

    # Gate barato por content_type declarado
    if file.content_type not in ("image/jpeg", "image/png"):
        raise HTTPException(status_code=400, detail="Formato de imagen inválido")

    contenido = file.file.read()
    if not contenido:
        raise HTTPException(status_code=400, detail="El archivo está vacío")
    if len(contenido) > MAX_IMAGEN_BYTES:
        raise HTTPException(status_code=400, detail="La imagen supera el tamaño máximo permitido (5 MB)")

    # Validación robusta por el CONTENIDO real (magic bytes), no solo por content_type:
    # rechaza archivos que falseen el content_type.
    tipo = _detectar_tipo_imagen(contenido)
    if tipo is None:
        raise HTTPException(status_code=400, detail="El contenido no es una imagen JPEG o PNG válida")

    # Persistencia delegada al backend de almacenamiento (local/S3) -> issue #8.
    # La extensión se deriva del tipo detectado, no del nombre del archivo.
    ruta = get_storage().guardar(contenido, tipo)

    from models import Imagen
    db_img = Imagen(incidencia_id=incidencia_id, ruta=ruta)
    db.add(db_img)
    db.commit()
    db.refresh(db_img)

    return db_img
