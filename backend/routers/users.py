"""Endpoints de gestión de usuarios y roles (solo admin) — issue #27."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from database import get_db
from schemas import UsuariosPage, UserResponse, RolUpdate
from auth import require_admin
from models import User
import services.usuarios as usuarios_service

router = APIRouter(prefix="/users", tags=["Usuarios"])


@router.get("", response_model=UsuariosPage)
def listar_usuarios(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Lista usuarios (paginado). Requiere rol admin."""
    items, total = usuarios_service.listar_usuarios(db, limit=limit, offset=offset)
    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.patch("/{id}/rol", response_model=UserResponse)
def cambiar_rol(
    id: int,
    cambio: RolUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Cambia el rol de un usuario (p. ej. promover a admin). Requiere rol admin."""
    # Evita que un admin se quite a sí mismo el rol (auto-bloqueo).
    if id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puedes cambiar tu propio rol",
        )
    return usuarios_service.cambiar_rol(db, user_id=id, nuevo_rol=cambio.rol)
