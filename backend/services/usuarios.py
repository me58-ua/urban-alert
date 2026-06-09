"""Lógica de negocio de usuarios: alta, búsqueda y autenticación."""
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models import User, RolEnum
from schemas import UserCreate
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


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """Devuelve el usuario si las credenciales son correctas, o None."""
    user = get_user_by_email(db, email)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user
