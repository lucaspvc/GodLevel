from fastapi import APIRouter, Query
from services.sales_dashboard import get_sales_dashboard

router = APIRouter(prefix="/dashboard", tags=["Sales Dashboard"])

@router.get("/sales")
def sales_dashboard(
    start_date: str = Query(None),
    end_date: str = Query(None),
    store_id: int = Query(None),
    channel_id: int = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=200)
):
    """
    Retorna informações de vendas, faturamento e listagem paginada de pedidos.
    """
    data = get_sales_dashboard(start_date, end_date, store_id, channel_id, page, limit)
    return data
