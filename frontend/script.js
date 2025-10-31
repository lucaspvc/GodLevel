async function carregarDashboard() {
    try {
        const response = await fetch("http://127.0.0.1:8000/dashboard/overview");
        const data = await response.json();

        // Renderiza KPIs
        const kpisDiv = document.getElementById("kpis");
        const kpis = data.kpis;
        const cards = [
            { title: "💰 Faturamento Total", value: `R$ ${kpis.faturamento_total.toFixed(2)}` },
            { title: "🧾 Total de Pedidos", value: kpis.total_pedidos },
            { title: "💸 Ticket Médio", value: `R$ ${kpis.ticket_medio.toFixed(2)}` },
            { title: "❌ Taxa de Cancelamento", value: `${kpis.taxa_cancelamento.toFixed(2)}%` },
        ];
        kpisDiv.innerHTML = cards.map(c => `
            <div class="bg-white p-4 rounded-lg shadow text-center">
                <h3 class="text-sm text-gray-500">${c.title}</h3>
                <p class="text-xl font-semibold">${c.value}</p>
            </div>
        `).join("");

        // Gráfico de tendência
        const ctx = document.getElementById("chartTendencia").getContext("2d");
        const labels = data.tendencia.map(t => t.data);
        const valores = data.tendencia.map(t => t.faturamento);

        new Chart(ctx, {
            type: "line",
            data: {
                labels: labels,
                datasets: [{
                    label: "Faturamento Diário",
                    data: valores,
                    fill: true,
                    borderColor: "#3b82f6",
                    backgroundColor: "rgba(59,130,246,0.2)",
                    tension: 0.3,
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: { title: { display: true, text: "Data" } },
                    y: { title: { display: true, text: "R$" } }
                }
            }
        });

        // Top Produtos
        const tbodyProdutos = document.getElementById("tabelaProdutos");
        tbodyProdutos.innerHTML = data.top_produtos.map(p => `
            <tr class="border-b">
                <td>${p.produto}</td>
                <td>${p.quantidade}</td>
                <td>R$ ${p.receita.toFixed(2)}</td>
            </tr>
        `).join("");

        // Faturamento por Loja
        const tbodyLojas = document.getElementById("tabelaLojas");
        tbodyLojas.innerHTML = data.faturamento_lojas.map(l => `
            <tr class="border-b">
                <td>${l.loja}</td>
                <td>R$ ${l.receita.toFixed(2)}</td>
            </tr>
        `).join("");

    } catch (err) {
        console.error("Erro ao carregar dashboard:", err);
        document.body.innerHTML = `<div class='p-10 text-center text-red-500'>Erro ao conectar à API</div>`;
    }
}

// Chama ao abrir a página
carregarDashboard();
