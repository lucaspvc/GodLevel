import { useEffect, useState, useRef } from "react";
import { Chart } from "chart.js/auto";
import FilterActionButtons from "./FilterActionButtons";

const API_BASE = "http://127.0.0.1:8000/produtos/analitico";

const formatCurrency = (v: number) =>
  (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const ProdutosTab = () => {
  const chartRef = useRef<Chart | null>(null);

  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [loja, setLoja] = useState("");
  const [canal, setCanal] = useState("");
  const [categoria, setCategoria] = useState("");
  const [diaSemana, setDiaSemana] = useState("");
  const [horario, setHorario] = useState("");

  const [lojas, setLojas] = useState<any[]>([]);
  const [canais, setCanais] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);

  const [kpis, setKpis] = useState<any>(null);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);

  const [chartMix, setChartMix] = useState<Chart | null>(null);
  const [chartEvolucao, setChartEvolucao] = useState<Chart | null>(null);

  const montarQueryParams = () => {
    const params = new URLSearchParams();
    if (dataInicio) params.append("start_date", dataInicio);
    if (dataFim) params.append("end_date", dataFim);
    if (loja) params.append("store_id", loja);
    if (canal) params.append("channel_id", canal);
    if (categoria) params.append("category_id", categoria);
    if (diaSemana !== "") params.append("weekday", diaSemana);
    if (horario) {
      const [s, e] = horario.split("-").map(Number);
      if (!isNaN(s)) params.append("start_hour", s.toString());
      if (!isNaN(e)) params.append("end_hour", e.toString());
    }
    params.append("page", pagina.toString());
    params.append("limit", "20");
    return params.toString();
  };

  // === Fetch filtros ===
  const carregarFiltros = async () => {
    try {
      const [resLojas, resCanais, resCats] = await Promise.all([
        fetch("http://127.0.0.1:8000/filtros/lojas"),
        fetch("http://127.0.0.1:8000/filtros/canais"),
        fetch("http://127.0.0.1:8000/filtros/categorias"),
      ]);
      setLojas(await resLojas.json());
      setCanais(await resCanais.json());
      setCategorias(await resCats.json());
    } catch (err) {
      console.error("Erro ao carregar filtros:", err);
    }
  };

  // === Fetch produtos ===
  const carregarProdutos = async () => {
    try {
      const res = await fetch(`${API_BASE}?${montarQueryParams()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setKpis(data.kpis);
      setProdutos(data.produtos || []);
      setPagina(data.pagina || 1);
      setTotalPaginas(data.total_paginas || 1);
      setTotalRegistros(data.total_registros || 0);

      renderTopVendidos(data.top_vendidos || []);
      renderMix(data.mix_categorias || []);
      renderEvolucao(data.evolucao_vendas || []);
    } catch (err) {
      console.error("Erro ao carregar produtos:", err);
      alert("Erro ao carregar dados. Veja o console.");
    }
  };

  // === Export CSV ===
  const exportCSV = () => {
    if (!produtos.length) {
      alert("Nenhum produto para exportar.");
      return;
    }
    const header = [
      "produto",
      "categoria",
      "qtde",
      "faturamento",
      "custo",
      "margem_percentual",
      "margem_total",
    ];
    const csv = [
      header.join(","),
      ...produtos.map((r) =>
        [
          `"${(r.produto || "").replace(/"/g, '""')}"`,
          `"${(r.categoria || "").replace(/"/g, '""')}"`,
          r.qtde,
          r.faturamento,
          r.custo,
          r.margem_percentual,
          r.margem_total,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `produtos_pagina_${pagina}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // === Render charts ===
  const renderTopVendidos = (items: any[]) => {
    const ctx = document.getElementById("chartTopVendidos") as HTMLCanvasElement;
    if (!ctx) return;

    // ✅ Destrói o gráfico anterior se existir
    if (chartRef.current) {
      chartRef.current.destroy();
    }
    
    const newChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: items.map((i) => i.produto),
        datasets: [
          {
            label: "Unidades",
            data: items.map((i) => i.qtde),
            borderRadius: 6,
            barThickness: 18,
          },
        ],
      },
      options: {
        plugins: { legend: { display: false } },
        indexAxis: "y",
        scales: {
          x: { title: { display: true, text: "Unidades" } },
        },
      },
    });

    chartRef.current = newChart;
  };

  const renderMix = (items: any[]) => {
    const ctx = document.getElementById("chartMix") as HTMLCanvasElement;
    if (!ctx) return;
    if (chartMix) chartMix.destroy();
    const chart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: items.map((i) => i.categoria),
        datasets: [{ data: items.map((i) => i.percentual) }],
      },
      options: { plugins: { legend: { position: "bottom" } } },
    });
    setChartMix(chart);
  };

  const renderEvolucao = (rows: any[]) => {
    const ctx = document.getElementById("chartEvolucao") as HTMLCanvasElement;
    if (!ctx) return;
    if (chartEvolucao) chartEvolucao.destroy();
    const chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: rows.map((r) => r.data),
        datasets: [
          {
            label: "Faturamento",
            data: rows.map((r) => r.valor),
            fill: true,
            borderColor: "#10b981",
            backgroundColor: "rgba(16,185,129,0.12)",
            tension: 0.25,
          },
        ],
      },
      options: {
        plugins: { legend: { display: false } },
        scales: { x: { title: { display: true, text: "Data" } } },
      },
    });
    setChartEvolucao(chart);
  };

  // === Efeitos ===
  useEffect(() => {
    carregarFiltros();
    carregarProdutos();
  }, []);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4 text-center">
        🍽️ Produtos & Cardápio — Análise
      </h1>

      {/* FILTROS */}
      <div className="bg-card shadow-lg rounded-lg p-4 mb-6 grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
        <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="border p-2 rounded" />
        <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="border p-2 rounded" />

        <select value={loja} onChange={(e) => setLoja(e.target.value)} className="border p-2 rounded">
          <option value="">Todas as lojas</option>
          {lojas.map((l) => (
            <option key={l.id} value={l.id}>{l.nome}</option>
          ))}
        </select>

        <select value={canal} onChange={(e) => setCanal(e.target.value)} className="border p-2 rounded">
          <option value="">Todos os canais</option>
          {canais.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>

        <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="border p-2 rounded">
          <option value="">Todas as categorias</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>

        <select value={diaSemana} onChange={(e) => setDiaSemana(e.target.value)} className="border p-2 rounded">
          <option value="">Todos os dias</option>
          <option value="1">Segunda</option>
          <option value="2">Terça</option>
          <option value="3">Quarta</option>
          <option value="4">Quinta</option>
          <option value="5">Sexta</option>
          <option value="6">Sábado</option>
          <option value="0">Domingo</option>
        </select>

        <select value={horario} onChange={(e) => setHorario(e.target.value)} className="border p-2 rounded">
          <option value="">Todos os horários</option>
          <option value="6-12">06h - 12h</option>
          <option value="12-15">12h - 15h</option>
          <option value="15-18">15h - 18h</option>
          <option value="18-23">18h - 23h</option>
        </select>

        <FilterActionButtons onApply={carregarProdutos} onExport={exportCSV} />
      </div>

      {/* KPIS */}
      {kpis && (
        <div id="kpisProd" className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <h3 className="text-sm text-gray-500">Itens Vendidos</h3>
            <p className="text-xl font-semibold mt-2">{kpis.total_itens}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <h3 className="text-sm text-gray-500">Faturamento</h3>
            <p className="text-xl font-semibold mt-2">{formatCurrency(kpis.faturamento_total)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <h3 className="text-sm text-gray-500">Margem Média</h3>
            <p className="text-xl font-semibold mt-2">{kpis.margem_media}%</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <h3 className="text-sm text-gray-500">Produto Mais Vendido</h3>
            <p className="text-xl font-semibold mt-2">{kpis.produto_mais_vendido}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <h3 className="text-sm text-gray-500">Produto Mais Lucrativo</h3>
            <p className="text-xl font-semibold mt-2">{kpis.produto_mais_lucrativo}</p>
          </div>
        </div>
      )}

      {/* GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-card rounded-lg shadow-md p-4">
          <h3 className="text-base font-semibold mb-2">🏆 Top 5 Mais Vendidos</h3>
          <canvas id="chartTopVendidos" height="180"></canvas>
        </div>
        <div className="bg-card rounded-lg shadow-md p-4">
          <h3 className="text-base font-semibold mb-2">🎯 Mix de Categorias</h3>
          <canvas id="chartMix" height="180"></canvas>
        </div>
      </div>

      <div className="bg-card rounded-lg shadow-md p-4 mb-6">
        <h3 className="text-base font-semibold mb-2">📈 Evolução de Vendas (7 dias)</h3>
        <canvas id="chartEvolucao" height="80"></canvas>
      </div>

      {/* TABELA */}
      <div className="bg-card shadow-lg rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">📋 Detalhamento de Produtos</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-2 py-2 text-left">Produto</th>
                <th className="px-2 py-2">Categoria</th>
                <th className="px-2 py-2 text-right">Qtd</th>
                <th className="px-2 py-2 text-right">Receita</th>
                <th className="px-2 py-2 text-right">Custo</th>
                <th className="px-2 py-2 text-right">Margem %</th>
                <th className="px-2 py-2 text-right">Margem Total</th>
              </tr>
            </thead>
            <tbody>
              {produtos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-4">
                    Nenhum produto encontrado
                  </td>
                </tr>
              ) : (
                produtos.map((r, i) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td className="px-2 py-2">{r.produto}</td>
                    <td className="px-2 py-2">{r.categoria || "-"}</td>
                    <td className="px-2 py-2 text-right">{r.qtde}</td>
                    <td className="px-2 py-2 text-right">{formatCurrency(r.faturamento)}</td>
                    <td className="px-2 py-2 text-right">{formatCurrency(r.custo)}</td>
                    <td className="px-2 py-2 text-right">{r.margem_percentual ?? 0}%</td>
                    <td className="px-2 py-2 text-right">{formatCurrency(r.margem_total)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINAÇÃO */}
        <div className="flex justify-between items-center mt-4">
          <button
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
            disabled={pagina === 1}
            className="bg-muted text-foreground px-4 py-2 rounded hover:bg-muted/80 disabled:opacity-50"
          >
            ← Anterior
          </button>
          <span className="text-sm text-muted-foreground">
            Página {pagina} de {totalPaginas} — {totalRegistros} registros
          </span>
          <button
            onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
            disabled={pagina === totalPaginas}
            className="bg-muted text-foreground px-4 py-2 rounded hover:bg-muted/80 disabled:opacity-50"
          >
            Próxima →
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProdutosTab;
