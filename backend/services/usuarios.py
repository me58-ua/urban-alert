"""Lógica de negocio de usuarios: alta, búsqueda y autenticación."""
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models import User, RolEnum
from schemas import UserCreate, UsuarioAdminCreate
from security import hash_password, verify_password


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()


def create_user(db: Session, user_in: UserCreate, rol: RolEnum = RolEnum.ciudadano) -> User:
    """Crea un usuario. El registro público usa siempre el rol 'ciudadano'."""
    if get_user_by_email(db, user_in.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El email ya está registrado",
        )
    user = User(
        email=user_in.email,
        hashed_password=hash_password(user_in.password),
        rol=rol,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def crear_usuario_admin(db: Session, datos: UsuarioAdminCreate) -> User:
    """Crea un usuario desde el panel admin con el rol indicado (issue #34).

    Reutiliza la lógica de alta de `create_user` pero permitiendo elegir el rol
    (ciudadano|admin). Lanza 400 si el email ya existe.
    """
    user_in = UserCreate(email=datos.email, password=datos.password)
    return create_user(db, user_in, rol=datos.rol)


def actualizar_usuario(db: Session, user_id: int, email: str) -> User:
    """Edita el email de un usuario (issue #34).

    404 si el usuario no existe; 400 si el nuevo email ya lo usa otro usuario.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    existente = get_user_by_email(db, email)
    if existente and existente.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El email ya está registrado",
        )
    user.email = email
    db.commit()
    db.refresh(user)
    return user


def eliminar_usuario(db: Session, user_id: int) -> None:
    """Elimina un usuario (issue #34). 404 si no existe."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    db.delete(user)
    db.commit()


def cambiar_estado(db: Session, user_id: int, activo: bool) -> User:
    """Activa/desactiva un usuario (issue #34). 404 si no existe."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    user.activo = activo
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """Devuelve el usuario si las credenciales son correctas y está activo, o None."""
    user = get_user_by_email(db, email)
    if not user or not verify_password(password, user.hashed_password):
        return None
    # Un usuario inactivo no puede hacer login (issue #34).
    if not user.activo:
        return None
    return user


def listar_usuarios(db: Session, limit: int = 20, offset: int = 0):
    """Lista usuarios paginados (admin). Devuelve (items, total)."""
    query = db.query(User).order_by(User.id)
    total = query.count()
    items = query.offset(offset).limit(limit).all()
    return items, total


def cambiar_rol(db: Session, user_id: int, nuevo_rol: RolEnum) -> User:
    """Cambia el rol de un usuario (404 si no existe)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    user.rol = nuevo_rol
    db.commit()
    db.refresh(user)
    return user


def crear_admin_inicial(db: Session, email: str, password: str) -> User:
    """Crea un administrador o, si el email ya existe, lo promueve a admin (bootstrap)."""
    user = get_user_by_email(db, email)
    if user:
        user.rol = RolEnum.admin
    else:
        user = User(email=email, hashed_password=hash_password(password), rol=RolEnum.admin)
        db.add(user)
    db.commit()
    db.refresh(user)
    return user
