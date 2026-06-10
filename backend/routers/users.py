"""Endpoints de gestión de usuarios y roles (solo admin) — issue #27."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from database import get_db
from schemas import (
    UsuariosPage,
    UserResponse,
    RolUpdate,
    UsuarioAdminCreate,
    UserUpdate,
    EstadoUsuarioUpdate,
)
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


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def crear_usuario(
    datos: UsuarioAdminCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Crea un usuario con el rol indicado (ciudadano|admin). Requiere rol admin."""
    return usuarios_service.crear_usuario_admin(db, datos)


@router.patch("/{id}", response_model=UserResponse)
def editar_usuario(
    id: int,
    cambio: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Edita el email de un usuario. Requiere rol admin."""
    if cambio.email is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se ha indicado ningún campo a actualizar",
        )
    return usuarios_service.actualizar_usuario(db, user_id=id, email=cambio.email)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_usuario(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Elimina un usuario. Requiere rol admin. No puedes borrarte a ti mismo."""
    # Guard de auto-borrado: un admin no puede eliminar su propia cuenta.
    if id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puedes eliminar tu propia cuenta",
        )
    usuarios_service.eliminar_usuario(db, user_id=id)
    return None


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


@router.patch("/{id}/estado", response_model=UserResponse)
def cambiar_estado(
    id: int,
    cambio: EstadoUsuarioUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Activa/desactiva un usuario. Requiere rol admin. No puedes desactivarte a ti mismo."""
    # Guard de auto-desactivación: un admin no puede desactivar su propia cuenta.
    if id == current_user.id and not cambio.activo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puedes desactivar tu propia cuenta",
        )
    return usuarios_service.cambiar_estado(db, user_id=id, activo=cambio.activo)
