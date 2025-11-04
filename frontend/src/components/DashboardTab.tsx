// src/pages/DashboardTab.tsx
import { useEffect, useRef, useState } from "react";
import Chart from "chart.js/auto";

interface DashboardData {
  kpis: {
    faturamento_total: number;
    total_pedidos: number;
    ticket_medio: number;
    taxa_cancelamento: number;
  };
  tendencia: { data: string; faturamento: number }[];
  top_produtos: { produto: string; quantidade: number; receita: number }[];
  faturamento_lojas: { loja: string; receita: number }[];
}

const DASHBOARD_API_URL = "http://127.0.0.1:8000/dashboard/overview";

export default function DashboardTab() {
  const [dados, setDados] = useState<DashboardData | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  const formatCurrency = (v: number) =>
    (Number(v) || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

  useEffect(() => {
    async function carregar() {
      try {
        const res = await fetch(DASHBOARD_API_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setDados(data);
        setErro(null);
      } catch (err) {
        console.error("Erro ao carregar dashboard:", err);
        setErro("Erro ao conectar à API. Verifique se o backend está em execução.");
      }
    }
    carregar();
  }, []);

  useEffect(() => {
    if (!dados || !chartRef.current) return;

    const labels = dados.tendencia.map((t) => t.data);
    const valores = dados.tendencia.map((t) => t.faturamento);

    if (chartInstance.current) chartInstance.current.destroy();

    chartInstance.current = new Chart(chartRef.current, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Faturamento Diário",
            data: valores,
            fill: true,
            borderColor: "#3b82f6",
            backgroundColor: "rgba(59,130,246,0.2)",
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { title: { display: true, text: "Data" } },
          y: { title: { display: true, text: "R$" } },
        },
      },
    });
  }, [dados]);

  if (erro) {
    return (
      <div className="p-10 text-center text-red-500">{erro}</div>
    );
  }

  const k = dados?.kpis;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-center">📋Dashboard Geral</h1>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <h3 className="text-sm text-gray-500">Faturamento Total</h3>
          <p className="text-xl font-semibold">
            {k ? formatCurrency(k.faturamento_total) : "—"}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <h3 className="text-sm text-gray-500">Total de Pedidos</h3>
          <p className="text-xl font-semibold">
            {k ? k.total_pedidos : "—"}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <h3 className="text-sm text-gray-500">Ticket Médio</h3>
          <p className="text-xl font-semibold">
            {k ? formatCurrency(k.ticket_medio) : "—"}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <h3 className="text-sm text-gray-500">Taxa de Cancelamento</h3>
          <p className="text-xl font-semibold">
            {k ? `${k.taxa_cancelamento.toFixed(2)}%` : "—"}
          </p>
        </div>
      </div>

      {/* Gráfico */}
      <div className="bg-card rounded-lg shadow-md p-4 mb-8">
        <h2 className="text-lg font-semibold mb-2">Tendência de Faturamento Diário</h2>
        <canvas ref={chartRef} height="100"></canvas>
      </div>

      {/* Tabelas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Produtos */}
        <div className="bg-card rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold mb-2">Top 5 Produtos</h2>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left">Produto</th>
                <th className="text-left">Qtd</th>
                <th className="text-left">Receita</th>
              </tr>
            </thead>
            <tbody>
              {dados?.top_produtos?.length ? (
                dados.top_produtos.map((p, i) => (
                  <tr key={i} className="border-b">
                    <td>{p.produto}</td>
                    <td>{p.quantidade}</td>
                    <td>{formatCurrency(p.receita)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="text-center text-gray-400 py-2">
                    —
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Lojas */}
        <div className="bg-card rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold mb-2">Faturamento por Loja</h2>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left">Loja</th>
                <th className="text-left">Receita</th>
              </tr>
            </thead>
            <tbody>
              {dados?.faturamento_lojas?.length ? (
                dados.faturamento_lojas.map((l, i) => (
                  <tr key={i} className="border-b">
                    <td>{l.loja}</td>
                    <td>{formatCurrency(l.receita)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} className="text-center text-gray-400 py-2">
                    —
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
