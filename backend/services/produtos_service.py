from connection import conecta

def get_produtos(page, limit, category_id=None):
    """
    Retorna lista de produtos, opcionalmente filtrando por category_id.
    Paginação aplicada via page e limit.
    """

    conn = conecta()
    cursor = conn.cursor()

    offset = (page - 1) * limit
    filtros = []

    if category_id:
        filtros.append(f"p.category_id = {category_id}")

    where_clause = "WHERE TRUE"
    if filtros:
        where_clause += " AND " + " AND ".join(filtros)

    query = f"""
        SELECT p.id, p.name, c.name as categoria
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        {where_clause}
        ORDER BY p.id
        LIMIT {limit} OFFSET {offset}
    """

    cursor.execute(query)
    resultados = cursor.fetchall()
    cursor.close()

    produtos = []
    for r in resultados:
        produtos.append({
            "id": r[0],
            "produto": r[1],
            "categoria": r[2] or "-"
        })

    return produtos

def get_produtos_analitico(page: int = 1,limit: int = 20,start_date=None,end_date=None,store_id=None,channel_id=None,
                           category_id=None,weekday=None,start_hour=None,end_hour=None):
    conn = conecta()
    cursor = conn.cursor()

    offset = (page - 1) * limit
    filtros = []
    params = []

    # Filtros dinâmicos
    if start_date:
        filtros.append("s.created_at::date >= %s")
        params.append(start_date)
    if end_date:
        filtros.append("s.created_at::date <= %s")
        params.append(end_date)
    if store_id:
        filtros.append("s.store_id = %s")
        params.append(store_id)
    if channel_id:
        filtros.append("s.channel_id = %s")
        params.append(channel_id)
    if category_id:
        filtros.append("p.category_id = %s")
        params.append(category_id)
    if weekday is not None:
        filtros.append("EXTRACT(DOW FROM s.created_at) = %s")
        params.append(weekday)
    if start_hour is not None:
        filtros.append("EXTRACT(HOUR FROM s.created_at) >= %s")
        params.append(start_hour)
    if end_hour is not None:
        filtros.append("EXTRACT(HOUR FROM s.created_at) < %s")
        params.append(end_hour)
    where_clause = "WHERE " + " AND ".join(filtros) if filtros else ""

    # Dados agregados por produto 
    query_principal = f"""
        SELECT
            p.id,
            p.name AS produto,
            c.name AS categoria,
            SUM(ps.quantity) AS qtde,
            SUM(ps.total_price) AS faturamento,
            COALESCE(SUM(ps.quantity * ps.base_price * 0.6), 0) AS custo,
            ((SUM(ps.total_price) - SUM(ps.quantity * ps.base_price * 0.6)) /
            NULLIF(SUM(ps.total_price),0) * 100) AS margem_percentual,
            SUM(ps.total_price - ps.quantity * ps.base_price * 0.6) AS margem_total
        FROM product_sales ps
        JOIN sales s ON ps.sale_id = s.id
        JOIN products p ON ps.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        {where_clause}
        GROUP BY p.id, p.name, c.name
        ORDER BY faturamento DESC
        LIMIT %s OFFSET %s
    """

    params_main = params + [limit, offset]
    cursor.execute(query_principal, params_main)
    produtos = cursor.fetchall()
    produtos_list = [
        {
            "id": r[0],
            "produto": r[1],
            "categoria": r[2] or "-",
            "qtde": int(r[3] or 0),
            "faturamento": float(r[4] or 0),
            "custo": float(r[5] or 0),
            "margem_percentual": round(float(r[6] or 0), 2),
            "margem_total": float(r[7] or 0)
        } for r in produtos
    ]

    # KPIs
    query_kpis = f"""
        SELECT
            SUM(ps.quantity) AS total_itens,
            SUM(ps.total_price) AS faturamento_total,
            AVG(
                (ps.total_price - ps.quantity * ps.base_price * 0.6) /
                NULLIF(ps.total_price,0) * 100
            ) AS margem_media
        FROM product_sales ps
        JOIN sales s ON ps.sale_id = s.id
        JOIN products p ON ps.product_id = p.id
        {where_clause}
    """
    cursor.execute(query_kpis, params)
    total_itens, faturamento_total, margem_media = cursor.fetchone()

    # Produto mais vendido
    cursor.execute(f"""
        SELECT p.name
        FROM product_sales ps
        JOIN sales s ON ps.sale_id = s.id
        JOIN products p ON ps.product_id = p.id
        {where_clause}
        GROUP BY p.name
        ORDER BY SUM(ps.quantity) DESC
        LIMIT 1
    """, params)
    mais_vendido = cursor.fetchone()
    produto_mais_vendido = mais_vendido[0] if mais_vendido else "-"

    # Produto mais lucrativo
    cursor.execute(f"""
        SELECT p.name
        FROM product_sales ps
        JOIN sales s ON ps.sale_id = s.id
        JOIN products p ON ps.product_id = p.id
        {where_clause}
        GROUP BY p.name
        ORDER BY SUM(ps.total_price - ps.quantity * ps.base_price * 0.6) DESC
        LIMIT 1
    """, params)
    mais_lucrativo = cursor.fetchone()
    produto_mais_lucrativo = mais_lucrativo[0] if mais_lucrativo else "-"

    kpis = {
        "total_itens": int(total_itens or 0),
        "faturamento_total": float(faturamento_total or 0),
        "margem_media": round(float(margem_media or 0), 2),
        "produto_mais_vendido": produto_mais_vendido,
        "produto_mais_lucrativo": produto_mais_lucrativo
    }

    # Top vendidos
    top_vendidos = sorted(produtos_list, key=lambda x: x["qtde"], reverse=True)[:10]

    # Menu engineering
    menu_engineering = [
        {
            "produto": p["produto"],
            "qtde": p["qtde"],
            "faturamento": p["faturamento"],
            "margem_percentual": p["margem_percentual"],
            "margem_total": p["margem_total"]
        } for p in produtos_list
    ]

    # Mix por categoria
    cursor.execute(f"""
        SELECT c.name, SUM(ps.total_price)
        FROM product_sales ps
        JOIN sales s ON ps.sale_id = s.id
        JOIN products p ON ps.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        {where_clause}
        GROUP BY c.name
    """, params)
    mix_raw = cursor.fetchall()
    total_fat = sum([r[1] or 0 for r in mix_raw]) or 1
    mix_categorias = [
        {"categoria": r[0] or "-", "percentual": round((r[1] or 0) / total_fat * 100, 2)}
        for r in mix_raw
    ]

    # Evolução de vendas
    cursor.execute(f"""
        SELECT
            DATE(s.created_at) AS data,
            SUM(ps.total_price) AS valor
        FROM product_sales ps
        JOIN sales s ON ps.sale_id = s.id
        JOIN products p ON ps.product_id = p.id
        {where_clause}
        GROUP BY DATE(s.created_at)
        ORDER BY data
    """, params)
    evolucao_raw = cursor.fetchall()
    evolucao_vendas = [{"data": str(r[0]), "valor": float(r[1] or 0)} for r in evolucao_raw]

    cursor.close()
    conn.close()

    return {
        "pagina": page,
        "limit": limit,
        "produtos": produtos_list,
        "kpis": kpis,
        "top_vendidos": top_vendidos,
        "menu_engineering": menu_engineering,
        "mix_categorias": mix_categorias,
        "evolucao_vendas": evolucao_vendas
    }