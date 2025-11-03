// ==================== Config / Estado ====================
const API_BASE = 'http://127.0.0.1:8000/produtos/analitico';

let currentPage = 1;
let totalPages = 1;
let currentProdutos = [];

let chartTopVendidos = null;
let chartMenuEng = null;
let chartMix = null;
let chartEvolucao = null;

function formatCurrency(v) {
    const valor = Number(v) || 0;
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}


// ==================== Popula selects ====================
async function popularFiltrosProdutos() {
  try {
    const [resLojas, resCanais, resCats] = await Promise.all([
      fetch('http://127.0.0.1:8000/filtros/lojas'),
      fetch('http://127.0.0.1:8000/filtros/canais'),
      fetch('http://127.0.0.1:8000/filtros/categorias')
    ]);

    const lojas = await resLojas.json();
    const canais = await resCanais.json();
    const cats = await resCats.json();

    const sLoja = document.getElementById('filtroLoja');
    lojas.forEach(l => {
      const opt = document.createElement('option');
      opt.value = l.id;
      opt.textContent = l.nome;
      sLoja.appendChild(opt);
    });

    const sCanal = document.getElementById('filtroCanal');
    canais.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.nome;
      sCanal.appendChild(opt);
    });

    const sCat = document.getElementById('filtroCategoria');
    cats.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.nome;
      sCat.appendChild(opt);
    });

  } catch (err) {
    console.error('Erro ao popular filtros:', err);
  }
}

// ==================== Montar Query Params ====================
function montarQueryParams() {
  const dataInicio = document.getElementById('dataInicio').value;
  const dataFim = document.getElementById('dataFim').value;
  const loja = document.getElementById('filtroLoja').value;
  const canal = document.getElementById('filtroCanal').value;
  const categoria = document.getElementById('filtroCategoria').value;
  const diaSemana = document.getElementById('filtroDiaSemana').value;
  const horario = document.getElementById('filtroHorario').value;

  const params = new URLSearchParams();
  if (dataInicio) params.append('start_date', dataInicio);
  if (dataFim) params.append('end_date', dataFim);
  if (loja) params.append('store_id', loja);
  if (canal) params.append('channel_id', canal);
  if (categoria) params.append('category_id', categoria);
  if (diaSemana !== '') params.append('weekday', diaSemana);

  if (horario) {
    const [s, e] = horario.split('-').map(x => parseInt(x, 10));
    if (!Number.isNaN(s)) params.append('start_hour', s);
    if (!Number.isNaN(e)) params.append('end_hour', e);
  }

  params.append('page', currentPage);
  params.append('limit', 20);
  return params.toString();
}

// ==================== Carregar dados ====================
async function carregarProdutos() {
  try {
    const qs = montarQueryParams();
    const res = await fetch(`${API_BASE}?${qs}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    renderKpis(data.kpis || {});
    renderTopVendidos(data.top_vendidos || []);
    renderMix(data.mix_categorias || []);
    renderEvolucao(data.evolucao_vendas || []);

    currentProdutos = data.produtos || [];
    renderTabela(currentProdutos);

    currentPage = data.pagina || 1;
    totalPages = data.total_paginas || 1;
    document.getElementById('pageInfo').innerText =
      `Página ${currentPage} de ${totalPages} — ${data.total_registros || 0} registros`;

  } catch (err) {
    console.error('Erro ao carregar produtos:', err);
    alert('Erro ao carregar dados. Veja o console para detalhes.');
  }
}

// ==================== Render Kpis ====================
function renderKpis(k) {
const kpisDiv = document.getElementById('kpisProd');
const cards = [
{ title: 'Itens Vendidos', value: k.total_itens || 0 },
{ title: 'Faturamento', value: k.faturamento_total ? formatCurrency(k.faturamento_total) : formatCurrency(0) },
{ title: 'Margem Média', value: k.margem_media ? `${k.margem_media}%` : '0%' },
{ title: 'Produto Mais Vendido', value: k.produto_mais_vendido || '-' },
{ title: 'Produto Mais Lucrativo', value: k.produto_mais_lucrativo || '-' }
];
kpisDiv.innerHTML = cards.map(c => `
<div class="bg-white p-4 rounded-lg shadow text-center">
<h3 class="text-sm text-gray-500">${c.title}</h3>
<p class="text-xl font-semibold mt-2">${c.value}</p>
</div>
`).join('');
}

// ==================== Charts renderers ====================
function renderTopVendidos(items) {
const labels = items.map(i => i.produto);
const values = items.map(i => i.qtde);
const ctx = document.getElementById('chartTopVendidos').getContext('2d');
if (chartTopVendidos) chartTopVendidos.destroy();
chartTopVendidos = new Chart(ctx, {
type: 'bar',
data: { labels, datasets: [{ label: 'Unidades', data: values, borderRadius: 6, barThickness: 18 }] },
options: { plugins:{ legend:{ display:false } }, indexAxis: 'y', scales: { x:{ title:{ display:true, text:'Unidades' }}, y:{ title:{ display:false }}} }
});
}


function renderMix(items) {
const labels = items.map(i => i.categoria);
const values = items.map(i => i.percentual);
const ctx = document.getElementById('chartMix').getContext('2d');
if (chartMix) chartMix.destroy();
chartMix = new Chart(ctx, { type: 'doughnut', data: { labels, datasets:[{ data: values }] }, options:{ plugins:{ legend:{ position:'bottom' } } } });
}


function renderEvolucao(rows) {
// rows: [{data: '2025-10-01', valor: 123.4}, ...]
const labels = rows.map(r => r.data);
const values = rows.map(r => r.valor);
const ctx = document.getElementById('chartEvolucao').getContext('2d');
if (chartEvolucao) chartEvolucao.destroy();
chartEvolucao = new Chart(ctx, {
type: 'line',
data:{ labels, datasets:[{ label:'Faturamento', data: values, fill:true, borderColor:'#10b981', backgroundColor:'rgba(16,185,129,0.12)', tension:0.25 }] },
options:{ plugins:{ legend:{ display:false } }, scales:{ x:{ title:{ display:true, text:'Data' }}, y:{ title:{ display:true, text:'R$' } } } }
});
}

// ==================== Tabela ====================
function renderTabela(rows) {
const tbody = document.getElementById('tbodyProdutos');
tbody.innerHTML = rows.map(r => `
<tr class="border-b hover:bg-gray-50">
<td class="px-2 py-2">${r.produto}</td>
<td class="px-2 py-2">${r.categoria || '-'}</td>
<td class="px-2 py-2 text-right">${r.qtde}</td>
<td class="px-2 py-2 text-right">${formatCurrency(r.faturamento)}</td>
<td class="px-2 py-2 text-right">${formatCurrency(r.custo)}</td>
<td class="px-2 py-2 text-right">${r.margem_percentual ?? 0}%</td>
<td class="px-2 py-2 text-right">${formatCurrency(r.margem_total)}</td>
</tr>
`).join('');
}


// ==================== Export CSV ====================
function exportCSV(rows) {
if (!rows || rows.length === 0) { alert('Nenhum produto para exportar.'); return; }
const header = ['produto','categoria','qtde','faturamento','custo','margem_percentual','margem_total'];
const csv = [ header.join(','), ...rows.map(r => [
`"${(r.produto||'').replace(/"/g,'""')}"`,
`"${(r.categoria||'').replace(/"/g,'""')}"`,
r.qtde, r.faturamento, r.custo, r.margem_percentual, r.margem_total
].join(',')) ].join('\n');


const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `produtos_pagina_${currentPage}.csv`; document.body.appendChild(link); link.click(); document.body.removeChild(link);
}


// ==================== Event listeners ====================
function setupEventListeners() {
document.getElementById('btnFiltrar').addEventListener('click', () => { currentPage = 1; carregarProdutos(); });
document.getElementById('prevPage').addEventListener('click', () => { if (currentPage>1) { currentPage--; carregarProdutos(); } });
document.getElementById('nextPage').addEventListener('click', () => { if (currentPage<totalPages) { currentPage++; carregarProdutos(); } });
document.getElementById('btnExport').addEventListener('click', () => exportCSV(currentProdutos));
}


// ==================== Init ====================
window.addEventListener('load', () => {
popularFiltrosProdutos();
setupEventListeners();
carregarProdutos();
});