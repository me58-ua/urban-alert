"""Endpoint de métricas/estadísticas para el dashboard."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from schemas import EstadisticasResponse
import services.stats as stats_service

router = APIRouter(prefix="/stats", tags=["Estadísticas"])


@router.get("", response_model=EstadisticasResponse)
def obtener_estadisticas(db: Session = Depends(get_db)):
    """Agregados de incidencias: conteos, % resueltas, tiempo medio y reportes por periodo."""
    return stats_service.obtener_estadisticas(db)
