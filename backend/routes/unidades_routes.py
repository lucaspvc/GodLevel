from fastapi import APIRouter, Query
from services.unidades_service import get_unidades_overview

router = APIRouter(prefix="/units", tags=["Unidades"])

@router.get("/overview")
def unidades_overview(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1),
    start_date: str = Query(None),
    end_date: str = Query(None),
    status: str = Query(None),
    channel_id: int = Query(None)
):
    """
    Retorna visão geral das unidades com KPIs, tabela paginada e filtros.
    """
    data = get_unidades_overview(page, limit, start_date, end_date, status, channel_id)
    return data
