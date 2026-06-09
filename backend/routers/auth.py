"""Endpoints de autenticación: registro, login (JWT) y perfil."""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

import services.usuarios as usuarios_service
from auth import get_current_user
from database import get_db
from models import User
from schemas import Token, UserCreate, UserResponse
from security import create_access_token

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    """Registro público de un ciudadano."""
    return usuarios_service.create_user(db=db, user_in=user_in)


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login con email (campo `username`) y contraseña; devuelve un JWT."""
    user = usuarios_service.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token(subject=user.email, rol=user.rol.value)
    return Token(access_token=token)


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    """Devuelve el usuario autenticado."""
    return current_user
