from connection import conecta

def get_dashboard_overview(start_date=None, end_date=None, store_id=None, channel_id=None):
    conn = conecta()
    cursor = conn.cursor()

    filtros = []
    if start_date and end_date:
        filtros.append(f"s.created_at BETWEEN '{start_date}' AND '{end_date}'")
    if store_id:
        filtros.append(f"s.store_id = {store_id}")
    if channel_id:
        filtros.append(f"s.channel_id = {channel_id}")

    where_clause = "WHERE " + " AND ".join(filtros) if filtros else ""

    cmd = f"""
        SELECT
            COUNT(*) AS total_pedidos,
            SUM(s.total_amount) AS faturamento_total,
            ROUND(AVG(s.total_amount), 2) AS ticket_medio,
            ROUND(SUM(CASE WHEN s.sale_status_desc = 'CANCELLED' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) AS taxa_cancelamento
        FROM sales s
        {where_clause};
    """
    cursor.execute(cmd)
    kpis = cursor.fetchone()

    # Tendência (faturamento diário)
    cursor.execute(f"""
        SELECT 
            DATE(s.created_at) AS data, 
            SUM(s.total_amount) AS faturamento
        FROM sales s
        {where_clause}
        GROUP BY DATE(s.created_at)
        ORDER BY data;
    """)
    tendencia = cursor.fetchall()

    # Top produtos
    cursor.execute(f"""
        SELECT 
            p.name, SUM(ps.quantity) AS qtd_vendida, SUM(ps.total_price) AS receita
        FROM product_sales ps
        JOIN products p ON ps.product_id = p.id
        JOIN sales s ON ps.sale_id = s.id
        {where_clause}
        GROUP BY p.name
        ORDER BY receita DESC
        LIMIT 5;
    """)
    top_produtos = cursor.fetchall()

    # Faturamento por loja
    cursor.execute(f"""
        SELECT 
            st.name, SUM(s.total_amount) AS receita
        FROM sales s
        JOIN stores st ON s.store_id = st.id
        {where_clause}
        GROUP BY st.name
        ORDER BY receita DESC;
    """)
    faturamento_lojas = cursor.fetchall()

    cursor.close()
    conn.close()

    return {
        "kpis": {
            "total_pedidos": kpis[0],
            "faturamento_total": float(kpis[1] or 0),
            "ticket_medio": float(kpis[2] or 0),
            "taxa_cancelamento": float(kpis[3] or 0)
        },
        "tendencia": [
            {"data": str(d[0]), "faturamento": float(d[1])} for d in tendencia
        ],
        "top_produtos": [
            {"produto": p[0], "quantidade": p[1], "receita": float(p[2])} for p in top_produtos
        ],
        "faturamento_lojas": [
            {"loja": l[0], "receita": float(l[1])} for l in faturamento_lojas
        ]
    }
