import { useEffect, useState } from "react";
import FilterActionButtons from "./FilterActionButtons";

interface Unidade {
  unidade: string;
  status: string;
  faturamento: number;
  ticket_medio: number;
  pedidos: number;
  ultima_venda: string;
}

interface Kpis {
  total_unidades: number;
  faturamento_total: number;
  ticket_medio: number;
  unidades_ativas: number;
}

const API_URL = "http://localhost:8000/units/overview";

const formatCurrency = (v: number) =>
  (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const UnidadesTab = () => {
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [status, setStatus] = useState("");
  const [canal, setCanal] = useState("");
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [loading, setLoading] = useState(false);

  const montarQueryParams = () => {
    const params = new URLSearchParams();
    if (dataInicio) params.append("start_date", dataInicio);
    if (dataFim) params.append("end_date", dataFim);
    if (status) params.append("status", status);
    if (canal) params.append("channel_id", canal);
    params.append("page", String(pagina));
    params.append("limit", "20");
    return params.toString();
  };

  const carregarUnidades = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}?${montarQueryParams()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setKpis(data.kpis);
      setUnidades(data.unidades || []);
      setPagina(data.pagina || 1);
      setTotalPaginas(data.total_paginas || 1);
    } catch (err) {
      console.error("❌ Erro ao carregar unidades:", err);
      alert("Erro ao carregar dados. Veja o console.");
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (!unidades.length) {
      alert("Nenhum dado disponível para exportar.");
      return;
    }

    const header = ["unidade", "status", "faturamento", "ticket_medio", "pedidos", "ultima_venda"];
    const csv = [
      header.join(","),
      ...unidades.map((r) =>
        [
          `"${r.unidade}"`,
          r.status,
          r.faturamento,
          r.ticket_medio,
          r.pedidos,
          r.ultima_venda,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `unidades_pagina_${pagina}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 👉 Carrega automaticamente ao abrir
  useEffect(() => {
    carregarUnidades();
  }, []);

  // 👉 Atualiza se mudar de página
  useEffect(() => {
    if (pagina > 1) carregarUnidades();
  }, [pagina]);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4 text-center">📊 Visão das Unidades</h1>

      {/* FILTROS */}
      <div className="bg-card shadow-lg rounded-lg p-4 mb-6 grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
        <input
          type="date"
          value={dataInicio}
          onChange={(e) => setDataInicio(e.target.value)}
          className="border p-2 rounded"
        />
        <input
          type="date"
          value={dataFim}
          onChange={(e) => setDataFim(e.target.value)}
          className="border p-2 rounded"
        />

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">Todos status</option>
          <option value="Ativa">Ativa</option>
          <option value="Inativa">Inativa</option>
        </select>

        <select
          value={canal}
          onChange={(e) => setCanal(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">Todos os canais</option>
          <option value="1">Presencial</option>
          <option value="2">iFood</option>
          <option value="3">Rappi</option>
          <option value="4">Uber Eats</option>
          <option value="5">WhatsApp</option>
          <option value="6">App Próprio</option>
        </select>

        <FilterActionButtons onApply={carregarUnidades} onExport={exportCSV} />
      </div>

      {/* KPIS */}
      {kpis && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <h3 className="text-sm text-gray-500">Total Unidades</h3>
            <p className="text-xl font-semibold">{kpis.total_unidades}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <h3 className="text-sm text-gray-500">Faturamento Total</h3>
            <p className="text-xl font-semibold">{formatCurrency(kpis.faturamento_total)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <h3 className="text-sm text-gray-500">Ticket Médio Geral</h3>
            <p className="text-xl font-semibold">{formatCurrency(kpis.ticket_medio)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <h3 className="text-sm text-gray-500">Unidades Ativas</h3>
            <p className="text-xl font-semibold">{kpis.unidades_ativas}</p>
          </div>
        </div>
      )}

      {/* TABELA */}
      <div className="bg-card shadow-lg rounded-lg p-4">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Carregando dados...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-2 py-2 text-left">Unidade</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2 text-right">Faturamento</th>
                  <th className="px-2 py-2 text-right">Ticket Médio</th>
                  <th className="px-2 py-2 text-right">Pedidos</th>
                  <th className="px-2 py-2 text-center">Última Venda</th>
                </tr>
              </thead>
              <tbody>
                {unidades.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4">
                      Nenhum dado encontrado
                    </td>
                  </tr>
                ) : (
                  unidades.map((u, i) => (
                    <tr key={i} className="border-b">
                      <td className="px-2 py-1">{u.unidade}</td>
                      <td className="px-2 py-1 text-center">{u.status}</td>
                      <td className="px-2 py-1 text-right">{formatCurrency(u.faturamento)}</td>
                      <td className="px-2 py-1 text-right">{formatCurrency(u.ticket_medio)}</td>
                      <td className="px-2 py-1 text-right">{u.pedidos}</td>
                      <td className="px-2 py-1 text-center">{u.ultima_venda}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

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
            Página {pagina} de {totalPaginas}
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

export default UnidadesTab;
