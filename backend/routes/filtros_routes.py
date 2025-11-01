from fastapi import APIRouter
from connection import conecta

router = APIRouter(prefix="/filtros", tags=["Filtros"])

@router.get("/lojas")
def listar_lojas():
    conn = conecta()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name FROM stores ORDER BY name;")
    lojas = [{"id": r[0], "nome": r[1]} for r in cursor.fetchall()]
    cursor.close()
    conn.close()
    return lojas

@router.get("/canais")
def listar_canais():
    conn = conecta()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name FROM channels ORDER BY name;")
    canais = [{"id": r[0], "nome": r[1]} for r in cursor.fetchall()]
    cursor.close()
    conn.close()
    return canais
