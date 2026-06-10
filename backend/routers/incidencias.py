from fastapi import APIRouter, Depends, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from schemas import IncidenciaCreate, IncidenciaResponse, EstadoUpdate, ImagenResponse, IncidenciaPage, AsignarEquipoUpdate
import services.incidencias as incidencias_service
from auth import require_admin, get_current_user, get_current_user_optional
from models import User

router = APIRouter(
    prefix="/incidencias",
    tags=["Incidencias"]
)

@router.post("", response_model=IncidenciaResponse, status_code=status.HTTP_201_CREATED)
def crear_incidencia(
    incidencia_in: IncidenciaCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    # Auth opcional (issue #33): si la petición lleva un JWT válido, se asocia el
    # autor; si es anónima, user_id queda en None.
    return incidencias_service.crear_incidencia(
        db=db,
        incidencia_in=incidencia_in,
        user_id=current_user.id if current_user else None,
    )

@router.get("", response_model=IncidenciaPage)
def listar_incidencias(
    estado: Optional[str] = Query(None),
    categoria: Optional[str] = Query(None),
    prioridad: Optional[str] = Query(None),
    lat: Optional[float] = Query(None),
    lng: Optional[float] = Query(None),
    radio: Optional[float] = Query(None),
    limit: int = Query(20, ge=1, le=100, description="Nº máximo de resultados por página"),
    offset: int = Query(0, ge=0, description="Nº de resultados a saltar (paginación)"),
    db: Session = Depends(get_db)
):
    items, total = incidencias_service.listar_incidencias(
        db=db, estado=estado, categoria=categoria, prioridad=prioridad,
        lat=lat, lng=lng, radio=radio, limit=limit, offset=offset
    )
    return {"items": items, "total": total, "limit": limit, "offset": offset}

# IMPORTANTE: "/mias" se declara ANTES de "/{id}". Si se declarara después,
# FastAPI interpretaría "mias" como el path param {id} (que es int) -> 422.
@router.get("/mias", response_model=IncidenciaPage)
def listar_mis_incidencias(
    limit: int = Query(20, ge=1, le=100, description="Nº máximo de resultados por página"),
    offset: int = Query(0, ge=0, description="Nº de resultados a saltar (paginación)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Devuelve, paginadas, SOLO las incidencias del usuario autenticado (issue #33)."""
    items, total = incidencias_service.listar_incidencias_de_usuario(
        db=db, user_id=current_user.id, limit=limit, offset=offset
    )
    return {"items": items, "total": total, "limit": limit, "offset": offset}

@router.get("/{id}", response_model=IncidenciaResponse)
def get_incidencia(id: int, db: Session = Depends(get_db)):
    return incidencias_service.get_incidencia(db=db, incidencia_id=id)

@router.patch("/{id}", response_model=IncidenciaResponse)
def actualizar_incidencia(
    id: int,
    update_data: EstadoUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return incidencias_service.actualizar_incidencia(db=db, incidencia_id=id, update_data=update_data, admin_user=current_user.email)

@router.patch("/{id}/equipo", response_model=IncidenciaResponse)
def asignar_equipo(
    id: int,
    update_data: AsignarEquipoUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Asigna o desasigna un equipo a una incidencia (issue #36, solo admin).

    Body `{ "equipo_id": <int> }` asigna; `{ "equipo_id": null }` desasigna.
    El equipo solo puede asignarse a incidencias de su MISMA categoría
    (`409` si no coincide). `404` si la incidencia o el equipo no existen.
    """
    return incidencias_service.asignar_equipo(db=db, incidencia_id=id, equipo_id=update_data.equipo_id)

@router.post("/{id}/imagenes", response_model=ImagenResponse, status_code=status.HTTP_201_CREATED)
def subir_imagen(id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    return incidencias_service.subir_imagen_incidencia(db=db, incidencia_id=id, file=file)
