"""Endpoints de notificaciones de incidencias."""
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from schemas import NotificacionResponse
import services.notificaciones as notificaciones_service

router = APIRouter(prefix="/notificaciones", tags=["Notificaciones"])


@router.get("", response_model=List[NotificacionResponse])
def listar_notificaciones(
    incidencia_id: Optional[int] = Query(None, description="Filtrar por incidencia"),
    leida: Optional[bool] = Query(None, description="Filtrar por leídas/no leídas"),
    db: Session = Depends(get_db),
):
    return notificaciones_service.listar_notificaciones(db, incidencia_id=incidencia_id, leida=leida)


@router.patch("/{id}/leer", response_model=NotificacionResponse)
def marcar_leida(id: int, db: Session = Depends(get_db)):
    return notificaciones_service.marcar_leida(db, notificacion_id=id)
