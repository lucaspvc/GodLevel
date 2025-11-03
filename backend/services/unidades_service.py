from connection import conecta
import math

def get_unidades_overview(page, limit, start_date=None, end_date=None, status=None, channel_id=None):
    conn = conecta()
    cursor = conn.cursor()

    try:
        filtros = []
        params = []

        # Filtro dinâmicos
        if start_date and end_date:
            filtros.append("s.created_at BETWEEN %s AND %s")
            params.append(f"{start_date} 00:00:00")
            params.append(f"{end_date} 23:59:59")

        if channel_id:
            filtros.append("s.channel_id = %s")
            params.append(channel_id)

        if status:
            filtros.append("st.is_active = %s")
            params.append(True if status.lower() == "ativa" else False)

        where_clause = "WHERE " + " AND ".join(filtros) if filtros else ""

        # KPIs gerais
        kpis_sql = f"""
            SELECT
                COUNT(DISTINCT st.id) AS total_unidades,
                COALESCE(SUM(s.total_amount), 0) AS faturamento_total,
                COALESCE(ROUND(AVG(s.total_amount), 2), 0) AS ticket_medio,
                COUNT(DISTINCT CASE WHEN st.is_active THEN st.id END) AS unidades_ativas
            FROM stores st
            LEFT JOIN sales s ON s.store_id = st.id
            {where_clause};
        """
        cursor.execute(kpis_sql, tuple(params))
        kpis_row = cursor.fetchone()
        kpis = {
            "total_unidades": int(kpis_row[0]),
            "faturamento_total": float(kpis_row[1]),
            "ticket_medio": float(kpis_row[2]),
            "unidades_ativas": int(kpis_row[3]),
        }

        # Paginação
        count_sql = "SELECT COUNT(*) FROM stores st;"
        cursor.execute(count_sql)
        total_registros = cursor.fetchone()[0]
        total_paginas = math.ceil(total_registros / limit) if limit else 1
        offset = (page - 1) * limit

        # Lista de unidades
        unidades_sql = f"""
            SELECT
                st.id,
                st.name,
                CASE WHEN st.is_active THEN 'Ativa' ELSE 'Inativa' END AS status,
                COALESCE(SUM(s.total_amount), 0) AS faturamento,
                COALESCE(ROUND(AVG(s.total_amount)::numeric, 2), 0) AS ticket_medio,
                COUNT(s.id) AS pedidos,
                MAX(s.created_at) AS ultima_venda
            FROM stores st
            LEFT JOIN sales s ON s.store_id = st.id
            {where_clause}
            GROUP BY st.id, st.name, st.is_active
            ORDER BY faturamento DESC
            LIMIT %s OFFSET %s;
        """
        cursor.execute(unidades_sql, tuple(params + [limit, offset]))
        unidades_rows = cursor.fetchall()

        unidades = [
            {
                "id": r[0],
                "unidade": r[1],
                "status": r[2],
                "faturamento": float(r[3]),
                "ticket_medio": float(r[4]),
                "pedidos": int(r[5]),
                "ultima_venda": str(r[6]).split('.')[0] if r[6] else None
            }
            for r in unidades_rows
        ]

        return {
            "kpis": kpis,
            "unidades": unidades,
            "pagina": page,
            "total_paginas": total_paginas,
            "total_registros": total_registros
        }

    finally:
        cursor.close()
        conn.close()
