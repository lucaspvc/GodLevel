let currentPage = 1;
let totalPages = 1;
let currentUnidades = [];

const API_URL = "http://localhost:8000/units/overview"; // endpoint genérico

function formatCurrency(v) {
    const valor = Number(v) || 0;
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}


function montarQueryParams() {
    const dataInicio = document.getElementById("dataInicio").value;
    const dataFim = document.getElementById("dataFim").value;
    const status = document.getElementById("filtroStatus").value;
    const canal = document.getElementById("filtroCanal").value;

    const params = new URLSearchParams();
    if (dataInicio) params.append("start_date", dataInicio);
    if (dataFim) params.append("end_date", dataFim);
    if (status) params.append("status", status);
    if (canal) params.append("canal", canal);
    params.append("page", currentPage);
    params.append("limit", 20);
    return params.toString();
}

async function carregarUnidades() {
    try {
        const res = await fetch(`${API_URL}?${montarQueryParams()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        // === KPIs ===
        const k = data.kpis;
        const kpisDiv = document.getElementById("kpisUnidades");
        const cards = [
            { title: "Total Unidades", value: k.total_unidades },
            { title: "Faturamento Total", value: formatCurrency(k.faturamento_total) },
            { title: "Ticket Médio Geral", value: formatCurrency(k.ticket_medio) },
            { title: "Unidades Ativas", value: k.unidades_ativas }
        ];
        kpisDiv.innerHTML = cards.map(c => `
            <div class="bg-white p-4 rounded-lg shadow text-center">
                <h3 class="text-sm text-gray-500">${c.title}</h3>
                <p class="text-xl font-semibold">${c.value}</p>
            </div>
        `).join("");

        // === TABELA ===
        currentUnidades = data.unidades || [];
        const tbody = document.getElementById("tabelaUnidades");
        tbody.innerHTML = currentUnidades.map(u => `
            <tr>
                <td class="px-2 py-1">${u.unidade}</td>
                <td class="px-2 py-1 text-center">${u.status}</td>
                <td class="px-2 py-1 text-right">${formatCurrency(u.faturamento)}</td>
                <td class="px-2 py-1 text-right">${formatCurrency(u.ticket_medio)}</td>
                <td class="px-2 py-1 text-right">${u.pedidos}</td>
                <td class="px-2 py-1 text-center">${u.ultima_venda}</td>
            </tr>
        `).join("");

        // === PAGINAÇÃO ===
        currentPage = data.pagina || 1;
        totalPages = data.total_paginas || 1;
        document.getElementById("pageInfo").innerText =
            `Página ${currentPage} de ${totalPages}`;

    } catch (err) {
        console.error("Erro ao carregar unidades:", err);
        alert("Erro ao carregar dados. Veja o console.");
    }
}

function setupEventListeners() {
    document.getElementById("btnFiltrar").addEventListener("click", () => {
        currentPage = 1;
        carregarUnidades();
    });

    document.getElementById("prevPage").addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            carregarUnidades();
        }
    });

    document.getElementById("nextPage").addEventListener("click", () => {
        if (currentPage < totalPages) {
            currentPage++;
            carregarUnidades();
        }
    });

    document.getElementById("btnExport").addEventListener("click", () => {
        exportCSV(currentUnidades);
    });
}

function exportCSV(rows) {
    if (!rows?.length) {
        alert("Nenhum dado disponível para exportar.");
        return;
    }
    const header = ["unidade", "status", "faturamento", "ticket_medio", "pedidos", "ultima_venda"];
    const csv = [
        header.join(","),
        ...rows.map(r => [
            `"${r.nome}"`,
            r.status,
            r.faturamento,
            r.ticket_medio,
            r.pedidos,
            r.ultima_venda,
        ].join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `unidades_pagina_${currentPage}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

window.addEventListener("load", () => {
    setupEventListeners();
    carregarUnidades();
});
