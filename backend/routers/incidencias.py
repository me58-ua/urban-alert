from fastapi import APIRouter, Depends, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from schemas import IncidenciaCreate, IncidenciaResponse, EstadoUpdate, ImagenResponse
import services.incidencias as incidencias_service
from dependencies import get_admin_role

router = APIRouter(
    prefix="/incidencias",
    tags=["Incidencias"]
)

@router.post("", response_model=IncidenciaResponse, status_code=status.HTTP_201_CREATED)
def crear_incidencia(incidencia_in: IncidenciaCreate, db: Session = Depends(get_db)):
    return incidencias_service.crear_incidencia(db=db, incidencia_in=incidencia_in)

@router.get("", response_model=List[IncidenciaResponse])
def listar_incidencias(
    estado: Optional[str] = Query(None),
    categoria: Optional[str] = Query(None),
    prioridad: Optional[str] = Query(None),
    lat: Optional[float] = Query(None),
    lng: Optional[float] = Query(None),
    radio: Optional[float] = Query(None),
    db: Session = Depends(get_db)
):
    return incidencias_service.listar_incidencias(
        db=db, estado=estado, categoria=categoria, prioridad=prioridad,
        lat=lat, lng=lng, radio=radio
    )

@router.get("/{id}", response_model=IncidenciaResponse)
def get_incidencia(id: int, db: Session = Depends(get_db)):
    return incidencias_service.get_incidencia(db=db, incidencia_id=id)

@router.patch("/{id}", response_model=IncidenciaResponse)
def actualizar_incidencia(
    id: int, 
    update_data: EstadoUpdate, 
    db: Session = Depends(get_db),
    admin_user: str = Depends(get_admin_role)
):
    return incidencias_service.actualizar_incidencia(db=db, incidencia_id=id, update_data=update_data, admin_user=admin_user)

@router.post("/{id}/imagenes", response_model=ImagenResponse, status_code=status.HTTP_201_CREATED)
def subir_imagen(id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    return incidencias_service.subir_imagen_incidencia(db=db, incidencia_id=id, file=file)
