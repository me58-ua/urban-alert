"""Lógica de negocio de equipos y trabajadores (issue #35, solo admin).

Un equipo agrupa trabajadores y tiene una `categoria` operativa que reutiliza
el CategoriaEnum del backend. Al borrar un equipo, sus trabajadores NO se
borran: quedan con `equipo_id = NULL` (ON DELETE SET NULL en el modelo).
"""
from typing import List

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models import Equipo, Trabajador
from schemas import EquipoCreate, EquipoUpdate, TrabajadorCreate, TrabajadorUpdate


# ── Equipos ──────────────────────────────────────────────────────────────────
def crear_equipo(db: Session, datos: EquipoCreate) -> Equipo:
    equipo = Equipo(nombre=datos.nombre, categoria=datos.categoria)
    db.add(equipo)
    db.commit()
    db.refresh(equipo)
    return equipo


def listar_equipos(db: Session) -> List[Equipo]:
    """Lista simple (los equipos son pocos: no hace falta paginar)."""
    return db.query(Equipo).order_by(Equipo.id).all()


def get_equipo(db: Session, equipo_id: int) -> Equipo:
    equipo = db.query(Equipo).filter(Equipo.id == equipo_id).first()
    if not equipo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Equipo no encontrado")
    return equipo


def actualizar_equipo(db: Session, equipo_id: int, datos: EquipoUpdate) -> Equipo:
    """Aplica solo los campos no-None (404 si el equipo no existe)."""
    equipo = get_equipo(db, equipo_id)
    if datos.nombre is not None:
        equipo.nombre = datos.nombre
    if datos.categoria is not None:
        equipo.categoria = datos.categoria
    db.commit()
    db.refresh(equipo)
    return equipo


def eliminar_equipo(db: Session, equipo_id: int) -> None:
    """Borra el equipo (404 si no existe). Sus trabajadores quedan con
    equipo_id = NULL por el ON DELETE SET NULL del modelo."""
    equipo = get_equipo(db, equipo_id)
    db.delete(equipo)
    db.commit()


# ── Trabajadores ─────────────────────────────────────────────────────────────
def listar_trabajadores(db: Session) -> List[Trabajador]:
    return db.query(Trabajador).order_by(Trabajador.id).all()


def crear_trabajador_en_equipo(db: Session, equipo_id: int, datos: TrabajadorCreate) -> Trabajador:
    """Crea un trabajador y lo asigna al equipo (404 si el equipo no existe)."""
    equipo = get_equipo(db, equipo_id)
    trabajador = Trabajador(
        nombre=datos.nombre,
        puesto=datos.puesto,
        disponible=datos.disponible,
        equipo_id=equipo.id,
    )
    db.add(trabajador)
    db.commit()
    db.refresh(trabajador)
    return trabajador


def quitar_trabajador_de_equipo(db: Session, equipo_id: int, trabajador_id: int) -> None:
    """Desasigna un trabajador de un equipo (pone equipo_id = NULL).

    404 si el equipo no existe, el trabajador no existe, o el trabajador no
    pertenece a ese equipo.
    """
    # 404 si el equipo no existe.
    get_equipo(db, equipo_id)
    trabajador = db.query(Trabajador).filter(Trabajador.id == trabajador_id).first()
    if not trabajador or trabajador.equipo_id != equipo_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trabajador no encontrado en ese equipo",
        )
    trabajador.equipo_id = None
    db.commit()


def actualizar_trabajador(db: Session, trabajador_id: int, datos: TrabajadorUpdate) -> Trabajador:
    """Aplica solo los campos no-None (404 si el trabajador no existe)."""
    trabajador = db.query(Trabajador).filter(Trabajador.id == trabajador_id).first()
    if not trabajador:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trabajador no encontrado")
    if datos.nombre is not None:
        trabajador.nombre = datos.nombre
    if datos.puesto is not None:
        trabajador.puesto = datos.puesto
    if datos.disponible is not None:
        trabajador.disponible = datos.disponible
    db.commit()
    db.refresh(trabajador)
    return trabajador


def eliminar_trabajador(db: Session, trabajador_id: int) -> None:
    """Borra el trabajador (404 si no existe)."""
    trabajador = db.query(Trabajador).filter(Trabajador.id == trabajador_id).first()
    if not trabajador:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trabajador no encontrado")
    db.delete(trabajador)
    db.commit()
