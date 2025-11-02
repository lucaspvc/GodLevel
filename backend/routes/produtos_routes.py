from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.produtos_service import get_produtos, get_produto_by_id, criar_produto, get_produtos_analitico

router = APIRouter(prefix="/produtos", tags=["Produtos"])


# 🔹 Modelo de entrada (para validação automática do FastAPI)
class ProdutoCreate(BaseModel):
    nome: str
    preco: float
    categoria_id: Optional[int] = None
    descricao: Optional[str] = None


@router.get("/")
def listar_produtos(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1),
    category_id: Optional[int] = Query(None, alias="category_id")
):
    """
    Lista produtos com paginação e filtro opcional por categoria.
    """
    return get_produtos(page, limit, category_id)

@router.get("/analitico")
def listar_produtos_analitico(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    store_id: Optional[int] = None,
    channel_id: Optional[int] = None,
    category_id: Optional[int] = None,
    weekday: Optional[int] = None,
    start_hour: Optional[int] = None,
    end_hour: Optional[int] = None
):
    """
    Retorna informações analíticas dos produtos.
    """
    return get_produtos_analitico(
        page=page,
        limit=limit,
        start_date=start_date,
        end_date=end_date,
        store_id=store_id,
        channel_id=channel_id,
        category_id=category_id,
        weekday=weekday,
        start_hour=start_hour,
        end_hour=end_hour
    )



@router.get("/{produto_id}")
def buscar_produto(produto_id: int):
    """
    Retorna os detalhes de um produto pelo ID.
    """
    produto = get_produto_by_id(produto_id)
    if not produto:
        # Mais adequado do que retornar um dicionário simples
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return produto


@router.post("/", status_code=201)
def criar_novo_produto(produto: ProdutoCreate):
    """
    Cria um novo produto no catálogo.
    """
    return criar_produto(produto.dict())
