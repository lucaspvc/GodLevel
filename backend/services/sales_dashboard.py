from connection import conecta
import math

def get_dashboard_sales(start_date=None, end_date=None,
                        store_id=None, channel_id=None,
                        weekday=None, start_hour=None, end_hour=None,
                        page=1, limit=20):
    conn = conecta()
    cursor = conn.cursor()

    try:
        filtros = []
        params = []

        # Filtro por intervalo de datas
        if start_date and end_date:
            filtros.append("s.created_at BETWEEN %s AND %s")
            params.append(f"{start_date} 00:00:00")
            params.append(f"{end_date} 23:59:59")

        # Filtro por loja
        if store_id:
            filtros.append("s.store_id = %s")
            params.append(store_id)

        # Filtro por canal
        if channel_id:
            filtros.append("s.channel_id = %s")
            params.append(channel_id)

        # Filtro por dia da semana (0=domingo, 1=segunda ...)
        if weekday is not None:
            filtros.append("EXTRACT(DOW FROM s.created_at) = %s")
            params.append(weekday)

        # Filtro por faixa de horário (ex: 18 = 18h)
        if start_hour is not None:
            filtros.append("EXTRACT(HOUR FROM s.created_at) >= %s")
            params.append(start_hour)

        if end_hour is not None:
            filtros.append("EXTRACT(HOUR FROM s.created_at) <= %s")
            params.append(end_hour)

        where_clause = "WHERE " + " AND ".join(filtros) if filtros else ""


        # 1) KPIs
        kpis_sql = f"""
            SELECT
                COUNT(*)::int AS total_pedidos,
                COALESCE(SUM(s.total_amount),0)::numeric AS faturamento_total,
                COALESCE(ROUND(AVG(s.total_amount)::numeric,2),0) AS ticket_medio,
                COALESCE(ROUND(
                    SUM(CASE WHEN s.sale_status_desc = 'CANCELLED' THEN 1 ELSE 0 END)::numeric * 100.0 / NULLIF(COUNT(*),0)
                ,2),0) AS taxa_cancelamento
            FROM sales s
            {where_clause};
        """
        cursor.execute(kpis_sql, tuple(params))
        kpis_row = cursor.fetchone()
        kpis = {
            "total_pedidos": int(kpis_row[0]),
            "faturamento_total": float(kpis_row[1]) if kpis_row[1] is not None else 0.0,
            "ticket_medio": float(kpis_row[2]) if kpis_row[2] is not None else 0.0,
            "taxa_cancelamento": float(kpis_row[3]) if kpis_row[3] is not None else 0.0,
        }

        # 2) Faturamento diário (timeseries)
        tendencia_sql = f"""
            SELECT
                DATE(s.created_at) AS data,
                COALESCE(SUM(s.total_amount),0) AS faturamento
            FROM sales s
            {where_clause}
            GROUP BY DATE(s.created_at)
            ORDER BY data;
        """
        cursor.execute(tendencia_sql, tuple(params))
        tendencia_rows = cursor.fetchall()
        faturamento_diario = [
            {"data": str(r[0]), "faturamento": float(r[1])} for r in tendencia_rows
        ]

        # 3) Vendas por canal
        canais_sql = f"""
            SELECT
                ch.name AS canal,
                COUNT(*)::int AS total
            FROM sales s
            LEFT JOIN channels ch ON s.channel_id = ch.id
            {where_clause}
            GROUP BY ch.name
            ORDER BY total DESC;
        """
        cursor.execute(canais_sql, tuple(params))
        canais_rows = cursor.fetchall()
        vendas_por_canal = [
            {"canal": (r[0] if r[0] is not None else "Desconhecido"), "total": int(r[1])}
            for r in canais_rows
        ]

        # 4) Paginação
        count_sql = f"SELECT COUNT(*) FROM sales s {where_clause};"
        cursor.execute(count_sql, tuple(params))
        total_count = cursor.fetchone()[0]
        total_pages = math.ceil(total_count / limit) if limit else 1
        offset = (page - 1) * limit

        # 5) Lista de pedidos
        pedidos_sql = f"""
            SELECT
                s.id,
                s.created_at,
                CASE 
                    WHEN c.customer_name IS NULL OR TRIM(c.customer_name) = '' THEN 'Cliente não identificado'
                    ELSE c.customer_name
                END AS customer,
                COALESCE(st.name, '') AS store,
                COALESCE(ch.name, '') AS channel,
                COALESCE(s.total_amount,0)::numeric AS valor,
                COALESCE(s.sale_status_desc, '') AS status
            FROM sales s
            LEFT JOIN customers c ON s.customer_id = c.id
            LEFT JOIN stores st ON s.store_id = st.id
            LEFT JOIN channels ch ON s.channel_id = ch.id
            {where_clause}
            ORDER BY s.created_at DESC
            LIMIT %s OFFSET %s;
        """
    
        pedidos_params = tuple(params) + (limit, offset)
        cursor.execute(pedidos_sql, pedidos_params)
        pedidos_rows = cursor.fetchall()
        pedidos = [
            {
                "id": int(r[0]),
                "data": str(r[1]),
                "cliente": r[2],
                "loja": r[3],
                "canal": r[4],
                "valor": float(r[5]),
                "status": r[6],
            } for r in pedidos_rows
        ]

        # 6) Vendas por dia da semana
        semana_sql = f"""
            SELECT 
                TO_CHAR(s.created_at, 'Day') AS dia_semana,
                TO_CHAR(s.created_at, 'D')::int AS ordem_semana,
                COUNT(*)::int AS total_pedidos,
                SUM(s.total_amount)::numeric AS faturamento
            FROM sales s
            {where_clause}
            GROUP BY dia_semana, ordem_semana
            ORDER BY ordem_semana;
        """
        cursor.execute(semana_sql, tuple(params))
        semana_rows = cursor.fetchall()
        vendas_por_dia = [
            { "dia": r[0].strip(), "total": int(r[1]), "faturamento": float(r[2]) }
            for r in semana_rows
        ]
        # 7) Vendas por hora
        hora_sql = f"""
            SELECT 
                DATE_TRUNC('hour', s.created_at) AS hora,
                COUNT(*)::int AS total,
                SUM(s.total_amount)::numeric AS faturamento
            FROM sales s
            {where_clause}
            GROUP BY 1
            ORDER BY hora;
        """
        cursor.execute(hora_sql, tuple(params))
        hora_rows = cursor.fetchall()
        vendas_por_hora = [
            { "hora": r[0].strftime("%H:%M"), "total": int(r[1]), "faturamento": float(r[2]) }
            for r in hora_rows
        ]



        return {
            "kpis": kpis,
            "faturamento_diario": faturamento_diario,
            "vendas_por_canal": vendas_por_canal,
            "pedidos": pedidos,
            "pagina": page,
            "total_paginas": total_pages,
            "total_registros": total_count,
            "vendas_por_dia_semana": vendas_por_dia,
            "vendas_por_horario": vendas_por_hora
        }

    finally:
        cursor.close()
        conn.close()
