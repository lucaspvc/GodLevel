let currentPage = 1;
let totalPages = 1;
let currentPedidos = []; // para export CSV
let graficoFaturamento = null;
let graficoCanais = null;

const API_BASE = "http://127.0.0.1:8000/dashboard/sales";

function formatCurrency(v) {
    return `R$ ${Number(v).toFixed(2)}`;
}

async function popularFiltros() {
    try {
        // Lojas
        const resLojas = await fetch("http://127.0.0.1:8000/filtros/lojas");
        const lojas = await resLojas.json();
        const filtroLoja = document.getElementById("filtroLoja");
        lojas.forEach(l => {
            const opt = document.createElement("option");
            opt.value = l.id;
            opt.textContent = l.nome;
            filtroLoja.appendChild(opt);
        });

        // Canais
        const resCanais = await fetch("http://127.0.0.1:8000/filtros/canais");
        const canais = await resCanais.json();
        const filtroCanal = document.getElementById("filtroCanal");
        canais.forEach(c => {
            const opt = document.createElement("option");
            opt.value = c.id;
            opt.textContent = c.nome;
            filtroCanal.appendChild(opt);
        });
    } catch (err) {
        console.error("Erro ao carregar filtros:", err);
    }
}


function montarQueryParams() {
    const dataInicio = document.getElementById("dataInicio").value;
    const dataFim = document.getElementById("dataFim").value;
    const loja = document.getElementById("filtroLoja").value;
    const canal = document.getElementById("filtroCanal").value;
    const diaSemana = document.getElementById("filtroDiaSemana").value;
    const horario = document.getElementById("filtroHorario").value;

    const params = new URLSearchParams();
    if (dataInicio) params.append("start_date", dataInicio);
    if (dataFim) params.append("end_date", dataFim);
    if (loja) params.append("store_id", loja);
    if (canal) params.append("channel_id", canal);
    if (diaSemana) params.append("weekday", diaSemana); // Ex: 1 = Segunda, 7 = Domingo

    // Horários podem ser enviados como 18:00-23:00 ou como start_hour / end_hour
    if (horario) {
        const [start, end] = horario.split("-"); // agora são números válidos
        params.append("start_hour", start);
        params.append("end_hour", end);
    }

    params.append("page", currentPage);
    params.append("limit", 20);
    return params.toString();
}


async function carregarVendas() {
    try {
        const qs = montarQueryParams();
        const res = await fetch(`${API_BASE}?${qs}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        // KPIs
        const kpisDiv = document.getElementById("kpisVendas");
        const k = data.kpis;
        const cards = [
            { title: "Total Pedidos", value: k.total_pedidos },
            { title: "Faturamento Total", value: formatCurrency(k.faturamento_total) },
            { title: "Ticket Médio", value: formatCurrency(k.ticket_medio) },
            { title: "Taxa Cancelamento", value: `${k.taxa_cancelamento}%` },
        ];
        kpisDiv.innerHTML = cards.map(c => `
            <div class="bg-white p-4 rounded-lg shadow text-center">
                <h3 class="text-sm text-gray-500">${c.title}</h3>
                <p class="text-xl font-semibold">${c.value}</p>
            </div>
        `).join("");

        // Faturamento diário (Chart.js)
        const labels = data.faturamento_diario.map(d => d.data);
        const values = data.faturamento_diario.map(d => d.faturamento);

        const ctx1 = document.getElementById("graficoFaturamento").getContext("2d");
        if (graficoFaturamento) graficoFaturamento.destroy();
        graficoFaturamento = new Chart(ctx1, {
            type: "line",
            data: {
                labels,
                datasets: [{
                    label: "Faturamento",
                    data: values,
                    fill: true,
                    borderColor: "#3b82f6",
                    backgroundColor: "rgba(59,130,246,0.15)",
                    tension: 0.3
                }]
            },
            options: {
                plugins: { legend: { display: false } },
                scales: {
                    x: { title: { display: true, text: "Data" } },
                    y: { title: { display: true, text: "R$" } }
                }
            }
        });

        // Vendas por canal (horizontal bar)
        const canais = data.vendas_por_canal.map(c => c.canal);
        const canaisValues = data.vendas_por_canal.map(c => c.total);
        const ctx2 = document.getElementById("graficoCanais").getContext("2d");
        if (graficoCanais) graficoCanais.destroy();
        graficoCanais = new Chart(ctx2, {
            type: "bar",
            data: {
                labels: canais,
                datasets: [{
                    label: "Vendas",
                    data: canaisValues,
                    borderRadius: 4,
                    barThickness: 24
                }]
            },
            options: {
                plugins: { legend: { display: false } },
                indexAxis: 'x',
                scales: {
                    x: { title: { display: true, text: "Canal" } },
                    y: { title: { display: true, text: "Quantidade" } }
                }
            }
        });

        // Tabela de pedidos
        currentPedidos = data.pedidos || [];
        const tbody = document.getElementById("tabelaPedidos");
        tbody.innerHTML = currentPedidos.map(p => `
            <tr class="border-b">
                <td class="px-2 py-1">${p.id}</td>
                <td class="px-2 py-1">${p.data}</td>
                <td class="px-2 py-1">${p.cliente}</td>
                <td class="px-2 py-1">${p.loja}</td>
                <td class="px-2 py-1">${p.canal}</td>
                <td class="px-2 py-1 text-right">${formatCurrency(p.valor)}</td>
                <td class="px-2 py-1">${p.status}</td>
            </tr>
        `).join("");

        // Paginação
        currentPage = data.pagina || 1;
        totalPages = data.total_paginas || 1;
        document.getElementById("pageInfo").innerText = `Página ${currentPage} de ${totalPages} — ${data.total_registros || 0} registros`;

    } catch (err) {
        console.error("Erro ao carregar vendas:", err);
        alert("Erro ao carregar dados. Veja o console para detalhes.");
    }
}

function setupEventListeners() {
    document.getElementById("btnFiltrar").addEventListener("click", () => {
        currentPage = 1;
        carregarVendas();
    });

    document.getElementById("prevPage").addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage -= 1;
            carregarVendas();
        }
    });

    document.getElementById("nextPage").addEventListener("click", () => {
        if (currentPage < totalPages) {
            currentPage += 1;
            carregarVendas();
        }
    });

    document.getElementById("btnExport").addEventListener("click", () => {
        exportCSV(currentPedidos);
    });
}

function exportCSV(rows) {
    if (!rows || rows.length === 0) {
        alert("Nenhum pedido para exportar na página atual.");
        return;
    }
    const header = ["id", "data", "cliente", "loja", "canal", "valor", "status"];
    const csv = [
        header.join(","),
        ...rows.map(r => [
            r.id,
            `"${r.data}"`,
            `"${(r.cliente || "").replace(/"/g, '""')}"`,
            `"${(r.loja || "").replace(/"/g, '""')}"`,
            `"${(r.canal || "").replace(/"/g, '""')}"`,
            r.valor,
            `"${(r.status || "").replace(/"/g, '""')}"`
        ].join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `pedidos_pagina_${currentPage}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

window.addEventListener("load", () => {
    popularFiltros();
    setupEventListeners();
    carregarVendas();
});
