let currentPage = 1;
let totalPages = 1;

const DASHBOARD_API_URL = "http://127.0.0.1:8000/dashboard/overview";

function formatCurrency(v) {
    const valor = Number(v) || 0;
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

async function carregarDashboard() {
    try {
        const res = await fetch(DASHBOARD_API_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        // === KPIs ===
        const kpisDiv = document.getElementById("kpis");
        const k = data.kpis;
        const cards = [
            { title: "Faturamento Total", value: formatCurrency(k.faturamento_total) },
            { title: "Total de Pedidos", value: k.total_pedidos },
            { title: "Ticket Médio", value: formatCurrency(k.ticket_medio) },
            { title: "Taxa de Cancelamento", value: `${k.taxa_cancelamento.toFixed(2)}%` },
        ];
        kpisDiv.innerHTML = cards.map(c => `
            <div class="bg-white p-4 rounded-lg shadow text-center">
                <h3 class="text-sm text-gray-500">${c.title}</h3>
                <p class="text-xl font-semibold">${c.value}</p>
            </div>
        `).join("");

        //GRÁFICO DE TENDÊNCIA
        const ctx = document.getElementById("chartTendencia").getContext("2d");
        const labels = data.tendencia.map(t => t.data);
        const valores = data.tendencia.map(t => t.faturamento);

        new Chart(ctx, {
            type: "line",
            data: {
                labels,
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
                plugins: { legend: { display: false } },
                scales: {
                    x: { title: { display: true, text: "Data" } },
                    y: { title: { display: true, text: "R$" } }
                }
            }
        });

        // === TOP PRODUTOS ===
        const tbodyProdutos = document.getElementById("tabelaProdutos");
        tbodyProdutos.innerHTML = (data.top_produtos || []).map(p => `
            <tr class="border-b">
                <td>${p.produto}</td>
                <td>${p.quantidade}</td>
                <td>${formatCurrency(p.receita)}</td>
            </tr>
        `).join("");

        // === FATURAMENTO POR LOJA ===
        const tbodyLojas = document.getElementById("tabelaLojas");
        tbodyLojas.innerHTML = (data.faturamento_lojas || []).map(l => `
            <tr class="border-b">
                <td>${l.loja}</td>
                <td>${formatCurrency(l.receita)}</td>
            </tr>
        `).join("");

    } catch (err) {
        console.error("Erro ao carregar dashboard:", err);
        document.body.innerHTML = `
            <div class="p-10 text-center text-red-500">
                Erro ao conectar à API. Verifique se o backend está em execução.
            </div>
        `;
    }
}

// === Inicialização ===
window.addEventListener("load", () => {
    carregarDashboard();
});
