// public/js/comum.js — funções partilhadas por todas as páginas

// ---------- Sessão (token guardado no navegador) ----------
const Sessao = {
  obter() { try { return JSON.parse(localStorage.getItem('sessao')); } catch { return null; } },
  guardar(dados) { localStorage.setItem('sessao', JSON.stringify(dados)); },
  terminar() { localStorage.removeItem('sessao'); location.href = '/'; },
  ehStaff() { const s = this.obter(); return s && ['admin', 'funcionario'].includes(s.utilizador.tipo); }
};

// ---------- Pedidos à API ----------
// Junta automaticamente o token de sessão e trata os erros num só sítio
async function api(caminho, opcoes = {}) {
  const sessao = Sessao.obter();
  const cabecalhos = opcoes.body instanceof FormData ? {} : { 'Content-Type': 'application/json' };
  if (sessao) cabecalhos.Authorization = 'Bearer ' + sessao.token;

  const resposta = await fetch('/api' + caminho, { ...opcoes, headers: { ...cabecalhos, ...opcoes.headers } });
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error(dados.erro || 'Ocorreu um erro.');
  return dados;
}

// ---------- Utilitários ----------
// Converte texto em HTML seguro (evita XSS: "<script>" aparece como texto, não é executado)
function seguro(texto) {
  const div = document.createElement('div');
  div.textContent = texto ?? '';
  return div.innerHTML;
}

function dataPT(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' });
}

function icone(nome) { return `<i data-lucide="${nome || 'package'}"></i>`; }
function desenharIcones() { if (window.lucide) lucide.createIcons(); }

// ---------- Cartão de um item (usado na página inicial) ----------
function cartaoItem(item) {
  const foto = item.imagem_url
    ? `<img src="${seguro(item.imagem_url)}" alt="">`
    : icone(item.icone);
  const etiqueta = item.estado === 'reclamado' ? 'reclamado' : item.tipo;
  return `
    <a class="cartao-item" href="/item.html?id=${item.id}">
      <div class="foto ${item.tipo}">${foto}<span class="etiqueta ${etiqueta}">${etiqueta}</span></div>
      <div class="corpo">
        <h3>${seguro(item.titulo)}</h3>
        <div>${item.tamanho ? `<span class="chip">Tam. ${seguro(item.tamanho)}</span> ` : ''}<span class="chip">${seguro(item.categoria)}</span></div>
        <div class="meta">
          <span>${icone('map-pin')} ${seguro(item.local || 'Local desconhecido')}</span>
          <span>${icone('calendar')} ${dataPT(item.data_ocorrencia)}</span>
        </div>
      </div>
    </a>`;
}

// ---------- Cabeçalho comum ----------
function desenharTopo(paginaAtiva) {
  const sessao = Sessao.obter();
  const ligacoes = [
    ['inicio', '/', 'Início'],
    ['publicar', '/publicar.html', 'Publicar'],
    ...(sessao ? [['conta', '/conta.html', 'Os meus pedidos']] : []),
    ...(Sessao.ehStaff() ? [['admin', '/admin.html', 'Secretaria']] : [])
  ];
  document.getElementById('topo').innerHTML = `
    <div class="contentor">
      <a class="marca" href="/">
        <span class="marca-icone">${icone('search-check')}</span>
        <span>Achados &amp; Perdidos<small>Escola Profissional Val do Rio</small></span>
      </a>
      <nav class="menu">
        ${ligacoes.map(([id, url, nome]) => `<a href="${url}" class="${id === paginaAtiva ? 'ativo' : ''}">${nome}</a>`).join('')}
        ${sessao
          ? `<a href="#" id="sair">Sair (${seguro(sessao.utilizador.nome.split(' ')[0])})</a>`
          : `<a class="botao pequeno" href="/entrar.html">${icone('log-in')} Entrar</a>`}
      </nav>
    </div>`;
  document.getElementById('sair')?.addEventListener('click', e => { e.preventDefault(); Sessao.terminar(); });
  desenharIcones();
}
