"""Utilidades puras de seguridad: hashing de contraseñas y JWT.

Sin dependencias de FastAPI ni de la BD para evitar imports circulares.
La configuración se lee de variables de entorno (con valores por defecto de desarrollo).
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt

from config import settings

# Configuración centralizada por entorno (ver config.py).
SECRET_KEY = settings.secret_key
ALGORITHM = settings.jwt_algorithm
ACCESS_TOKEN_EXPIRE_MINUTES = settings.access_token_expire_minutes


def hash_password(password: str) -> str:
    """Hashea una contraseña con bcrypt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    """Verifica una contraseña contra su hash bcrypt."""
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(subject: str, rol: str, expires_minutes: Optional[int] = None) -> str:
    """Genera un JWT firmado con el email (sub) y el rol del usuario."""
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=expires_minutes if expires_minutes is not None else ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {"sub": subject, "rol": rol, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decodifica y valida un JWT. Lanza jwt.PyJWTError si es inválido/expirado."""
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
