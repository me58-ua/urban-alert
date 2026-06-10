"""Dependencias de autenticación/autorización para FastAPI (JWT + roles)."""
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

import services.usuarios as usuarios_service
from database import get_db
from models import User, RolEnum
from security import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")
# Esquema de auth OPCIONAL: con auto_error=False NO lanza 401 cuando falta el
# token, permitiendo endpoints que funcionan tanto autenticados como anónimos
# (p. ej. POST /incidencias anónimo) -> issue #33.
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)

_credentials_exc = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="No autenticado o token inválido",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Decodifica el JWT y devuelve el usuario autenticado (401 si falla)."""
    try:
        payload = decode_access_token(token)
        email = payload.get("sub")
        if not email:
            raise _credentials_exc
    except jwt.PyJWTError:
        raise _credentials_exc

    user = usuarios_service.get_user_by_email(db, email)
    if user is None:
        raise _credentials_exc
    # Defensa en profundidad (issue #34): un token de un usuario desactivado
    # deja de ser válido.
    if not user.activo:
        raise _credentials_exc
    return user


def get_current_user_optional(
    token: Optional[str] = Depends(oauth2_scheme_optional),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Auth opcional: devuelve el usuario si hay un JWT válido, o None.

    Nunca lanza 401: si no hay token, o el token es inválido/expirado, o el
    usuario no existe, simplemente devuelve None. Pensado para endpoints que
    deben seguir funcionando de forma anónima (issue #33).
    """
    if not token:
        return None
    try:
        payload = decode_access_token(token)
        email = payload.get("sub")
        if not email:
            return None
        return usuarios_service.get_user_by_email(db, email)
    except Exception:
        return None


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Exige rol de administrador (403 si no lo es)."""
    if current_user.rol != RolEnum.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operación no permitida: se requiere rol de administrador",
        )
    return current_user
