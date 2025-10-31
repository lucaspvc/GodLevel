from fastapi import APIRouter, Query
from services.dashboard_service import get_dashboard_overview

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/overview")
def dashboard_overview(
    start_date: str = Query(None),
    end_date: str = Query(None),
    store_id: int = Query(None),
    channel_id: int = Query(None)
):
    """
    Retorna as métricas principais do dashboard geral.
    """
    data = get_dashboard_overview(start_date, end_date, store_id, channel_id)
    return data
