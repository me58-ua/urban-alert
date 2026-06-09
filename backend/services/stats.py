"""Cálculo de métricas/estadísticas de incidencias para el dashboard (issue #9)."""
from datetime import datetime, timedelta, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from models import Incidencia, EstadoEnum, CategoriaEnum, PrioridadEnum


def _conteo_por(db: Session, columna, enum_cls) -> dict:
    """Cuenta incidencias agrupadas por una columna enum (con todas las claves a 0)."""
    base = {e.value: 0 for e in enum_cls}
    for valor, n in db.query(columna, func.count(Incidencia.id)).group_by(columna).all():
        clave = valor.value if hasattr(valor, "value") else str(valor)
        base[clave] = n
    return base


def _aware(dt: datetime) -> datetime:
    """Normaliza un datetime a UTC-aware (SQLite devuelve naive)."""
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def obtener_estadisticas(db: Session) -> dict:
    total = db.query(func.count(Incidencia.id)).scalar() or 0

    por_estado = _conteo_por(db, Incidencia.estado, EstadoEnum)
    por_categoria = _conteo_por(db, Incidencia.categoria, CategoriaEnum)
    por_prioridad = _conteo_por(db, Incidencia.prioridad, PrioridadEnum)

    resueltas = por_estado.get(EstadoEnum.resuelta.value, 0)
    porcentaje_resueltas = round(resueltas / total * 100, 2) if total else 0.0

    # Tiempo medio de resolución (aprox.: última actualización - creación) en horas.
    tiempos = [
        (inc.fecha_actualizacion - inc.fecha_creacion).total_seconds()
        for inc in db.query(Incidencia).filter(Incidencia.estado == EstadoEnum.resuelta).all()
        if inc.fecha_creacion and inc.fecha_actualizacion
    ]
    tiempo_medio_horas = round(sum(tiempos) / len(tiempos) / 3600, 2) if tiempos else None

    # Reportes por periodo (calculado en Python para ser robusto entre SQLite/PostgreSQL).
    ahora = datetime.now(timezone.utc)
    fechas = [_aware(f) for (f,) in db.query(Incidencia.fecha_creacion).all() if f is not None]
    reportes_7 = sum(1 for f in fechas if f >= ahora - timedelta(days=7))
    reportes_30 = sum(1 for f in fechas if f >= ahora - timedelta(days=30))

    return {
        "total": total,
        "por_estado": por_estado,
        "por_categoria": por_categoria,
        "por_prioridad": por_prioridad,
        "porcentaje_resueltas": porcentaje_resueltas,
        "tiempo_medio_resolucion_horas": tiempo_medio_horas,
        "reportes_ultimos_7_dias": reportes_7,
        "reportes_ultimos_30_dias": reportes_30,
    }
