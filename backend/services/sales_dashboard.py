from connection import conecta
import math

def get_dashboard_sales(
    start_date=None, end_date=None,
    store_id=None, channel_id=None,
    weekday=None, start_hour=None, end_hour=None,
    page=1, limit=20
):
    conn = conecta()
    cursor = conn.cursor()

    try:
        
        # Filtros dinâmicos
        filtros = []
        params = []

        if start_date and end_date:
            filtros.append("s.created_at BETWEEN %s AND %s")
            params += [f"{start_date} 00:00:00", f"{end_date} 23:59:59"]

        if store_id:
            filtros.append("s.store_id = %s")
            params.append(store_id)

        if channel_id:
            filtros.append("s.channel_id = %s")
            params.append(channel_id)

        if weekday is not None:
            filtros.append("EXTRACT(DOW FROM s.created_at) = %s")
            params.append(weekday)

        if start_hour is not None:
            filtros.append("EXTRACT(HOUR FROM s.created_at) >= %s")
            params.append(start_hour)

        if end_hour is not None:
            filtros.append("EXTRACT(HOUR FROM s.created_at) <= %s")
            params.append(end_hour)

        where_clause = f"WHERE {' AND '.join(filtros)}" if filtros else ""

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
        total_pedidos, faturamento_total, ticket_medio, taxa_cancelamento = cursor.fetchone()

        kpis = {
            "total_pedidos": int(total_pedidos or 0),
            "faturamento_total": float(faturamento_total or 0),
            "ticket_medio": float(ticket_medio or 0),
            "taxa_cancelamento": float(taxa_cancelamento or 0),
        }

        # Faturamento diário (timeseries)
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
        faturamento_diario = [
            {"data": str(r[0]), "faturamento": float(r[1])} for r in cursor.fetchall()
        ]

        # Vendas por canal
        canais_sql = f"""
            SELECT
                COALESCE(ch.name, 'Desconhecido') AS canal,
                COUNT(*)::int AS total
            FROM sales s
            LEFT JOIN channels ch ON s.channel_id = ch.id
            {where_clause}
            GROUP BY ch.name
            ORDER BY total DESC;
        """
        cursor.execute(canais_sql, tuple(params))
        vendas_por_canal = [
            {"canal": canal, "total": int(total)}
            for canal, total in cursor.fetchall()
        ]

        # Paginação
        count_sql = f"SELECT COUNT(*) FROM sales s {where_clause};"
        cursor.execute(count_sql, tuple(params))
        total_registros = cursor.fetchone()[0]
        total_paginas = math.ceil(total_registros / limit) if limit else 1
        offset = (page - 1) * limit

        # Lista de pedidos
        pedidos_sql = f"""
            SELECT
                s.id,
                s.created_at,
                COALESCE(NULLIF(TRIM(c.customer_name), ''), 'Cliente não identificado') AS cliente,
                COALESCE(st.name, '') AS loja,
                COALESCE(ch.name, '') AS canal,
                COALESCE(s.total_amount, 0)::numeric AS valor,
                COALESCE(s.sale_status_desc, '') AS status
            FROM sales s
            LEFT JOIN customers c ON s.customer_id = c.id
            LEFT JOIN stores st ON s.store_id = st.id
            LEFT JOIN channels ch ON s.channel_id = ch.id
            {where_clause}
            ORDER BY s.created_at DESC
            LIMIT %s OFFSET %s;
        """
        cursor.execute(pedidos_sql, tuple(params) + (limit, offset))
        pedidos = [
            {
                "id": int(r[0]),
                "data": str(r[1]).split('.')[0] if r[1] else None,
                "cliente": r[2],
                "loja": r[3],
                "canal": r[4],
                "valor": float(r[5]),
                "status": r[6],
            }
            for r in cursor.fetchall()
        ]

        # Vendas por dia da semana
        semana_sql = f"""
            SELECT 
                TO_CHAR(s.created_at, 'Day') AS dia_semana,
                TO_CHAR(s.created_at, 'D')::int AS ordem_semana,
                COUNT(*)::int AS total_pedidos,
                COALESCE(SUM(s.total_amount), 0)::numeric AS faturamento
            FROM sales s
            {where_clause}
            GROUP BY dia_semana, ordem_semana
            ORDER BY ordem_semana;
        """
        cursor.execute(semana_sql, tuple(params))
        vendas_por_dia = [
            {
                "dia": r[0].strip(),
                "total": int(r[2]),
                "faturamento": float(r[3])
            }
            for r in cursor.fetchall()
        ]

        # Vendas por hora
        hora_sql = f"""
            SELECT 
                DATE_TRUNC('hour', s.created_at) AS hora,
                COUNT(*)::int AS total,
                COALESCE(SUM(s.total_amount), 0)::numeric AS faturamento
            FROM sales s
            {where_clause}
            GROUP BY 1
            ORDER BY hora;
        """
        cursor.execute(hora_sql, tuple(params))
        vendas_por_hora = [
            {
                "hora": str(r[0]).split('.')[0] if r[0] else None,
                "total": int(r[1]),
                "faturamento": float(r[2]),
            }
            for r in cursor.fetchall()
        ]

        # Retorno final
        return {
            "kpis": kpis,
            "faturamento_diario": faturamento_diario,
            "vendas_por_canal": vendas_por_canal,
            "pedidos": pedidos,
            "pagina": page,
            "total_paginas": total_paginas,
            "total_registros": total_registros,
            "vendas_por_dia_semana": vendas_por_dia,
            "vendas_por_horario": vendas_por_hora,
        }

    finally:
        cursor.close()
        conn.close()
