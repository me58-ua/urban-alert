"""Lógica de negocio de notificaciones de incidencias."""
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models import Notificacion, EstadoEnum


def crear_notificacion(db: Session, incidencia_id: int, estado_nuevo: EstadoEnum, mensaje: str) -> Notificacion:
    """Crea (sin commit) una notificación; el commit lo hace quien la origina."""
    notif = Notificacion(incidencia_id=incidencia_id, estado_nuevo=estado_nuevo, mensaje=mensaje)
    db.add(notif)
    return notif


def listar_notificaciones(
    db: Session,
    incidencia_id: Optional[int] = None,
    leida: Optional[bool] = None,
) -> List[Notificacion]:
    query = db.query(Notificacion)
    if incidencia_id is not None:
        query = query.filter(Notificacion.incidencia_id == incidencia_id)
    if leida is not None:
        query = query.filter(Notificacion.leida == leida)
    return query.order_by(Notificacion.fecha_creacion.desc(), Notificacion.id.desc()).all()


def marcar_leida(db: Session, notificacion_id: int) -> Notificacion:
    notif = db.query(Notificacion).filter(Notificacion.id == notificacion_id).first()
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notificación no encontrada")
    notif.leida = True
    db.commit()
    db.refresh(notif)
    return notif
