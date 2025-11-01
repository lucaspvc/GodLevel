from fastapi import APIRouter, Query
from services.sales_dashboard import get_dashboard_sales

router = APIRouter(prefix="/dashboard", tags=["Sales Dashboard"])

@router.get("/sales")
def sales_dashboard(
    start_date: str = Query(None),
    end_date: str = Query(None),
    store_id: int = Query(None),
    channel_id: int = Query(None),
    weekday: int = Query(None, ge=0, le=6),     # 0=Domingo ... 6=Sábado
    start_hour: int = Query(None, ge=0, le=23), # 0–23
    end_hour: int = Query(None, ge=0, le=23),   # 0–23
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=200)
):
    """
    Retorna informações de vendas, faturamento e listagem paginada de pedidos.
    """
    data = get_dashboard_sales(
        start_date=start_date,
        end_date=end_date,
        store_id=store_id,
        channel_id=channel_id,
        weekday=weekday,
        start_hour=start_hour,
        end_hour=end_hour,
        page=page,
        limit=limit
    )
    return data
