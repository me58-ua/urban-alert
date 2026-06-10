"""Endpoint de métricas/estadísticas para el dashboard."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from schemas import EstadisticasResponse
from auth import require_admin
from models import User
import services.stats as stats_service

router = APIRouter(prefix="/stats", tags=["Estadísticas"])


@router.get("", response_model=EstadisticasResponse)
def obtener_estadisticas(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Agregados para el dashboard (solo admin): conteos, % resueltas, tiempo medio y reportes por periodo."""
    return stats_service.obtener_estadisticas(db)
