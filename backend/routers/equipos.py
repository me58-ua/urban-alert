"""Endpoints de equipos y trabajadores (issue #35). Todo solo admin."""
from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from database import get_db
from schemas import (
    EquipoCreate,
    EquipoUpdate,
    EquipoResponse,
    TrabajadorCreate,
    TrabajadorUpdate,
    TrabajadorResponse,
)
from auth import require_admin
from models import User
import services.equipos as equipos_service

router = APIRouter(prefix="/equipos", tags=["Equipos"])


@router.get("", response_model=List[EquipoResponse])
def listar_equipos(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Lista todos los equipos con sus trabajadores. Requiere rol admin."""
    return equipos_service.listar_equipos(db)


@router.post("", response_model=EquipoResponse, status_code=status.HTTP_201_CREATED)
def crear_equipo(
    datos: EquipoCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Crea un equipo (nombre + categoria). Requiere rol admin."""
    return equipos_service.crear_equipo(db, datos)


@router.get("/{id}", response_model=EquipoResponse)
def get_equipo(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Detalle de un equipo (con sus trabajadores). 404 si no existe."""
    return equipos_service.get_equipo(db, equipo_id=id)


@router.patch("/{id}", response_model=EquipoResponse)
def actualizar_equipo(
    id: int,
    datos: EquipoUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Edita nombre y/o categoria de un equipo. 404 si no existe."""
    return equipos_service.actualizar_equipo(db, equipo_id=id, datos=datos)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_equipo(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Borra un equipo. Sus trabajadores quedan con equipo_id null (no se
    borran). 404 si no existe."""
    equipos_service.eliminar_equipo(db, equipo_id=id)
    return None


@router.post(
    "/{id}/trabajadores",
    response_model=TrabajadorResponse,
    status_code=status.HTTP_201_CREATED,
)
def crear_trabajador_en_equipo(
    id: int,
    datos: TrabajadorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Crea un trabajador y lo asigna al equipo {id}. 404 si el equipo no
    existe."""
    return equipos_service.crear_trabajador_en_equipo(db, equipo_id=id, datos=datos)


@router.delete(
    "/{id}/trabajadores/{trabajador_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def quitar_trabajador_de_equipo(
    id: int,
    trabajador_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Desasigna un trabajador del equipo (equipo_id = null); no lo borra.
    404 si el equipo/trabajador no existe o no pertenece a ese equipo."""
    equipos_service.quitar_trabajador_de_equipo(
        db, equipo_id=id, trabajador_id=trabajador_id
    )
    return None


# Router de trabajadores (CRUD independiente del equipo).
trabajadores_router = APIRouter(prefix="/trabajadores", tags=["Trabajadores"])


@trabajadores_router.get("", response_model=List[TrabajadorResponse])
def listar_trabajadores(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Lista todos los trabajadores. Requiere rol admin."""
    return equipos_service.listar_trabajadores(db)


@trabajadores_router.patch("/{id}", response_model=TrabajadorResponse)
def actualizar_trabajador(
    id: int,
    datos: TrabajadorUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Edita nombre/puesto/disponible de un trabajador. 404 si no existe."""
    return equipos_service.actualizar_trabajador(db, trabajador_id=id, datos=datos)


@trabajadores_router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_trabajador(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Borra un trabajador. 404 si no existe."""
    equipos_service.eliminar_trabajador(db, trabajador_id=id)
    return None
