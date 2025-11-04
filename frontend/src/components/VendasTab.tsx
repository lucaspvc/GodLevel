import { useEffect } from "react";
import FilterActionButtons from "./FilterActionButtons";
import Chart from "chart.js/auto";

// Tipos auxiliares
interface KPIData {
  total_pedidos: number;
  faturamento_total: number;
  ticket_medio: number;
  taxa_cancelamento: number;
}

interface FaturamentoDiario {
  data: string;
  faturamento: number;
}

interface VendaPorCanal {
  canal: string;
  total: number;
}

interface Pedido {
  id: number;
  data: string;
  loja: string;
  canal: string;
  valor: number;
  status: string;
}

interface DashboardResponse {
  kpis: KPIData;
  faturamento_diario: FaturamentoDiario[];
  vendas_por_canal: VendaPorCanal[];
  pedidos: Pedido[];
  pagina: number;
  total_paginas: number;
  total_registros: number;
}

const VendasTab: React.FC = () => {
  useEffect(() => {
    let currentPage = 1;
    let totalPages = 1;
    let currentPedidos: Pedido[] = [];
    let graficoFaturamento: Chart | null = null;
    let graficoCanais: Chart | null = null;

    const API_BASE = "http://127.0.0.1:8000/dashboard/sales";
    const controller = new AbortController(); // ✅ para cancelar o fetch

    const formatCurrency = (v: number) =>
      (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    async function popularFiltros() {
      try {
        const resLojas = await fetch("http://127.0.0.1:8000/filtros/lojas", { signal: controller.signal });
        const lojas = await resLojas.json();
        const filtroLoja = document.getElementById("filtroLoja") as HTMLSelectElement;
        lojas.forEach((l: any) => {
          const opt = document.createElement("option");
          opt.value = l.id;
          opt.textContent = l.nome;
          filtroLoja.appendChild(opt);
        });

        const resCanais = await fetch("http://127.0.0.1:8000/filtros/canais", { signal: controller.signal });
        const canais = await resCanais.json();
        const filtroCanal = document.getElementById("filtroCanal") as HTMLSelectElement;
        canais.forEach((c: any) => {
          const opt = document.createElement("option");
          opt.value = c.id;
          opt.textContent = c.nome;
          filtroCanal.appendChild(opt);
        });
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Erro ao carregar filtros:", err);
        }
      }
    }

    function montarQueryParams() {
      const dataInicio = (document.getElementById("dataInicio") as HTMLInputElement)?.value;
      const dataFim = (document.getElementById("dataFim") as HTMLInputElement)?.value;
      const loja = (document.getElementById("filtroLoja") as HTMLSelectElement)?.value;
      const canal = (document.getElementById("filtroCanal") as HTMLSelectElement)?.value;
      const diaSemana = (document.getElementById("filtroDiaSemana") as HTMLSelectElement)?.value;
      const horario = (document.getElementById("filtroHorario") as HTMLSelectElement)?.value;

      const params = new URLSearchParams();
      if (dataInicio) params.append("start_date", dataInicio);
      if (dataFim) params.append("end_date", dataFim);
      if (loja) params.append("store_id", loja);
      if (canal) params.append("channel_id", canal);
      if (diaSemana) params.append("weekday", diaSemana);

      if (horario) {
        const [start, end] = horario.split("-");
        params.append("start_hour", start);
        params.append("end_hour", end);
      }

      params.append("page", currentPage.toString());
      params.append("limit", "20");
      return params.toString();
    }

    async function carregarVendas() {
      try {
        const qs = montarQueryParams();
        const res = await fetch(`${API_BASE}?${qs}`, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: DashboardResponse = await res.json();

        // KPIs
        const kpisDiv = document.getElementById("kpisVendas") as HTMLDivElement;
        if (!kpisDiv) return;
        const k = data.kpis;
        const cards = [
          { title: "Total Pedidos", value: k.total_pedidos },
          { title: "Faturamento Total", value: formatCurrency(k.faturamento_total) },
          { title: "Ticket Médio", value: formatCurrency(k.ticket_medio) },
          { title: "Taxa Cancelamento", value: `${k.taxa_cancelamento}%` },
        ];
        kpisDiv.innerHTML = cards
          .map(
            (c) => `
            <div class="bg-white p-4 rounded-lg shadow text-center">
              <h3 class="text-sm text-gray-500">${c.title}</h3>
              <p class="text-xl font-semibold">${c.value}</p>
            </div>`
          )
          .join("");

        // Gráfico 1 — Faturamento diário
        const ctx1 = (document.getElementById("chartFaturamento") as HTMLCanvasElement)?.getContext("2d");
        if (graficoFaturamento) graficoFaturamento.destroy();
        if (ctx1) {
          graficoFaturamento = new Chart(ctx1, {
            type: "line",
            data: {
              labels: data.faturamento_diario.map((d) => d.data),
              datasets: [
                {
                  label: "Faturamento",
                  data: data.faturamento_diario.map((d) => d.faturamento),
                  fill: true,
                  borderColor: "#3b82f6",
                  backgroundColor: "rgba(59,130,246,0.15)",
                  tension: 0.3,
                },
              ],
            },
            options: {
              plugins: { legend: { display: false } },
              scales: {
                x: { title: { display: true, text: "Data" } },
                y: { title: { display: true, text: "R$" } },
              },
            },
          });
        }

        // Gráfico 2 — Vendas por canal
        const ctx2 = (document.getElementById("chartCanais") as HTMLCanvasElement)?.getContext("2d");
        if (graficoCanais) graficoCanais.destroy();
        if (ctx2) {
          graficoCanais = new Chart(ctx2, {
            type: "bar",
            data: {
              labels: data.vendas_por_canal.map((c) => c.canal),
              datasets: [
                {
                  label: "Vendas",
                  data: data.vendas_por_canal.map((c) => c.total),
                  borderRadius: 4,
                  barThickness: 24,
                },
              ],
            },
            options: {
              plugins: { legend: { display: false } },
              indexAxis: "x",
              scales: {
                x: { title: { display: true, text: "Canal" } },
                y: { title: { display: true, text: "Quantidade" } },
              },
            },
          });
        }

        // Tabela
        currentPedidos = data.pedidos || [];
        const tbody = document.getElementById("tabelaPedidos") as HTMLTableSectionElement;
        if (tbody) {
          tbody.innerHTML = currentPedidos
            .map(
              (p) => `
              <tr class="border-b">
                <td class="px-2 py-1">${p.id}</td>
                <td class="px-2 py-1">${p.data}</td>
                <td class="px-2 py-1">${p.loja}</td>
                <td class="px-2 py-1">${p.canal}</td>
                <td class="px-2 py-1 text-right">${formatCurrency(p.valor)}</td>
                <td class="px-2 py-1">${p.status}</td>
              </tr>`
            )
            .join("");
        }

        // Paginação
        currentPage = data.pagina || 1;
        totalPages = data.total_paginas || 1;
        const pageInfo = document.getElementById("pageInfo") as HTMLSpanElement;
        if (pageInfo)
          pageInfo.innerText = `Página ${currentPage} de ${totalPages} — ${data.total_registros || 0} registros`;
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Erro ao carregar vendas:", err);
          alert("Erro ao carregar dados. Veja o console para detalhes.");
        }
      }
    }

    function exportCSV(rows: Pedido[]) {
      if (!rows || rows.length === 0) {
        alert("Nenhum pedido para exportar na página atual.");
        return;
      }
      const header = ["id", "data", "loja", "canal", "valor", "status"];
      const csv = [
        header.join(","),
        ...rows.map((r) =>
          [r.id, `"${r.data}"`, `"${r.loja}"`, `"${r.canal}"`, r.valor, `"${r.status}"`].join(",")
        ),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `pedidos_pagina_${currentPage}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    function setupEventListeners() {
      (document.getElementById("btnFiltrar") as HTMLElement)?.addEventListener("click", () => {
        currentPage = 1;
        carregarVendas();
      });

      (document.getElementById("btnPrev") as HTMLElement)?.addEventListener("click", () => {
        if (currentPage > 1) {
          currentPage -= 1;
          carregarVendas();
        }
      });

      (document.getElementById("btnNext") as HTMLElement)?.addEventListener("click", () => {
        if (currentPage < totalPages) {
          currentPage += 1;
          carregarVendas();
        }
      });

      (document.getElementById("btnExport") as HTMLElement)?.addEventListener("click", () => {
        exportCSV(currentPedidos);
      });
    }

    (window as any).carregarVendas = carregarVendas;
    (window as any).exportarPedidos = () => exportCSV(currentPedidos);

    popularFiltros();
    setupEventListeners();
    carregarVendas();

    return () => {
      controller.abort();
      graficoFaturamento?.destroy();
      graficoCanais?.destroy();
    };
  }, []);

  // 👇 Aqui está o ponto crucial:
  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-center">📈 Vendas & Faturamento</h1>

      {/* FILTROS */}
      <div className="bg-card shadow-lg rounded-lg p-4 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        <input type="date" id="dataInicio" className="border p-2 rounded" />
        <input type="date" id="dataFim" className="border p-2 rounded" />
        <select id="filtroLoja" className="border p-2 rounded">
          <option value="">Todas as lojas</option>
        </select>
        <select id="filtroCanal" className="border p-2 rounded">
          <option value="">Todos os canais</option>
        </select>
        <select id="filtroDiaSemana" className="border p-2 rounded">
          <option value="">Todos os dias</option>
          <option value="1">Segunda</option>
          <option value="2">Terça</option>
          <option value="3">Quarta</option>
          <option value="4">Quinta</option>
          <option value="5">Sexta</option>
          <option value="6">Sábado</option>
          <option value="0">Domingo</option>
        </select>
        <select id="filtroHorario" className="border p-2 rounded">
          <option value="">Todos os horários</option>
          <option value="6-11">06h - 12h (Manhã)</option>
          <option value="12-14">12h - 15h (Almoço)</option>
          <option value="15-17">15h - 18h (Tarde)</option>
          <option value="18-22">18h - 23h (Noite)</option>
        </select>

        {/* ✅ Agora o botão Aplicar chama a função global */}
        <FilterActionButtons
          onApply={() => (window as any).carregarVendas()}
          onExport={() => (window as any).exportarPedidos()}
        />
      </div>


      {/* KPIs */}
      <div id="kpisVendas" className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"></div>

      {/* GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-card rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold mb-2">Faturamento Diário</h2>
          <canvas id="chartFaturamento" height="150"></canvas>
        </div>
        <div className="bg-card rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold mb-2">Vendas por Canal</h2>
          <canvas id="chartCanais" height="150"></canvas>
        </div>
      </div>

      {/* TABELA */}
      <div className="bg-card shadow-lg rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Pedidos</h2>
          <button
            id="btnExport"
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Exportar CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-2 py-2">ID</th>
                <th className="px-2 py-2">Data</th>
                <th className="px-2 py-2">Loja</th>
                <th className="px-2 py-2">Canal</th>
                <th className="px-2 py-2 text-right">Valor</th>
                <th className="px-2 py-2">Status</th>
              </tr>
            </thead>
            <tbody id="tabelaPedidos"></tbody>
          </table>
        </div>

        {/* PAGINAÇÃO */}
        <div className="flex justify-between items-center mt-4">
          <button id="btnPrev" className="bg-muted text-foreground px-4 py-2 rounded hover:bg-muted/80">
            ← Anterior
          </button>
          <span id="pageInfo" className="text-sm text-muted-foreground"></span>
          <button id="btnNext" className="bg-muted text-foreground px-4 py-2 rounded hover:bg-muted/80">
            Próxima →
          </button>
        </div>
      </div>
    </div>
  );
};

export default VendasTab;
