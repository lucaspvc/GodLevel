from connection import conecta

def get_dashboard_overview(start_date=None, end_date=None, store_id=None, channel_id=None):
    conn = conecta()
    cursor = conn.cursor()

    try:
        filtros = []
        params = []

        # Filtros dinâmicos
        if start_date and end_date:
            filtros.append("s.created_at BETWEEN %s AND %s")
            params.append(f"{start_date} 00:00:00")
            params.append(f"{end_date} 23:59:59")

        if store_id:
            filtros.append("s.store_id = %s")
            params.append(store_id)

        if channel_id:
            filtros.append("s.channel_id = %s")
            params.append(channel_id)

        where_clause = "WHERE " + " AND ".join(filtros) if filtros else ""

        # KPIs principais
        kpis_sql = f"""
            SELECT
                COUNT(*)::int AS total_pedidos,
                COALESCE(SUM(s.total_amount), 0)::numeric AS faturamento_total,
                COALESCE(ROUND(AVG(s.total_amount)::numeric, 2), 0) AS ticket_medio,
                COALESCE(ROUND(
                    SUM(CASE WHEN s.sale_status_desc = 'CANCELLED' THEN 1 ELSE 0 END)::numeric * 100.0 / NULLIF(COUNT(*), 0),
                2), 0) AS taxa_cancelamento
            FROM sales s
            {where_clause};
        """
        cursor.execute(kpis_sql, tuple(params))
        kpis_row = cursor.fetchone()
        kpis = {
            "total_pedidos": int(kpis_row[0]),
            "faturamento_total": float(kpis_row[1]),
            "ticket_medio": float(kpis_row[2]),
            "taxa_cancelamento": float(kpis_row[3]),
        }

        # Tendência de faturamento diário
        tendencia_sql = f"""
            SELECT 
                DATE(s.created_at) AS data, 
                COALESCE(SUM(s.total_amount), 0)::numeric AS faturamento
            FROM sales s
            {where_clause}
            GROUP BY DATE(s.created_at)
            ORDER BY data;
        """
        cursor.execute(tendencia_sql, tuple(params))
        tendencia_rows = cursor.fetchall()
        tendencia = [
            {"data": str(r[0]), "faturamento": float(r[1])} for r in tendencia_rows
        ]

        # Top produtos
        top_produtos_sql = f"""
            SELECT 
                p.name AS produto,
                SUM(ps.quantity)::int AS quantidade,
                COALESCE(SUM(ps.total_price), 0)::numeric AS receita
            FROM product_sales ps
            JOIN products p ON ps.product_id = p.id
            JOIN sales s ON ps.sale_id = s.id
            {where_clause}
            GROUP BY p.name
            ORDER BY receita DESC
            LIMIT 5;
        """
        cursor.execute(top_produtos_sql, tuple(params))
        top_produtos_rows = cursor.fetchall()
        top_produtos = [
            {"produto": r[0], "quantidade": int(r[1]), "receita": float(r[2])}
            for r in top_produtos_rows
        ]

        # Faturamento por loja
        faturamento_lojas_sql = f"""
            SELECT 
                st.name AS loja,
                COALESCE(SUM(s.total_amount), 0)::numeric AS receita
            FROM sales s
            JOIN stores st ON s.store_id = st.id
            {where_clause}
            GROUP BY st.name
            ORDER BY receita DESC;
        """
        cursor.execute(faturamento_lojas_sql, tuple(params))
        faturamento_lojas_rows = cursor.fetchall()
        faturamento_lojas = [
            {"loja": r[0], "receita": float(r[1])} for r in faturamento_lojas_rows
        ]

        return {
            "kpis": kpis,
            "tendencia": tendencia,
            "top_produtos": top_produtos,
            "faturamento_lojas": faturamento_lojas,
        }

    finally:
        cursor.close()
        conn.close()
