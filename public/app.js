import { TERRENOS, LUZES as NOMES_LUZ, LUAS, NIVEIS, num, dijkstra, XP_NIVEL, nivelPorXp, GANHOS_NIVEL, FONTES_XP, nivelEm, efeitoAltura, linhaDeVisao, distanciaCasas } from './regras.js';
import { criarCena } from './cena3d.js';
import { CRIATURAS_3D, ARMAS_3D, SECUNDARIAS, SEXOS, ESTILO_DOM } from './modelos.js';
import { abrirCriador } from './criacao.js';
import { retratoDe } from './retrato.js';
import {
  ATRIBUTOS, PERICIAS, RACAS, VOCACOES, TODOS_DONS, DONS, CUSTO_DOM, notasDom, RESSONANCIAS, ORIGENS, ESTRATOS,
  ataqueArma, danoTecnica, bonusTesteDom, temImbuir, TALENTO, ARVORES, pontosTalento, alcanceTecnica,
  aparenciaPadrao, atributosFinais, gradPericia, habilidadesVocacao, HAB_VOCACAO, bonusPericia, ehAurethian, nivelDom, derivados,
} from './conteudo.js';

// ================= CONFIGURAÇÃO VISUAL (fácil de editar) =================
const COR_LUZ = { dia: '#ffb347', noite: '#05060f', azul: '#3f6fe0', conjuncao: '#9a7fe0' };
const MATERIAIS = { cristal: 'Cristal', osso: 'Osso', ferro: 'Ferro Lunar', brasa: 'Brasa' };
const CORES_TERRENO = { '.': '#7d6146', '_': '#8f877b', ',': '#d3ad6a', '"': '#4d7536', '~': '#2a6585', '=': '#7a4e2c', '+': '#5a3a1e', 'v': '#1b1820', '#': '#3a342e', m: '#6b4a2a', h: '#7a7468', k: '#4f8a3a', P: '#24502a', Q: '#6a5040', 'T': '#2d5a27', '^': '#6b6158', '*': '#ff8a1e', b: '#8a5a2a', c: '#b08a52', s: '#c8b48a', n: '#d8c8a0', a: '#7d8288', o: '#c0392f', w: '#6b4423' };

// ================= ESTADO =================
let config = {}, sessao = null, ws = null, codigoAtual = null, reconectar = true, tentativaWs = 0;
let voce = null, sala = null, mesa = null, pcs = {}, npcs = {}, log = [], online = [], pedidos = [], fichaMestreId = null;
let selecionado = null, aba = 'ficha', modoMestre = 'mover', pincel = '.', tamPincel = 1, pincelAlt = '2', mapas = [];
let arrasto = null, alcance = null, npcParaEditar = null, cena = null, quadroPendente = false;
const memo = { mod: 0, dif: '', expr: '1d8+3' };
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const souMestre = () => !!voce?.mestre;
const eu = () => voce?.id;
const sinal = n => (n >= 0 ? '+' : '') + n;
function avisar(t, ms) { const a = $('aviso'); a.textContent = t || ''; a.hidden = !t; clearTimeout(avisar.t); if (ms) avisar.t = setTimeout(() => a.hidden = true, ms); }
function lerLS(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }
function gravarLS(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch {} }

// ================= TELAS =================
function mostrar(tela) {
  for (const t of ['telaLogin', 'telaSaguao', 'telaMesa']) $(t).hidden = t !== tela;
  document.body.classList.toggle('rolavel', tela !== 'telaMesa');
}
async function api(caminho, opcoes = {}) {
  const res = await fetch(caminho, {
    ...opcoes,
    headers: { 'content-type': 'application/json', ...(sessao ? { authorization: 'Bearer ' + sessao.token } : {}), ...(opcoes.headers || {}) },
  });
  const dados = await res.json().catch(() => ({}));
  if (res.status === 401 && sessao) { sairConta(); throw new Error(dados.erro || 'Sessão expirada.'); }
  if (!res.ok) throw new Error(dados.erro || 'Falha na requisição.');
  return dados;
}
function rota() {
  const m = location.hash.match(/^#sala-([A-Z0-9]{6})$/);
  if (!sessao) return telaLogin();
  if (m) return entrarNaSala(m[1]);
  sairDaSala(); telaSaguao();
}
window.addEventListener('hashchange', rota);

// ---------- login ----------
function telaLogin() {
  mostrar('telaLogin');
  $('formApelido').hidden = !config.apelido;
  $('divisorOu').hidden = !(config.apelido && config.googleClientId);
  if (config.googleClientId && !telaLogin.g) {
    telaLogin.g = true;
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
    s.onload = () => {
      google.accounts.id.initialize({ client_id: config.googleClientId, callback: r => login({ credential: r.credential }) });
      google.accounts.id.renderButton($('googleBotao'), { theme: 'filled_black', size: 'large', text: 'signin_with', shape: 'pill', width: 300, locale: 'pt-BR' });
    };
    document.head.appendChild(s);
  }
}
$('formApelido').onsubmit = e => { e.preventDefault(); login({ apelido: $('apelido').value }); };
async function login(corpo) {
  $('erroLogin').textContent = '';
  try { const r = await api('/api/login', { method: 'POST', body: JSON.stringify(corpo) }); sessao = r; gravarLS('arkahad.sessao', r); rota(); }
  catch (e) { $('erroLogin').textContent = e.message; }
}
function sairConta() { sessao = null; gravarLS('arkahad.sessao', null); sairDaSala(); location.hash = ''; telaLogin(); }
$('sair').onclick = sairConta;

// ---------- saguão ----------
async function telaSaguao() {
  mostrar('telaSaguao');
  $('euChip').innerHTML = `${sessao.usuario.foto ? `<img class="avatar" src="${esc(sessao.usuario.foto)}" alt="" referrerpolicy="no-referrer">` : ''}${esc(sessao.usuario.nome)}`;
  await listarSalas();
  clearInterval(telaSaguao.t); telaSaguao.t = setInterval(() => { if (!$('telaSaguao').hidden) listarSalas(); }, 10000);
}
async function listarSalas() {
  try {
    const { salas } = await api('/api/salas');
    $('salas').innerHTML = salas.length ? salas.map(s => `<div class="sala"><h3>${esc(s.nome)}</h3>
      <div class="meta">Mestre: ${esc(s.mestreNome)} · Código ${esc(s.codigo)}</div>
      <div class="meta">${num(s.online)} online · ${num(s.jogadores)}/${config.maxJogadores || 6} jogadores</div>
      <div style="display:flex;gap:8px;margin-top:6px"><button class="pri cresce" data-entrar="${esc(s.codigo)}">${s.mestreId === sessao.usuario.id ? 'Abrir (Mestre)' : 'Entrar'}</button>
      ${s.mestreId === sessao.usuario.id ? `<button data-apagar="${esc(s.codigo)}">Apagar</button>` : ''}</div></div>`).join('')
      : '<p class="sub">Nenhuma sessão aberta. Crie a primeira ao lado.</p>';
    document.querySelectorAll('[data-entrar]').forEach(b => b.onclick = () => location.hash = 'sala-' + b.dataset.entrar);
    document.querySelectorAll('[data-apagar]').forEach(b => b.onclick = async () => {
      if (!b.dataset.ok) { b.dataset.ok = 1; b.textContent = 'Confirmar'; return; }
      try { await api('/api/salas/' + b.dataset.apagar, { method: 'DELETE' }); listarSalas(); } catch (e) { alertaSaguao(e.message); }
    });
  } catch (e) { $('salas').innerHTML = `<p class="erro">${esc(e.message)}</p>`; }
}
function alertaSaguao(t) { $('erroSala').textContent = t; }
$('atualizar').onclick = listarSalas;
$('formSala').onsubmit = async e => {
  e.preventDefault(); $('erroSala').textContent = '';
  try {
    const { codigo } = await api('/api/salas', { method: 'POST', body: JSON.stringify({ nome: $('salaNome').value, senha: $('salaSenha').value }) });
    $('salaSenha').value = ''; location.hash = 'sala-' + codigo;
  } catch (err) { $('erroSala').textContent = err.message; }
};

// ---------- sala (WebSocket) ----------
function entrarNaSala(codigo) {
  if (codigoAtual === codigo && ws && ws.readyState <= 1) { mostrar('telaMesa'); return; }
  sairDaSala();
  codigoAtual = codigo; reconectar = true; tentativaWs = 0;
  mesa = null; pcs = {}; npcs = {}; log = []; online = []; voce = null; selecionado = null;
  mostrar('telaMesa'); $('chipCodigo').textContent = 'Código ' + codigo; render(); painel();
  avisar('Conectando à sessão…');
  conectar();
}
function conectar() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(`${proto}://${location.host}/api/salas/${codigoAtual}/ws?token=${encodeURIComponent(sessao.token)}`);
  const meu = ws;
  ws.onmessage = ev => { if (meu === ws) receber(JSON.parse(ev.data)); };
  ws.onclose = ev => {
    if (meu !== ws) return;
    if ([4000, 4003, 4004, 4005].includes(ev.code)) { reconectar = false; }
    if (reconectar && codigoAtual) {
      tentativaWs++;
      if (tentativaWs > 1 && !mesa) { avisar('Não consegui abrir a sessão. Ela ainda existe?'); }
      else avisar('Conexão perdida. Reconectando…');
      setTimeout(() => { if (codigoAtual && reconectar) conectar(); }, Math.min(8000, 1000 * tentativaWs));
    }
  };
}
function sairDaSala() {
  reconectar = false; codigoAtual = null; $('modalSenha').hidden = true;
  if (ws) { const w = ws; ws = null; try { w.close(); } catch {} }
}
function enviar(msg) { if (ws?.readyState === 1) ws.send(JSON.stringify(msg)); else avisar('Sem conexão com a sessão.', 2500); }
$('voltar').onclick = () => { location.hash = ''; };

function receber(m) {
  switch (m.tipo) {
    case 'estado': {
      // espera os dados e o golpe terminarem para o Vigor não cair antes da hora
      if (filaOcupada) { filaDados = filaDados.then(() => receber(m)).catch(() => {}); break; }
      tentativaWs = 0; $('modalSenha').hidden = true;
      const primeira = !voce;
      const recAntes = recursosDe(pcs?.[m.voce?.id]);
      voce = m.voce; sala = m.sala; mapas = m.mapas || []; const trocouMapa = mesa?.id !== m.mesa?.id; mesa = m.mesa; if (trocouMapa) { desfazer.length = 0; refazer.length = 0; if (mira) cancelarMira(); } pcs = m.pcs || {}; npcs = m.npcs || {}; log = m.log || []; online = m.online || [];
      const novos = (m.pedidos || []).filter(x => !pedidos.some(y => y.id === x.id)); pedidos = m.pedidos || [];
      if (!primeira && voce?.mestre && novos.length) avisar(`Pedido de teste: ${novos.map(x => `${x.nome} · ${x.rotulo}`).join(', ')}`, 5000);
      if (primeira) avisar('');
      $('abaMestre').hidden = !souMestre();
      if (!souMestre() && aba === 'mestre') aba = 'ficha';
      const t = tokenPorK(selecionado);
      if (selecionado && !t) { selecionado = null; alcance = null; $('cartao').hidden = true; }
      calcAlcance();
      if (!edicao) render();
      if (aba !== 'dados' || primeira || recAntes !== recursosDe(pcs[eu()])) painel();
      atualizarOnline();
      if (t && !$('cartao').hidden && !$('formNpc')) cartao(t);
      if (npcParaEditar && npcs[npcParaEditar]) { const id = npcParaEditar; npcParaEditar = null; editorNpc(id); }
      break;
    }
    case 'senha':
      avisar('');
      $('senhaTitulo').textContent = 'Senha de “' + (m.sala || 'sessão') + '”';
      $('erroSenha').textContent = m.erro || '';
      $('modalSenha').hidden = false; $('senhaSala').value = ''; $('senhaSala').focus();
      break;
    case 'dado': case 'golpe': {
      filaOcupada++;
      filaDados = filaDados.then(() => m.tipo === 'golpe' ? animarGolpe(m) : animarDados(m)).catch(() => {}).finally(() => { filaOcupada--; });
      break;
    }
    case 'turno': anunciarTurno(m); break;
    case 'ping': mostrarPing(num(m.x), num(m.y), String(m.cor || '#e2b04a')); break;
    case 'aviso': avisar(m.texto, 4000); break;
    case 'erro':
      if (!$('modalSenha').hidden) $('erroSenha').textContent = m.texto; else avisar(m.texto, 3000);
      break;
    case 'npcCriado': npcParaEditar = m.id; break;
    case 'removida':
      reconectar = false; sairDaSala(); location.hash = '';
      setTimeout(() => alertaSaguao(m.texto || 'A sessão foi removida pelo Mestre.'), 300);
      break;
  }
}
$('formSenha').onsubmit = e => { e.preventDefault(); enviar({ tipo: 'senha', senha: $('senhaSala').value }); };
$('cancelaSenha').onclick = () => { location.hash = ''; };


// ================= Cena 3D =================
function garantirCena() {
  if (cena) return cena;
  cena = criarCena($('palco'), {
    down: aoPressionar, move: aoMover, up: aoSoltar, dbl: i => enviar({ tipo: 'ping', x: i.x, y: i.y }),
    cancelar: () => { arrasto = null; },
  });
  return cena;
}
function tokensTodos() {
  const l = [];
  const aqui = o => !mesa || !o.mapa || o.mapa === mesa.id;
  for (const [id, p] of Object.entries(pcs)) if (p && p.nome && aqui(p)) l.push({ k: 'pc:' + id, id, tipo: 'pc', ...p });
  for (const [id, n] of Object.entries(npcs)) if (n && aqui(n)) l.push({ k: 'npc:' + id, id, ...n, tipo: n.tipo || 'npc' });
  return l;
}
function visualDe(t) {
  if (t.tipo === 'pc') {
    const f = t.ficha;
    const aparencia = t.aparencia || f?.aparencia || { ...aparenciaPadrao('sarthani', 'lamina'), base: t.cor || '#e2b04a', roupa: t.cor || '#7a3b2e' };
    const cristal = f && ehAurethian(f) ? TODOS_DONS[f.dom]?.cor : null;
    const imbuir = t.imbuido && f && temImbuir(f) ? { cor: cristal, estilo: ESTILO_DOM[f.dom] || 'luz' } : null;
    return { aparencia: { ...aparencia, base: t.cor || aparencia.base }, raca: f?.raca || 'sarthani', cristal, imbuir };
  }
  const raca = t.raca || (t.tipo === 'monstro' ? 'criatura' : 'sarthani');
  const aparencia = t.aparencia || { ...aparenciaPadrao(raca === 'criatura' ? 'sarthani' : raca, 'lamina'), corRoupa: t.cor || '#8c7a63', base: t.cor || '#8c7a63' };
  return { aparencia: { ...aparencia, base: t.cor || aparencia.base }, raca, cristal: t.cristal || null };
}
function render() {
  if (!mesa) return;
  quadroPendente = false;
  garantirCena().atualizar({
    mesa,
    tokens: tokensTodos().map(t => ({
      k: t.k, x: num(t.x), y: num(t.y), tamanho: num(t.tamanho, 1), nome: t.nome, ...visualDe(t),
      vigor: num(t.vigor), vigorMax: num(t.vigorMax), mostrarVida: souMestre() || t.tipo === 'pc', oculto: t.visivel === false,
      corNome: t.tipo === 'pc' ? '#ffe9b8' : t.tipo === 'monstro' ? '#ff9a8a' : '#e6dccb',
    })),
    selecionado, alcance,
  });
  topo(); hud(); trilha();
}
function agendarRender() { if (!quadroPendente) { quadroPendente = true; requestAnimationFrame(render); } }
function topo() {
  if (!mesa) return;
  $('nomeMesa').textContent = (sala?.nome || 'Sessão') + (mesa.nome ? ' · ' + mesa.nome : '');
  $('chipCeu').innerHTML = `<span class="ponto" style="background:${COR_LUZ[mesa.luz] || COR_LUZ.dia}"></span>${esc(NOMES_LUZ[mesa.luz] || NOMES_LUZ.dia)} · ${esc(LUAS[mesa.lua] || LUAS.nenhuma)}`;
  const cb = mesa.combate || {};
  $('ordem').innerHTML = cb.ativo ? `<span class="chip">Rodada ${num(cb.rodada, 1)}</span>` + (cb.ordem || []).map((o, i) => `<span class="chip ${i === cb.turno ? 'vez' : ''}">${num(o.ini)} · ${esc(nomeDe(o.k))}</span>`).join('') : '';
  const mc = $('chipModo'); mc.hidden = !souMestre(); if (souMestre()) mc.textContent = 'Você é o Mestre';
}
const partir = k => { k = String(k); const i = k.indexOf(':'); return [k.slice(0, i), k.slice(i + 1)]; };
function nomeDe(k) { const [t, id] = partir(k); const o = t === 'pc' ? pcs[id] : npcs[id]; return o?.nome || (t === 'npc' ? '???' : '—'); }
function atualizarOnline() {
  $('online').innerHTML = online.map(o => `<span class="chip"><span class="ponto" style="background:${esc(pcs[o.id]?.cor || (o.mestre ? '#e2b04a' : '#8c7a63'))}"></span>${esc(pcs[o.id]?.nome || o.nome)}${o.mestre ? ' (Mestre)' : ''}${o.id === eu() ? ' · você' : ''}</span>`).join('');
}

// ================= Movimento =================
function ocupadas(exceto) { const s = new Set(); for (const t of tokensTodos()) { if (t.k === exceto) continue; const tam = num(t.tamanho, 1); for (let i = 0; i < tam; i++) for (let j = 0; j < tam; j++) s.add((num(t.x) + i) + ',' + (num(t.y) + j)); } return s; }
function tokenPorK(k) { return k ? tokensTodos().find(t => t.k === k) : null; }
function minhaVez() { const cb = mesa?.combate; return !!(cb?.ativo && cb.ordem?.[cb.turno]?.k === 'pc:' + eu()); }
function chaveTurno() { const cb = mesa?.combate || {}; return `${num(cb.rodada, 1)}:${num(cb.turno)}`; }
function acoesUsadas() { const p = pcs[eu()]; return p?.acoes?.chave === chaveTurno() ? num(p.acoes.usadas) : 0; }
function possoMover(t) {
  if (!t || !mesa) return false;
  if (souMestre()) return true;
  if (t.tipo !== 'pc' || t.id !== eu()) return false;
  return !mesa.combate?.ativo || (minhaVez() && acoesUsadas() < 3);
}
function calcAlcance() {
  if (movendo && mesa?.combate?.ativo && !vezDe('pc:' + eu())) movendo = false;
  alcance = movendo ? areaMover(tokenPorK('pc:' + eu())) : null;
}
// ===== Mover: 1 ação dá o Deslocamento inteiro, dividido como quiser no mesmo turno =====
let movendo = false;
function restoMov(t) { return t?.mov?.chave === chaveTurno() ? num(t.mov.resta) : 0; }
function limiteMov(t) {
  if (!mesa.combate?.ativo) return 9999;
  return Math.max(restoMov(t), num(acoesDe(t)) > 0 ? num(t.desloc, 6) : 0);
}
function areaMover(t) { return t ? dijkstra(mesa, ocupadas(t.k), num(t.x), num(t.y), limiteMov(t)) : null; }
function alternarMover(t) {
  if (movendo) return pararMover();
  if (!t || t.k !== 'pc:' + eu()) return;
  if (mesa.combate?.ativo && !vezDe(t.k)) return avisar('Aguarde o seu turno.', 2200);
  if (mesa.combate?.ativo && !restoMov(t) && num(acoesDe(t)) <= 0) return avisar('Você já usou as 3 ações.', 2200);
  if (mira) cancelarMira();
  movendo = true; calcAlcance(); $('cartao').hidden = true; render();
}
function pararMover() { movendo = false; alcance = null; render(); }
function moverToken(t, x, y) {
  if (!possoMover(t)) return;
  const tam = num(t.tamanho, 1);
  if (x < 0 || y < 0 || x + tam > mesa.cols || y + tam > mesa.rows) return;
  let extra = {};
  if (!souMestre()) {
    const emCombate = mesa.combate?.ativo;
    if (emCombate && !movendo) { avisar('Para andar, use Mover na barra de atalhos.', 2500); return; }
    const custo = dijkstra(mesa, ocupadas(t.k), num(t.x), num(t.y), limiteMov(t)).get(x + ',' + y);
    if (custo === undefined) { avisar(emCombate ? 'Fora do seu Deslocamento.' : 'Sem caminho até lá.', 2500); return; }
    if (emCombate) {
      // mesma conta do servidor, para a barra mostrar na hora
      const chave = chaveTurno(), resta = restoMov(t);
      extra = custo <= resta ? { mov: { chave, resta: resta - custo } } : { mov: { chave, resta: num(t.desloc, 6) - custo }, acoes: { chave, usadas: 3 - num(acoesDe(t)) + 1 } };
    }
  }
  movendo = false;
  const base = t.tipo === 'pc' ? pcs : npcs;
  base[t.id] = { ...base[t.id], ...extra, x, y }; alcance = null; render();
  enviar({ tipo: 'mover', k: t.k, x, y });
}

// ================= Entrada no mapa =================
function dentro(x, y) { return mesa && x >= 0 && y >= 0 && x < mesa.cols && y < mesa.rows; }
function aoPressionar(i, e) {
  if (!mesa || mira) return;
  if (souMestre() && (modoMestre === 'pintar' || modoMestre === 'altura')) { iniciarEdicao(i); return; }
  if (souMestre() && modoMestre === 'npc' && !i.k) { if (dentro(i.x, i.y)) enviar({ tipo: 'npc', dados: { x: i.x, y: i.y } }); return; }
  if (souMestre() && modoMestre === 'portal') { if (dentro(i.x, i.y)) editorPortal(i.x, i.y); return; }
  if (i.k) arrasto = { k: i.k, x: i.x, y: i.y };
}
function aoMover(i, e) {
  if (mira) { mirarEm(i, e); return; }
  if (souMestre() && (modoMestre === 'pintar' || modoMestre === 'altura')) moverEdicao(i);
}
function aoSoltar(i) {
  if (mira) { dispararMira(i); return; }
  if (movendo) { arrasto = null; const eu_ = tokenPorK('pc:' + eu()); if (i.k === eu_?.k) return pararMover(); if (eu_ && dentro(i.x, i.y)) moverToken(eu_, i.x, i.y); return; }
  if (edicao) { terminarEdicao(); return; }
  if (souMestre() && ['pintar', 'altura', 'portal'].includes(modoMestre)) return;
  if (arrasto) {
    const a = arrasto; arrasto = null; const t = tokenPorK(a.k);
    if (!t || (a.x === i.x && a.y === i.y) || i.k === a.k) { selecionar(a.k); return; }
    moverToken(t, i.x, i.y); return;
  }
  const t = tokenPorK(selecionado);
  if (i.k && i.k !== selecionado) { selecionar(i.k); return; }
  const pt = mesa.portais?.[i.x + ',' + i.y];
  if (t && possoMover(t) && dentro(i.x, i.y)) { moverToken(t, i.x, i.y); return; }
  if (pt && !i.k) { cartaoPortal(i.x, i.y, pt); return; }
  selecionado = null; alcance = null; $('cartao').hidden = true; render();
}

// ================= Editor de terreno =================
// ferramentas: pincel, retângulo, linha, balde (preencher) e conta-gotas; vale para terreno e altura
let ferramenta = 'pincel', formaPincel = 'quadrado', edicao = null;
const desfazer = [], refazer = [];
const camadaAtual = () => modoMestre === 'altura' ? 'alt' : 'grid';
function camadaDe(m, c) { return c === 'alt' ? altDe(m) : m.grid.slice(); }
function altDe(m) { return Array.from({ length: m.rows }, (_, y) => String(m.alt?.[y] || '').padEnd(m.cols, '1').slice(0, m.cols)); }
function celulasPincel(x, y) {
  const r = tamPincel, o = Math.floor((r - 1) / 2), l = [];
  for (let j = 0; j < r; j++) for (let i = 0; i < r; i++) {
    const dx = i - o, dy = j - o;
    if (formaPincel === 'circulo' && r > 2 && Math.hypot(dx - (r % 2 ? 0 : .5), dy - (r % 2 ? 0 : .5)) > r / 2) continue;
    l.push([x + dx, y + dy]);
  }
  return l;
}
function celulasLinha(a, b) {
  const l = [], n = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y));
  for (let k = 0; k <= n; k++) { const t = n ? k / n : 0; const x = Math.round(a.x + (b.x - a.x) * t), y = Math.round(a.y + (b.y - a.y) * t); for (const c of celulasPincel(x, y)) l.push(c); }
  return l;
}
function celulasRetangulo(a, b) {
  const l = [], x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x), y0 = Math.min(a.y, b.y), y1 = Math.max(a.y, b.y);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) l.push([x, y]);
  return l;
}
function valorNovo(camada, atual) {
  if (camada === 'grid') return pincel;
  if (pincelAlt === '+') return String(Math.min(4, Number(atual) + 1));
  if (pincelAlt === '-') return String(Math.max(0, Number(atual) - 1));
  return pincelAlt;
}
function aplicar(arr, camada, cels, tocadas) {
  for (const [x, y] of cels) {
    const k = x + ',' + y;
    if (!dentro(x, y) || (tocadas && tocadas.has(k))) continue; tocadas?.add(k);
    const l = arr[y]; arr[y] = l.slice(0, x) + valorNovo(camada, l[x]) + l.slice(x + 1);
  }
}
function preencher(arr, camada, x, y) {
  const alvo = arr[y][x], fila = [[x, y]], vistos = new Set();
  const cels = [];
  while (fila.length) {
    const [cx, cy] = fila.pop(), k = cx + ',' + cy;
    if (!dentro(cx, cy) || vistos.has(k) || arr[cy][cx] !== alvo) continue;
    vistos.add(k); cels.push([cx, cy]);
    fila.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }
  aplicar(arr, camada, cels, new Set());
}
function mostrarPrevia(cels) { cena?.marcar(2, cels ? new Map(cels.map(([x, y]) => [x + ',' + y, .7])) : null, true); }
function iniciarEdicao(i) {
  if (!dentro(i.x, i.y)) return;
  const camada = camadaAtual();
  if (ferramenta === 'conta') {
    if (camada === 'grid') pincel = mesa.grid[i.y][i.x]; else pincelAlt = altDe(mesa)[i.y][i.x];
    ferramenta = 'pincel'; painel(); return;
  }
  const antes = camadaDe(mesa, camada), arr = antes.slice();
  edicao = { camada, antes, arr, ini: { x: i.x, y: i.y }, tocadas: new Set() };
  if (ferramenta === 'balde') { preencher(arr, camada, i.x, i.y); terminarEdicao(); return; }
  if (ferramenta === 'pincel') aplicar(arr, camada, celulasPincel(i.x, i.y), edicao.tocadas);
  else aplicar(arr, camada, [[i.x, i.y]], null);
  mostrarEdicao();
}
function moverEdicao(i) {
  if (!edicao) {
    // prévia do pincel sob o cursor
    if (!dentro(i.x, i.y)) return mostrarPrevia(null);
    mostrarPrevia(ferramenta === 'pincel' ? celulasPincel(i.x, i.y) : [[i.x, i.y]]);
    return;
  }
  const { camada, antes } = edicao;
  if (ferramenta === 'pincel') aplicar(edicao.arr, camada, celulasPincel(i.x, i.y), edicao.tocadas);
  else {
    edicao.arr = antes.slice();
    const cels = ferramenta === 'retangulo' ? celulasRetangulo(edicao.ini, i) : celulasLinha(edicao.ini, i);
    aplicar(edicao.arr, camada, cels, null); mostrarPrevia(cels);
  }
  mostrarEdicao();
}
function mostrarEdicao() { mesa = { ...mesa, [edicao.camada]: edicao.arr.slice() }; agendarRender(); }
function terminarEdicao() {
  const { camada, antes, arr } = edicao; edicao = null;
  mostrarPrevia(null);
  if (antes.join('') === arr.join('')) return;
  desfazer.push({ camada, antes, depois: arr }); if (desfazer.length > 40) desfazer.shift(); refazer.length = 0;
  mesa = { ...mesa, [camada]: arr }; render();
  enviar({ tipo: 'mesa', dados: { [camada]: arr } });
  painel();
}
function voltarEdicao(pilha, outra, campo) {
  const e = pilha.pop(); if (!e) return;
  outra.push(e);
  const arr = campo === 'antes' ? e.antes : e.depois;
  mesa = { ...mesa, [e.camada]: arr }; render();
  enviar({ tipo: 'mesa', dados: { [e.camada]: arr } }); painel();
}
document.addEventListener('keydown', e => {
  if (!souMestre() || e.target.closest?.('input,textarea,select')) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); voltarEdicao(desfazer, refazer, 'antes'); }
  if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); voltarEdicao(refazer, desfazer, 'depois'); }
});

// ================= Portais =================
function editorPortal(x, y) {
  const pt = mesa.portais?.[x + ',' + y], c = $('cartao');
  const outros = mapas.filter(m => m.id !== mesa.id);
  c.innerHTML = `<button class="fecha" id="fechaCartao" aria-label="Fechar">×</button><h2 style="font-size:18px">${pt ? 'Portal' : 'Novo portal'} em ${x + 1},${y + 1}</h2>
    ${outros.length ? `<form id="formPortal">
      <label for="p_para">Leva para o mapa</label><select id="p_para">${outros.map(m => `<option value="${esc(m.id)}" ${pt?.para === m.id ? 'selected' : ''}>${esc(m.nome)} (${m.cols}×${m.rows})</option>`).join('')}</select>
      <div class="linha"><div><label for="p_x">Chegada: coluna</label><input id="p_x" type="number" min="1" value="${(pt?.x ?? x) + 1}"></div><div><label for="p_y">linha</label><input id="p_y" type="number" min="1" value="${(pt?.y ?? y) + 1}"></div><div><label for="p_cor">Cor</label><input id="p_cor" type="color" value="${esc(pt?.cor || '#7ad0ff')}"></div></div>
      <label for="p_nome">Nome que aparece</label><input id="p_nome" maxlength="40" value="${esc(pt?.nome || '')}" placeholder="Ex.: Caverna de Velshar">
      <label class="cr-check"><input type="checkbox" id="p_volta" ${pt ? '' : 'checked'}> Criar o portal de volta no ponto de chegada</label>
      <button class="pri" style="width:100%;margin-top:10px">${pt ? 'Salvar portal' : 'Criar portal'}</button>
      ${pt ? '<button type="button" id="p_remover" style="width:100%;margin-top:8px">Remover portal</button>' : ''}
    </form><p class="cr-nota">Quem parar em cima do portal vai para o outro mapa. O Mestre vê todos os mapas; cada jogador vê o mapa onde está.</p>`
    : '<p>Crie outro mapa primeiro (aba Mestre → Mapas da sessão) para ter para onde o portal levar.</p>'}`;
  c.hidden = false;
  $('fechaCartao').onclick = () => { c.hidden = true; };
  if ($('formPortal')) $('formPortal').onsubmit = e => {
    e.preventDefault();
    enviar({ tipo: 'portal', x, y, para: $('p_para').value, px: num($('p_x').value, 1) - 1, py: num($('p_y').value, 1) - 1, nome: $('p_nome').value, cor: $('p_cor').value, volta: $('p_volta').checked });
    c.hidden = true;
  };
  if ($('p_remover')) $('p_remover').onclick = () => { enviar({ tipo: 'portal', x, y, remover: true }); c.hidden = true; };
}
function cartaoPortal(x, y, pt) {
  const c = $('cartao'), p = tokenPorK('pc:' + eu());
  c.innerHTML = `<button class="fecha" id="fechaCartao" aria-label="Fechar">×</button><h2 style="font-size:20px;padding-right:40px">Portal</h2>
    <p style="margin:4px 0 10px">Leva para <b>${esc(pt.nome || 'outro mapa')}</b>.</p>
    ${p && possoMover(p) ? '<button class="pri" id="entrarPortal" style="width:100%">Ir até o portal e atravessar</button>' : '<p class="cr-nota">Mova seu personagem até ele para atravessar.</p>'}`;
  c.hidden = false;
  $('fechaCartao').onclick = () => { c.hidden = true; };
  if ($('entrarPortal')) $('entrarPortal').onclick = () => { c.hidden = true; moverToken(p, x, y); };
}

// ================= Baixar e carregar mapas =================
function baixarMapa() {
  const npcsAqui = Object.values(npcs).filter(n => (n.mapa || mesa.id) === mesa.id).map(({ mapa, x, y, ...n }) => ({ ...n, x, y }));
  const dados = { formato: 'arkahad-mapa', versao: 1, mapa: { nome: mesa.nome, cols: mesa.cols, rows: mesa.rows, grid: mesa.grid, alt: altDe(mesa), luz: mesa.luz, lua: mesa.lua }, npcs: npcsAqui };
  const url = URL.createObjectURL(new Blob([JSON.stringify(dados, null, 1)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = (mesa.nome || 'mapa').replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase() + '.arkahad.json';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function carregarArquivoMapa(arquivo) {
  if (!arquivo) return;
  if (arquivo.size > 400000) { avisar('Arquivo grande demais para um mapa.', 3000); return; }
  arquivo.text().then(t => {
    let d; try { d = JSON.parse(t); } catch { avisar('Esse arquivo não é um mapa válido.', 3000); return; }
    const m = d.mapa || d;
    if (!Array.isArray(m.grid)) { avisar('Esse arquivo não é um mapa da Mesa de Arkahad.', 3000); return; }
    enviar({ tipo: 'mapa', acao: 'importar', dados: { mapa: m, npcs: Array.isArray(d.npcs) ? d.npcs : [] } });
    avisar(`Mapa “${m.nome || 'sem nome'}” carregado como um mapa novo da sessão.`, 3000);
  });
}

function mostrarPing(x, y, cor) { cena?.ping(x, y, cor); }
$('zMais').onclick = () => cena?.zoom(.8);
$('zMenos').onclick = () => cena?.zoom(1.25);
$('girarE').onclick = () => cena?.girar(Math.PI / 4);
$('girarD').onclick = () => cena?.girar(-Math.PI / 4);
$('centrar').onclick = () => { const p = pcs[eu()]; if (p && cena) cena.focar(num(p.x), num(p.y)); else cena?.enquadrar(); };

// ================= Cartão de token =================
function selecionar(k) { selecionado = k; const t = tokenPorK(k); calcAlcance(); render(); cartao(t); }
function estadoVida(t) { const v = num(t.vigor), m = num(t.vigorMax, 0); if (!m) return ''; if (v <= 0) return 'Caído'; if (v / m <= .25) return 'À beira da morte'; if (v / m <= .5) return 'Ferido'; if (v < m) return 'Arranhado'; return 'Ileso'; }
function medidor(rot, campo, max, cor, t, pode) {
  const v = num(t[campo]), m = Math.max(1, num(t[max], 1));
  return `<div class="medidor"><span>${rot}</span><div class="barra"><i style="width:${Math.max(0, Math.min(100, v / m * 100))}%;background:${cor}"></i></div><span>${v}/${num(t[max])}${pode ? ` <button class="mini" data-mv="${campo}" data-d="-1" data-k="${esc(t.k)}">−</button><button class="mini" data-mv="${campo}" data-d="1" data-k="${esc(t.k)}">+</button>` : ''}</span></div>`;
}
function linhaClasse(t) {
  const f = t.ficha; if (!f) return '';
  const r = RACAS[f.raca], v = VOCACOES[f.vocacao], d = ehAurethian(f) ? TODOS_DONS[f.dom] : null;
  return `${esc(r?.nome || '')} ${esc(r?.subs?.[f.sub]?.nome || '')} · ${esc(v?.nome || '')} · nível ${num(f.nivel, 1)}${d ? ` · <span style="color:${d.cor}">${esc(d.nome)}</span>` : ''}`;
}
function cartao(t) {
  const c = $('cartao'); if (!t) { c.hidden = true; return; }
  const meu = t.tipo === 'pc' && t.id === eu(), edita = souMestre() && t.tipo !== 'pc';
  const falas = (t.falas || []).filter(Boolean);
  let h = `<button class="fecha" id="fechaCartao" aria-label="Fechar">×</button>
    <h2 style="font-size:20px;padding-right:40px">${esc(t.nome)}</h2>
    <div style="color:var(--mudo);font-size:14px;margin:2px 0 8px">${t.tipo === 'pc' ? (linhaClasse(t) || 'Personagem jogador') : t.tipo === 'monstro' ? 'Criatura' : t.tipo === 'aliado' ? 'Aliado' : 'Personagem do Mestre'}${t.visivel === false ? ' · oculto aos jogadores' : ''}</div>`;
  const nv = nivelEm(mesa, num(t.x), num(t.y));
  if (nv) h += `<p style="margin:2px 0 6px"><span class="tag">${nv > 0 ? 'Terreno alto' : 'No fosso'} · nível ${nv > 0 ? '+' : ''}${nv}</span></p>`;
  if (t.descricao) h += `<p style="margin:6px 0">${esc(t.descricao)}</p>`;
  const eu_ = pcs[eu()];
  if (eu_?.ficha && t.k !== 'pc:' + eu()) {
    const at = ataqueArma(eu_.ficha, !!eu_.imbuido), dist = at.tipo === 'distancia';
    const ef = efeitoAltura(mesa, { x: num(eu_.x), y: num(eu_.y) }, { x: num(t.x), y: num(t.y) }, dist);
    const casas = Math.max(Math.abs(num(eu_.x) - num(t.x)), Math.abs(num(eu_.y) - num(t.y)));
    const notas = [...ef.notas];
    const cob = TERRENOS[(mesa.grid[num(t.y)] || '')[num(t.x)]]?.cobertura;
    if (dist && cob) notas.push('Alvo atrás de cobertura (+2 Defesa dele)');
    if (!dist && casas > 1) notas.push(`Está a ${casas} casas — aproxime-se para o corpo a corpo`);
    const mod = at.mod + ef.mod, rot = `Ataque em ${t.nome}`.slice(0, 40) + (ef.mod ? ` (altura ${sinal(ef.mod)})` : '');
    h += `<div class="bloco" style="margin:8px 0;padding:10px"><button class="pri" id="atacarAlvo" data-rot="${esc(rot)}" data-mod="${mod}" style="width:100%" ${!dist && (casas > 1 || !ef.podeCorpo) ? 'disabled' : ''}>Atacar com ${esc(at.nome)} ${sinal(mod)}</button>
      ${notas.length ? `<ul style="margin:6px 0 0;padding-left:18px;font-size:13px;color:var(--mudo)">${notas.map(n => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}</div>`;
  }
  if (t.tipo === 'pc' && t.ficha?.conceito) h += `<p style="margin:6px 0;font-style:italic">${esc(t.ficha.conceito)}</p>`;
  if (t.tipo === 'pc' || souMestre()) {
    h += `<div class="linha" style="margin:8px 0"><span class="chip">Defesa ${num(t.defesa)}</span><span class="chip">Desl. ${num(t.desloc, 6)}</span><span class="chip">Inic. ${sinal(num(t.ini))}</span>${t.protecao ? `<span class="chip">Prot. ${num(t.protecao)}</span>` : ''}</div>`;
    h += medidor('Vigor', 'vigor', 'vigorMax', '#5d9a4a', t, meu || souMestre());
    if (t.tipo === 'pc') { h += medidor('Fôlego', 'folego', 'folegoMax', '#5f92f0', t, meu || souMestre()); h += medidor('Tensão', 'tensao', 'limiar', '#c0392f', t, meu || souMestre()); }
  } else { const ev = estadoVida(t); if (ev) h += `<p><span class="tag">${ev}</span></p>`; }
  if (falas.length) h += `<div class="fala" id="fala">“${esc(falas[0])}”</div>${falas.length > 1 ? '<button id="outraFala" class="mini">Ouvir outra fala</button>' : ''}`;
  if (souMestre() && t.notas) h += `<p style="color:var(--mudo);font-size:14px"><b>Notas do Mestre:</b> ${esc(t.notas)}</p>`;
  if (edita) h += `<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap"><button id="editarNpc" class="pri">Editar</button><button id="visNpc">${t.visivel === false ? 'Revelar' : 'Ocultar'}</button><button id="apagarNpc">Remover</button></div>`;
  if (souMestre() && t.tipo === 'pc' && t.id !== eu()) h += `<div style="margin-top:10px"><button id="expulsar">Remover jogador da sessão</button></div>`;
  if (possoMover(t)) h += `<p style="color:var(--mudo);font-size:13px;margin-top:10px">Clique numa casa do mapa (ou arraste a miniatura) para mover. Botão direito gira a câmera.</p>`;
  c.innerHTML = h; c.hidden = false;
  $('fechaCartao').onclick = () => { c.hidden = true; selecionado = null; alcance = null; render(); };
  let iFala = 0; if ($('outraFala')) $('outraFala').onclick = () => { iFala = (iFala + 1) % falas.length; $('fala').textContent = '“' + falas[iFala] + '”'; };
  c.querySelectorAll('[data-mv]').forEach(b => b.onclick = () => ajustar(b.dataset.k, b.dataset.mv, num(b.dataset.d)));
  if ($('atacarAlvo')) $('atacarAlvo').onclick = () => { const a = atorAtivo(); if (a) atacarAlvos(a, { tipo: 'arma' }, [t.k], { x: num(t.x), y: num(t.y) }); };
  if (edita) {
    $('editarNpc').onclick = () => editorNpc(t.id);
    $('visNpc').onclick = () => enviar({ tipo: 'npc', id: t.id, dados: { visivel: t.visivel === false } });
    confirmar($('apagarNpc'), () => { enviar({ tipo: 'apagarNpc', id: t.id }); c.hidden = true; });
  }
  if ($('expulsar')) confirmar($('expulsar'), () => { enviar({ tipo: 'expulsar', id: t.id }); c.hidden = true; });
}
function confirmar(b, acao) { b.onclick = () => { if (!b.dataset.ok) { b.dataset.ok = 1; b.textContent = 'Confirmar?'; return; } acao(); }; }
// Vigor, Fôlego ou Tensão mudaram: atualiza mapa, dock, gaveta e cartão aberto de uma vez
function recursosDe(p) { return p ? [p.vigor, p.vigorMax, p.folego, p.folegoMax, p.tensao, p.limiar].join() : ''; }
function refletirRecursos(k) {
  render(); painel();
  if (!$('cartao').hidden && selecionado === k && !$('formNpc')) cartao(tokenPorK(k));
}
function ajustar(k, campo, d) {
  const [tipo, id] = partir(k); const base = tipo === 'pc' ? pcs : npcs;
  if (!base[id]) return;
  const v = num(base[id][campo]) + d;
  base[id] = { ...base[id], [campo]: v }; refletirRecursos(k);
  enviar({ tipo: tipo === 'pc' ? 'pc' : 'npc', id, dados: { [campo]: v } });
}

// ================= Dados (3D) =================
// depois de todos os dados do ataque: animação de quem ataca, projétil ou golpe chegando
async function animarGolpe(m) {
  if (!cena) return;
  cena.acao(m.k, m.dom ? 'magia' : 'ataque');
  const cor = corDoDom(m.k);
  for (const a of m.alvos || []) {
    if (m.dom || m.distancia) cena.projetil(m.k, a, m.dom ? cor : null, !!m.dom);
    else setTimeout(() => cena.impacto(a, m.k), 450);
  }
  await new Promise(r => setTimeout(r, 900));
}
async function animarDados(m) {
  if (!cena) return;
  if (m.k && !/^dano/i.test(m.rotulo || '')) {
    const acao = m.dom ? 'magia' : /combate|pontaria|briga|ataque/i.test(m.rotulo || '') ? 'ataque' : 'usar';
    cena.acao(m.k, acao);
    if ((m.tags || []).some(t => /Triunfo|Coroa/.test(t))) setTimeout(() => cena.acao(m.k, 'vitoria'), 1700);
  }
  const pos = await cena.rolar(m);
  const cam = $('camadaDados'), W = cam.clientWidth, H = cam.clientHeight;
  const p = cena.projetar(pos);
  const pl = document.createElement('div'); pl.className = 'placa';
  pl.style.cssText = `left:${Math.max(130, Math.min(W - 130, p.x))}px;top:${Math.max(16, Math.min(H - 170, p.y - 190))}px;border-color:${esc(m.cor)}`;
  pl.innerHTML = `<span>${esc(m.nome)}${m.rotulo ? ' · ' + esc(m.rotulo) : ''}${m.oculta ? ' · oculta' : ''}</span><b>${num(m.total)}</b>${m.grau ? `<div>${esc(m.grau)}</div>` : ''}${(m.tags || []).map(t => `<span class="tag ${/Ruína|Aranor|Eco/.test(t) ? 'ruim' : ''}">${esc(t)}</span>`).join('')}`;
  cam.appendChild(pl);
  setTimeout(() => pl.classList.add('some'), 5200);
  setTimeout(() => pl.remove(), 6000);
}

// ================= Ficha completa =================
function rolarTeste(rotulo, mod, dom = false) {
  // jogador pede o teste; o Mestre define a DIF (oculta) e aprova
  if (!souMestre() && !dom) { enviar({ tipo: 'pedir', rotulo, mod, tirith: $('fichaTirith')?.value || 'normal' }); return avisar(`Pedido de ${rotulo} enviado ao Mestre.`, 2500); }
  enviar({ tipo: 'rolar', modo: 'teste', mod, tirith: $('fichaTirith')?.value || 'normal', dif: num($('fichaDif')?.value), dom, rotulo });
}
function usarTecnica(nivel, nome) {
  const p = pcs[eu()], f = p?.ficha; if (!f) return;
  const custo = CUSTO_DOM[nivel - 1], a = atributosFinais(f), dom = TODOS_DONS[f.dom];
  let folego = num(p.folego), tensao = num(p.tensao);
  const falta = Math.max(0, custo - folego);
  folego = Math.max(0, folego - custo); tensao += falta + (nivel >= 4 ? 1 : 0);
  pcs[eu()] = { ...p, folego, tensao }; refletirRecursos('pc:' + eu());
  enviar({ tipo: 'pc', dados: { folego, tensao } });
  rolarTeste(`${nome} (N${nivel})`, a[dom.chave] + gradPericia(f, 'canalizacao') + bonusTesteDom(f), true);
  if (tensao > num(p.limiar)) avisar('Tensão acima do Limiar: faça o Teste de Colapso!', 5000);
  else if (falta || nivel >= 4) avisar(`+${falta + (nivel >= 4 ? 1 : 0)} Tensão (Zona 2: role um Sintoma).`, 4000);
}
function htmlFichaCompleta(p) {
  const f = p.ficha, a = atributosFinais(f), d = derivados(f);
  const voc = VOCACOES[f.vocacao], dom = ehAurethian(f) ? TODOS_DONS[f.dom] : null, n = nivelDom(f);
  const dom2 = f.estrato === 'dualista' ? DONS[f.dom2] : null;
  const pers = PERICIAS.map(x => ({ ...x, g: gradPericia(f, x.id), b: bonusPericia(f, x.id) })).map(x => ({ ...x, tot: a[x.attr] + x.g + x.b }));
  const destaques = pers.filter(x => x.g > 0 || x.b > 0).sort((x, y) => y.tot - x.tot);
  const outras = pers.filter(x => !(x.g > 0 || x.b > 0));
  const linhaPer = x => `<button class="per" data-rolar="${esc(x.nome)}" data-mod="${x.tot}" ${x.treinada && !x.g ? 'disabled title="Exige treino"' : ''}><span>${esc(x.nome)} <small>${x.attr}${x.g ? ' · ' + x.g : ''}</small></span><b>${sinal(x.tot)}</b></button>`;
  const tecnicas = (dd, nn) => dd.tec.slice(0, nn).map((t, i) => `<button class="tec" data-tec="${i + 1}" data-nome="${esc(t)}" ${dd !== dom ? 'data-sec="1"' : ''}><span><b>N${i + 1}</b> ${esc(t)}</span><small>${esc(dd.inf[i].acao)} · ${danoTecnica(f, i + 1)}</small><small class="tec-ef">${esc(dd.inf[i].alc)} — ${esc(dd.inf[i].ef)}</small></button>`).join('');
  const at = ataqueArma(f, !!p.imbuido);
  const tals = (f.talentos || []).map(id => TALENTO[id]).filter(Boolean);
  const blocoCombate = `<div class="bloco"><h3>Combate · ${esc(at.nome)}</h3>
    <div class="linha"><button class="pri" data-rolar="Ataque com ${esc(at.nome)}" data-mod="${at.mod}">Atacar ${sinal(at.mod)}</button><button data-dano="${esc(at.dano)}" data-nome="${esc(at.nome)}">Dano ${esc(at.dano)}</button></div>
    ${temImbuir(f) ? `<button class="imbuir ${p.imbuido ? 'on' : ''}" id="imbuir" style="width:100%;margin-top:8px;--cor:${dom.cor}">${p.imbuido ? `Arma imbuída com ${esc(dom.nome)} — desfazer` : `Imbuir a arma com ${esc(dom.nome)} (${(f.talentos || []).includes('imb4') ? 'grátis' : '1 Fôlego'})`}</button>` : ''}
    ${tals.length ? `<div class="talentos-ficha">${tals.map(t => `<span style="--cor:${ARVORES[t.arvore].cor}" title="${esc(t.desc)}">${esc(t.nome)}</span>`).join('')}</div><p class="cr-nota" style="margin:6px 0 0">Passe o mouse num talento para ver o efeito.</p>` : ''}</div>`;
  return `<div class="bloco"><h3>${esc(p.nome)}</h3><div style="color:var(--mudo);font-size:14px">${linhaClasse(p)}</div>
    ${medidor('Vigor', 'vigor', 'vigorMax', '#5d9a4a', { ...p, k: 'pc:' + eu() }, true)}${medidor('Fôlego', 'folego', 'folegoMax', '#5f92f0', { ...p, k: 'pc:' + eu() }, true)}${medidor('Tensão', 'tensao', 'limiar', '#c0392f', { ...p, k: 'pc:' + eu() }, true)}
    <div class="ficha-attrs">${ATRIBUTOS.map(([k]) => `<button data-rolar="${k}" data-mod="${a[k]}"><b>${a[k]}</b>${k}</button>`).join('')}</div>
    <div class="ficha-der"><span>Defesa <b>${d.defesa}</b></span><span>Robustez <b>${d.robustez}</b></span><span>Determ. <b>${d.determinacao}</b></span><span>Proteção <b>${d.protecao}</b></span><span>Lim. Ferim. <b>${d.limiarFer}</b></span><span>Desl. <b>${d.desloc}</b></span></div>
    <div class="linha" style="margin-top:8px">${souMestre() ? '<div><label for="fichaDif">DIF</label><input id="fichaDif" type="number" placeholder="—"></div>' : ''}<div><label for="fichaTirith">Dado de Tirith</label><select id="fichaTirith"><option value="normal">Normal</option><option value="vantagem">Vantagem</option><option value="desvantagem">Desvantagem</option></select></div></div>
    <p class="cr-nota" style="margin:6px 0 0">${souMestre() ? 'Clique num atributo, perícia ou técnica para rolar.' : 'Clique num atributo ou perícia para pedir o teste ao Mestre. Técnicas rolam direto.'}</p>
    ${pedidos.length && !souMestre() ? `<p style="margin:6px 0 0;color:var(--ouro)">Aguardando o Mestre: ${pedidos.map(x => esc(x.rotulo)).join(', ')}</p>` : ''}</div>
    ${blocoCombate}
    ${dom ? `<div class="bloco"><h3 style="color:${dom.cor}">${esc(dom.nome)} — ${esc(dom.tema)}</h3><div style="font-size:13px;color:var(--mudo);margin-bottom:6px">Chave ${dom.chave} · Canalização ${gradPericia(f, 'canalizacao')} · Cristal ${esc(RESSONANCIAS[f.ressonancia]?.nome || '')}</div><div class="dom-notas">${notasDom(dom).map(esc).join('<br>')}</div>${tecnicas(dom, n)}
      ${dom2 ? `<h3 style="color:${dom2.cor};margin-top:10px">${esc(dom2.nome)} (secundário)</h3>${tecnicas(dom2, Math.max(1, n - 1))}` : ''}</div>` : ''}
    <div class="bloco"><h3>Perícias</h3><div class="pers">${destaques.map(linhaPer).join('')}</div>
      <details><summary>Outras perícias</summary><div class="pers">${outras.map(linhaPer).join('')}</div></details></div>
    <div class="bloco"><h3>${esc(voc.nome)}</h3>${habilidadesVocacao(f).map(h => `<p style="margin:0 0 6px${h.ok ? '' : ';opacity:.45'}" title="${h.ok ? 'Liberada' : 'Libera no nível ' + h.nivel}"><b>N${h.nivel}${h.ok ? '' : ' 🔒'}</b> ${esc(h.texto)}</p>`).join('')}<div style="font-size:14px;color:var(--mudo)">Kit: ${esc(voc.kit)} · Armadura: ${esc(d.armadura)} · Proficiência: ${esc(HAB_VOCACAO[f.vocacao]?.armaduras || '')}</div>
      ${f.fardo ? `<p style="margin:8px 0 0"><b>Fardo:</b> ${esc(f.fardo)}</p>` : ''}${f.juramento ? `<p style="margin:4px 0 0"><b>Juramento:</b> ${esc(f.juramento)}</p>` : ''}
      ${(f.facanhas || []).length ? `<p style="margin:4px 0 0"><b>Façanhas:</b> ${f.facanhas.map(esc).join(', ')}</p>` : ''}</div>
    ${p.notasJogador || p.ajuda ? `<div class="bloco"><h3>Do Mestre</h3>${p.ajuda ? `<p style="margin:0 0 6px;color:var(--ouro)">Ajuda: +${num(p.ajuda)} no seu próximo teste aprovado.</p>` : ''}${p.notasJogador ? `<p style="margin:0;white-space:pre-wrap">${esc(p.notasJogador)}</p>` : ''}</div>` : ''}
    ${blocoXp(p, f)}
    <button class="pri" id="abrirCriador" style="width:100%">Editar personagem</button>`;
}
function blocoXp(p, f) {
  const xp = num(p.xp), n = num(f.nivel, 1), pode = nivelPorXp(xp), prox = XP_NIVEL[n], base = XP_NIVEL[n - 1] || 0;
  const pct = prox === undefined ? 100 : Math.max(0, Math.min(100, (xp - base) / (prox - base) * 100));
  return `<div class="bloco"><h3>Experiência</h3><div style="display:flex;justify-content:space-between"><span>Nível <b>${n}</b></span><span><b>${xp}</b> XP${prox === undefined ? ' · nível máximo' : ` / ${prox}`}</span></div>
    <span class="ini-v" style="display:block;margin:6px 0"><b style="width:${pct}%"></b></span>
    ${pode > n ? `<button class="pri" id="subirNivel" style="width:100%">Subir para o nível ${n + 1} — ${esc(GANHOS_NIVEL[n])}</button>` : ''}
    <details><summary>Tabela de níveis</summary><div class="pers">${XP_NIVEL.map((x, i) => `<div style="${i + 1 === n ? 'color:var(--ouro)' : i + 1 > n ? 'opacity:.6' : ''}"><b>N${i + 1}</b> · ${x} XP · ${esc(GANHOS_NIVEL[i])} · +5 Vigor, +1 Fôlego, +2 perícias</div>`).join('')}</div>
    <p class="cr-nota" style="margin:6px 0 0">O Mestre dá XP. Ao subir, distribua perícias, Talentos e atributos em “Editar personagem”.</p></details></div>`;
}
function dadosDaFicha(f, dc) {
  const d = derivados(f);
  return {
    nome: f.nome, sigla: f.sigla || f.nome.slice(0, 2), cor: f.aparencia.base,
    vigorMax: d.vigorMax, folegoMax: d.folegoMax, limiar: d.limiar, defesa: d.defesa, desloc: d.desloc, ini: d.ini,
    robustez: d.robustez, determinacao: d.determinacao, protecao: d.protecao, limiarFer: d.limiarFer,
    ficha: f, aparencia: f.aparencia, dados: dc,
  };
}
function subirNivel() {
  const p = pcs[eu()]; if (!p?.ficha) return;
  const f = { ...p.ficha, nivel: num(p.ficha.nivel, 1) + 1 }, dados = dadosDaFicha(f, p.dados);
  dados.vigor = num(p.vigor) + dados.vigorMax - num(p.vigorMax); dados.folego = num(p.folego) + dados.folegoMax - num(p.folegoMax);
  enviar({ tipo: 'pc', dados }); avisar(`Nível ${f.nivel}! ${GANHOS_NIVEL[f.nivel - 1]}`, 4000);
}
function abrirCriacao() {
  const p = pcs[eu()];
  cena?.pausar(true);
  abrirCriador({
    ficha: p?.ficha, dadosCor: p?.dados, aoFechar: () => cena?.pausar(false),
    aoSalvar(f, dc) {
      const d = derivados(f), dados = dadosDaFicha(f, dc);
      if (!p) Object.assign(dados, { vigor: d.vigorMax, folego: d.folegoMax });
      enviar({ tipo: 'pc', dados }); avisar('Personagem salvo.', 2000);
    },
  });
}

// ================= Painel lateral =================
$('conteudo').addEventListener('input', e => { if (e.target.id) e.target.dataset.mexido = 1; });
$('abas').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; aba = b.dataset.aba; painel(); });
function painel() {
  document.querySelectorAll('#abas button').forEach(x => x.classList.toggle('ativo', x.dataset.aba === aba));
  const c = $('conteudo');
  // campos que o usuário editou sobrevivem ao redesenho (o estado chega a toda hora)
  const mexidos = [...c.querySelectorAll('[data-mexido][id]')].map(el => [el.id, el.type === 'checkbox' ? el.checked : el.value]), foco = document.activeElement?.closest('#conteudo') ? document.activeElement.id : null;
  const rolagem = c.scrollTop, dif = $('fichaDif')?.value, tir = $('fichaTirith')?.value, itemN = $('itemNome')?.value, focoItem = document.activeElement?.id === 'itemNome';
  if (aba === 'ficha') c.innerHTML = htmlFicha();
  else if (aba === 'dados') c.innerHTML = htmlDados();
  else if (aba === 'registro') c.innerHTML = htmlRegistro();
  else if (aba === 'mestre') c.innerHTML = htmlMestre();
  else if (aba === 'itens') c.innerHTML = htmlItens();
  c.scrollTop = rolagem;
  if ($('fichaDif') && dif !== undefined) $('fichaDif').value = dif;
  if ($('fichaTirith') && tir) $('fichaTirith').value = tir;
  if ($('itemNome') && itemN) $('itemNome').value = itemN;
  if (focoItem) $('itemNome')?.focus();
  for (const [id, v] of mexidos) { const el = $(id); if (!el) continue; if (el.type === 'checkbox') el.checked = v; else el.value = v; el.dataset.mexido = 1; }
  if (foco && foco !== 'itemNome') $(foco)?.focus();
  ligar();
  if (aba === 'itens') ligarItens();
}
function moedasDe(p) { const m = p?.moedas || {}; return { k: num(m.k), l: num(m.l), t: num(m.t) }; }
function htmlItens() {
  const p = pcs[eu()];
  if (!p) return '<div class="bloco"><h3>Inventário</h3><p style="margin:0">Crie um personagem na aba Ficha para guardar itens e moedas.</p></div>';
  const m = moedasDe(p), itens = Array.isArray(p.itens) ? p.itens : [];
  const moeda = (c, nome) => `<div class="moeda-linha m-${c}"><i class="moeda-ic"></i><span>${nome}</span><button class="mini" data-moeda="${c}" data-d="-1" aria-label="Menos ${nome}">−</button><input type="number" min="0" max="999999" value="${m[c]}" data-moeda-v="${c}" aria-label="${nome}"><button class="mini" data-moeda="${c}" data-d="1" aria-label="Mais ${nome}">+</button></div>`;
  return `<div class="bloco"><h3>Moedas</h3>${moeda('k', 'Kaelin')}${moeda('l', 'Lyrins')}${moeda('t', 'Tirins')}<p class="dom-notas" style="margin:6px 0 0">1 Kaelin (ouro) = 100 Lyrins (prata) = 10.000 Tirins (bronze).</p></div>
  <div class="bloco"><h3>Itens · ${itens.length}/80</h3>
    <form id="formItem" class="item-novo"><input id="itemNome" maxlength="60" placeholder="Nome do item" aria-label="Nome do item"><input id="itemQtd" type="number" min="1" max="999" value="1" aria-label="Quantidade"><button class="pri">Guardar</button></form>
    <ul class="itens">${itens.map((it, i) => `<li><span class="item-n">${esc(it.n)}</span><button class="mini" data-item="${i}" data-d="-1" aria-label="Menos ${esc(it.n)}">−</button><b>${num(it.q, 1)}</b><button class="mini" data-item="${i}" data-d="1" aria-label="Mais ${esc(it.n)}">+</button><button class="mini" data-item-x="${i}" aria-label="Descartar ${esc(it.n)}" title="Descartar">✕</button></li>`).join('') || '<li class="vazio">A bolsa está vazia.</li>'}</ul></div>`;
}
function salvarBolsa(dados) {
  const p = pcs[eu()]; if (!p) return;
  pcs[eu()] = { ...p, ...dados }; painel(); hud();
  enviar({ tipo: 'pc', dados });
}
function ligarItens() {
  const c = $('conteudo'), p = pcs[eu()]; if (!p) return;
  const m = moedasDe(p), itens = Array.isArray(p.itens) ? p.itens.map(it => ({ ...it })) : [];
  const lim = v => Math.max(0, Math.min(999999, Math.round(num(v))));
  c.querySelectorAll('[data-moeda]').forEach(b => b.onclick = () => salvarBolsa({ moedas: { ...m, [b.dataset.moeda]: lim(m[b.dataset.moeda] + num(b.dataset.d)) } }));
  c.querySelectorAll('[data-moeda-v]').forEach(i => i.onchange = () => salvarBolsa({ moedas: { ...m, [i.dataset.moedaV]: lim(i.value) } }));
  c.querySelectorAll('[data-item]').forEach(b => b.onclick = () => { const it = itens[num(b.dataset.item)]; it.q = Math.max(1, Math.min(999, num(it.q, 1) + num(b.dataset.d))); salvarBolsa({ itens }); });
  c.querySelectorAll('[data-item-x]').forEach(b => b.onclick = () => { itens.splice(num(b.dataset.itemX), 1); salvarBolsa({ itens }); });
  $('formItem').onsubmit = e => {
    e.preventDefault();
    const n = $('itemNome').value.trim().slice(0, 60); if (!n) return $('itemNome').focus();
    if (itens.length >= 80) return avisar('O Inventário está cheio (80 itens).', 2500);
    itens.push({ n, q: Math.max(1, Math.min(999, Math.round(num($('itemQtd').value, 1)))) });
    $('itemNome').value = ''; salvarBolsa({ itens }); $('itemNome')?.focus();
  };
}
function htmlFicha() {
  if (!voce) return '<p class="sub">Conectando…</p>';
  const p = pcs[eu()];
  let h = '';
  if (souMestre() && !p) h += `<div class="bloco"><h3>Você é o Mestre</h3><p style="margin:0">Use a aba Mestre para o mapa, NPCs e combate. Se quiser, crie também um personagem.</p></div>`;
  if (p?.ficha) return h + htmlFichaCompleta(p);
  if (p) return h + `<div class="bloco"><h3>${esc(p.nome)}</h3>${medidor('Vigor', 'vigor', 'vigorMax', '#5d9a4a', { ...p, k: 'pc:' + eu() }, true)}<p>Este personagem foi criado no modo simples.</p></div><button class="pri" id="abrirCriador" style="width:100%">Criar ficha completa</button>`;
  return h + `<div class="bloco"><h3>Sem personagem nesta sessão</h3><p style="margin:0 0 10px">Monte sua miniatura: raça, vocação, Dom, atributos, perícias e aparência — tudo equilibrado pelas regras de Arkahad.</p><button class="pri" id="abrirCriador" style="width:100%">Criar personagem</button></div>`;
}
function htmlDados() {
  return `<div class="bloco"><h3>Teste de Conjunção (2d10)</h3>
    <div class="linha"><div><label for="d_mod">Atributo + Perícia + mod.</label><input id="d_mod" type="number" value="${esc(memo.mod)}"></div><div><label for="d_dif">DIF (opcional)</label><input id="d_dif" type="number" placeholder="15" value="${esc(memo.dif)}"></div></div>
    <label for="d_modo">Dado de Tirith</label><select id="d_modo"><option value="normal">Normal</option><option value="vantagem">Vantagem</option><option value="desvantagem">Desvantagem</option></select>
    <label for="d_rot">O que está rolando</label><input id="d_rot" type="text" placeholder="Ex.: Furtividade, Esfera de Fogo">
    <label style="display:flex;gap:8px;align-items:center;font-size:15px;color:var(--ink)"><input id="d_dom" type="checkbox" style="width:auto"> Teste de Dom (verifica Eco do Fluxo)</label>
    ${souMestre() ? `<label style="display:flex;gap:8px;align-items:center;font-size:15px;color:var(--ink)"><input id="d_oculta" type="checkbox" style="width:auto"> Rolagem oculta (só você vê)</label>` : ''}
    <button class="pri" id="rolarTeste" style="width:100%;margin-top:10px">Rolar 2d10</button></div>
    <div class="bloco"><h3>Dano e dados livres</h3>
    <label for="d_expr">Expressão</label><input id="d_expr" type="text" value="${esc(memo.expr)}">
    <div class="linha" style="margin-top:8px">${[4, 6, 8, 10, 12, 20].map(f => `<button data-rapido="1d${f}">d${f}</button>`).join('')}</div>
    <button class="pri" id="rolarExpr" style="width:100%;margin-top:10px">Rolar</button></div>`;
}
function htmlRegistro() {
  return `<ul class="registro">${log.length ? log.map(x => `<li><span class="ponto" style="display:inline-block;background:${esc(x.cor)}"></span> <b>${esc(x.nome)}</b>${x.rotulo ? ' · ' + esc(x.rotulo) : ''}${x.oculta ? ' · oculta' : ''} — <b style="color:var(--ouro);font-size:18px">${num(x.total)}</b>${x.grau ? ' · ' + esc(x.grau) : ''}<div style="color:var(--mudo);font-size:13px">${esc(x.desc)}${x.difMestre ? ` · DIF ${num(x.difMestre)} (só você vê)` : ''} · ${new Date(x.t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>${(x.tags || []).map(t => `<span class="tag ${/Ruína|Aranor|Eco/.test(t) ? 'ruim' : ''}">${esc(t)}</span>`).join('')}</li>`).join('') : '<li>Nenhuma rolagem ainda.</li>'}</ul>`;
}
const GRUPOS_TERRENO = [
  ['Chão', ['"', '.', ',', '_', '=', 'v']], ['Água', ['~']], ['Vegetação', ['T', 'P', 'Q', 'k']],
  ['Paredes', ['#', 'm', 'h', '+']], ['Objetos', ['^', '*', 'b', 'c', 's', 'n', 'a', 'o', 'w']],
];
function blocoFichasMestre() {
  const lista = Object.entries(pcs).filter(([, p]) => p?.nome);
  if (!lista.length) return '';
  if (!pcs[fichaMestreId]) fichaMestreId = lista[0][0];
  const id = fichaMestreId, p = pcs[id], f = p.ficha || {}, sel = esc(id);
  return `<div class="bloco"><h3>Fichas dos personagens</h3>
    <select id="fm_pc">${lista.map(([k, x]) => `<option value="${esc(k)}" ${k === id ? 'selected' : ''}>${esc(x.nome)}</option>`).join('')}</select>
    <div style="font-size:14px;color:var(--mudo);margin:6px 0">${esc([RACAS[f.raca]?.nome, VOCACOES[f.vocacao]?.nome].filter(Boolean).join(' · '))} · N${num(f.nivel, 1)} · ${num(p.xp)} XP · Vigor ${num(p.vigor)}/${num(p.vigorMax)} · Fôlego ${num(p.folego)}/${num(p.folegoMax)} · Tensão ${num(p.tensao)}${p.ajuda ? ` · ajuda +${num(p.ajuda)} pendente` : ''}</div>
    <label for="fm_nm_${sel}">Notas secretas (só você vê)</label><textarea id="fm_nm_${sel}">${esc(p.notasMestre || '')}</textarea>
    <label for="fm_nj_${sel}">Anotações para o jogador (ele vê na ficha)</label><textarea id="fm_nj_${sel}">${esc(p.notasJogador || '')}</textarea>
    <button id="fm_salvar" style="width:100%;margin-top:6px">Salvar anotações</button>
    <div class="linha" style="margin-top:10px;align-items:end"><div><label for="fm_xp">XP</label><input id="fm_xp" type="number" value="1"></div><div><label for="fm_xpm">Motivo</label><input id="fm_xpm" type="text" maxlength="60" value="Boa ideia"></div><button class="pri" id="fm_darxp">Dar XP</button></div>
    <label for="fm_aj">Ajuda (dica)</label><input id="fm_aj" type="text" maxlength="300" placeholder="Ex.: a porta tem uma runa escondida">
    <div class="linha" style="align-items:end"><div><label for="fm_ajb">Bônus no próximo teste</label><input id="fm_ajb" type="number" min="0" max="5" value="0"></div><button class="pri" id="fm_ajudar">Enviar ajuda</button></div>
    <label style="display:flex;gap:8px;align-items:center;font-size:15px;color:var(--ink)"><input id="fm_secreta" type="checkbox" style="width:auto" checked> Secreto (só este jogador fica sabendo)</label></div>`;
}
function htmlMestre() {
  if (!souMestre() || !mesa) return '';
  const cb = mesa.combate || {}, editando = modoMestre === 'pintar' || modoMestre === 'altura';
  const ferr = [['pincel', '🖌', 'Pincel'], ['retangulo', '▭', 'Retângulo'], ['linha', '╱', 'Linha'], ['balde', '🪣', 'Preencher'], ['conta', '💧', 'Conta-gotas']];
  const blocoFerr = editando ? `<div class="ferramentas">${ferr.map(([k, ic, n]) => `<button data-ferr="${k}" class="${ferramenta === k ? 'ativo' : ''}" title="${n}"><span>${ic}</span><small>${n}</small></button>`).join('')}</div>
      <div class="linha" style="margin-top:8px;align-items:end"><div><label for="m_tam">Tamanho</label><select id="m_tam">${[1, 2, 3, 4, 5, 7].map(n => `<option ${tamPincel === n ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
      <div><label for="m_forma">Forma</label><select id="m_forma"><option value="quadrado" ${formaPincel === 'quadrado' ? 'selected' : ''}>Quadrado</option><option value="circulo" ${formaPincel === 'circulo' ? 'selected' : ''}>Círculo</option></select></div>
      <div class="desfaz"><button id="m_desfazer" ${desfazer.length ? '' : 'disabled'} title="Desfazer (Ctrl+Z)">↶</button><button id="m_refazer" ${refazer.length ? '' : 'disabled'} title="Refazer (Ctrl+Y)">↷</button></div></div>` : '';
  const blocoPedidos = pedidos.length ? `<div class="bloco"><h3>Pedidos de teste</h3>${pedidos.map(x => `<div style="border-bottom:1px solid var(--borda,#3335);padding:6px 0"><div><span class="ponto" style="display:inline-block;background:${esc(x.cor)}"></span> <b>${esc(x.nome)}</b> · ${esc(x.rotulo)} <small>(${x.mod >= 0 ? '+' : ''}${x.mod}${x.tirith !== 'normal' ? ' · ' + esc(x.tirith) : ''})</small></div>
      <div class="linha" style="align-items:end"><div><label for="pd_dif_${esc(x.id)}">DIF (oculta)</label><input id="pd_dif_${esc(x.id)}" type="number" value="15"></div><div><label for="pd_xp_${esc(x.id)}">XP se passar</label><input id="pd_xp_${esc(x.id)}" type="number" min="0" max="20" value="1"></div>
      <button class="pri" data-aprovar="${esc(x.id)}">Aprovar</button><button data-recusar="${esc(x.id)}">Recusar</button></div></div>`).join('')}</div>` : '';
  return `${blocoPedidos}<div class="bloco"><h3>Ferramenta</h3><div class="linha">${[['mover', 'Mover'], ['pintar', 'Terreno'], ['altura', 'Altura'], ['portal', 'Portal'], ['npc', 'Colocar NPC']].map(([k, n]) => `<button data-modo="${k}" class="${modoMestre === k ? 'ativo' : ''}">${n}</button>`).join('')}</div>
    ${blocoFerr}
    ${modoMestre === 'pintar' ? GRUPOS_TERRENO.map(([g, l]) => `<div class="grupo-pal">${g}</div><div class="paleta">${l.map(k => `<button data-pincel="${esc(k)}" class="${pincel === k ? 'ativo' : ''}"><i class="amostra" style="background:${CORES_TERRENO[k]}"></i>${esc(TERRENOS[k].n)}</button>`).join('')}</div>`).join('') + `<button id="m_tudo" style="width:100%;margin-top:8px">Preencher o mapa todo com “${esc(TERRENOS[pincel]?.n || '')}”</button>` : ''}
    ${modoMestre === 'altura' ? `<div class="paleta" style="margin-top:10px">${[...Object.entries(NIVEIS), ['+', 'Subir 1 nível'], ['-', 'Descer 1 nível']].map(([k, n]) => `<button data-alt="${k}" class="${pincelAlt === k ? 'ativo' : ''}"><i class="amostra" style="background:${{ '0': '#2a3a4a', '1': '#7d6146', '2': '#9a7a52', '3': '#b8956a', '4': '#d8c09a', '+': '#5d9a4a', '-': '#c0392f' }[k]}"></i>${esc(n)}</button>`).join('')}</div>
      <p class="cr-nota" style="margin:8px 0 0">Subir 1 nível custa +1 casa de movimento; desníveis de 2+ só escalando (você move). Quem ataca de cima ganha +2; de baixo, −2.</p>` : ''}
    ${modoMestre === 'portal' ? '<p style="margin:8px 0 0;color:var(--mudo)">Clique numa casa para criar ou editar um portal para outro mapa da sessão.</p>' : ''}
    ${modoMestre === 'npc' ? '<p style="margin:8px 0 0;color:var(--mudo)">Clique numa casa vazia para criar um NPC.</p>' : ''}</div>
    <div class="bloco"><h3>Mapas da sessão</h3>
      <div class="mapas">${mapas.map(m => `<div class="mapa-it ${m.id === mesa.id ? 'atual' : ''}"><span class="cresce">${esc(m.nome)}${m.id === sala?.mapaInicial ? ' <small title="Onde os personagens novos aparecem">★ inicial</small>' : ''}<small>${m.cols}×${m.rows} · ${Object.values(pcs).filter(p => p.mapa === m.id).length} jogador(es)</small></span>${m.id === mesa.id ? '<b class="aqui">aqui</b>' : `<button class="mini" data-ir="${esc(m.id)}">Ver</button>`}</div>`).join('')}</div>
      <div class="linha" style="margin-top:8px"><button id="m_novo">+ Novo mapa</button><button id="m_baixar" title="Salva este mapa num arquivo">⬇ Baixar mapa</button><label class="botao-arquivo" title="Carrega um mapa salvo como mapa novo">⬆ Carregar mapa<input type="file" id="m_arquivo" accept=".json,application/json" hidden></label></div>
      <div class="linha" style="margin-top:8px"><button id="m_trazer">Trazer jogadores para cá</button><button id="m_inicial" ${mesa.id === sala?.mapaInicial ? 'disabled' : ''}>Tornar inicial</button>${mapas.length > 1 ? '<button id="m_apagarMapa">Apagar este mapa</button>' : ''}</div></div>
    <div class="bloco"><h3>Céu deste mapa</h3><label for="m_luz">Luz</label><select id="m_luz">${Object.entries(NOMES_LUZ).map(([k, n]) => `<option value="${k}" ${mesa.luz === k ? 'selected' : ''}>${n}</option>`).join('')}</select>
    <label for="m_lua">Lua dominante</label><select id="m_lua">${Object.entries(LUAS).map(([k, n]) => `<option value="${k}" ${mesa.lua === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
    <div class="bloco"><h3>Combate</h3>${cb.ativo ? `<p style="margin:0 0 8px">Rodada ${num(cb.rodada, 1)} · vez de <b>${esc(nomeDe(cb.ordem?.[cb.turno]?.k))}</b></p><div class="linha"><button class="pri" id="proxTurno">Próximo turno</button><button id="fimCombate">Encerrar combate</button></div>` : `<button class="pri" id="iniCombate" style="width:100%">Iniciar combate (rola iniciativa)</button><p style="color:var(--mudo);font-size:13px">Entram os jogadores e os NPCs visíveis deste mapa.</p>`}</div>
    ${blocoFichasMestre()}
    <div class="bloco"><h3>Experiência</h3>${Object.entries(pcs).filter(([, p]) => p?.nome).map(([id, p]) => `<label style="display:flex;gap:8px;align-items:center;margin:4px 0;font-size:15px;color:var(--ink)"><input type="checkbox" style="width:auto" data-xpalvo="${esc(id)}" checked><span class="cresce">${esc(p.nome)}</span><small>N${num(p.ficha?.nivel, 1)} · ${num(p.xp)} XP${nivelPorXp(p.xp) > num(p.ficha?.nivel, 1) ? ' · pode subir' : ''}</small></label>`).join('') || '<p>Nenhum personagem.</p>'}
      <label for="xpFonte">Fonte</label><select id="xpFonte"><option value="">Outra…</option>${FONTES_XP.map(([n, v], i) => `<option value="${i}">${esc(n)} (+${v})</option>`).join('')}</select>
      <div class="linha"><div><label for="xpValor">XP (negativo tira)</label><input id="xpValor" type="number" value="2"></div><div><label for="xpMotivo">Motivo</label><input id="xpMotivo" type="text" maxlength="60" value="Comparecer à sessão"></div></div>
      <label style="display:flex;gap:8px;align-items:center;font-size:15px;color:var(--ink)"><input id="xpSecreta" type="checkbox" style="width:auto"> Secreta (só cada jogador vê a sua)</label>
      <button class="pri" id="darXp" style="width:100%;margin-top:8px">Dar XP aos marcados</button></div>
    <div class="bloco"><h3>NPCs e criaturas deste mapa</h3>${Object.entries(npcs).filter(([, n]) => (n.mapa || mesa.id) === mesa.id).map(([id, n]) => `<div style="display:flex;gap:6px;align-items:center;margin:4px 0"><span class="ponto" style="background:${esc(n.cor)}"></span><span class="cresce">${esc(n.nome)}${n.visivel === false ? ' (oculto)' : ''}</span><button class="mini" data-ed="${esc(id)}">Editar</button></div>`).join('') || '<p>Nenhum. Use “Colocar NPC”.</p>'}</div>
    <div class="bloco"><h3>Este mapa e a sessão</h3><label for="m_nome">Nome do mapa</label><input id="m_nome" type="text" value="${esc(mesa.nome)}">
    <div class="linha"><div><label for="m_cols">Colunas</label><input id="m_cols" type="number" value="${mesa.cols}"></div><div><label for="m_rows">Linhas</label><input id="m_rows" type="number" value="${mesa.rows}"></div></div>
    <button id="salvarMapa" style="margin-top:10px;width:100%">Salvar nome e tamanho</button>
    <label for="m_senha">Nova senha da sessão</label><div style="display:flex;gap:8px"><input id="m_senha" type="password" autocomplete="new-password"><button id="trocarSenha">Trocar</button></div></div>`;
}
const RACAS_NPC = { sarthani: 'Sarthani', zarathim: 'Zarathim', veloryn: 'Veloryn', draveth: 'Draveth', sypheris: 'Sypheris', dvarith: 'Dvarith', criatura: 'Criatura' };
function editorNpc(id) {
  const n = npcs[id]; if (!n) return; const c = $('cartao');
  const vis = visualDe({ ...n, tipo: n.tipo || 'npc' });
  const f = (k, rot, tipo = 'number') => `<div><label for="n_${k}">${rot}</label><input id="n_${k}" type="${tipo}" value="${esc(n[k] ?? '')}"></div>`;
  c.innerHTML = `<button class="fecha" id="fechaCartao" aria-label="Fechar">×</button><h2 style="font-size:18px">Editar NPC</h2><form id="formNpc">
    ${f('nome', 'Nome', 'text')}<div class="linha">${f('sigla', 'Sigla', 'text')}<div><label for="n_cor">Cor da base</label><input id="n_cor" type="color" value="${esc(n.cor || '#8c7a63')}"></div></div>
    <label for="n_tipo">Tipo</label><select id="n_tipo">${[['npc', 'Personagem'], ['monstro', 'Criatura hostil'], ['aliado', 'Aliado']].map(([k, t]) => `<option value="${k}" ${n.tipo === k ? 'selected' : ''}>${t}</option>`).join('')}</select>
    <div class="linha"><div><label for="n_raca">Miniatura</label><select id="n_raca">${Object.entries(RACAS_NPC).map(([k, t]) => `<option value="${k}" ${vis.raca === k ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
    <div><label for="n_criatura">Criatura 3D</label><select id="n_criatura"><option value="">Miniatura simples</option>${Object.entries(CRIATURAS_3D).map(([k, c]) => `<option value="${k}" ${vis.aparencia.criatura === k ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</select></div></div>
    <div class="linha"><div><label for="n_sexo">Corpo</label><select id="n_sexo">${Object.entries(SEXOS).map(([k, t]) => `<option value="${k}" ${vis.aparencia.sexo === k ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
    <div><label for="n_arma">Arma</label><select id="n_arma">${Object.entries(ARMAS_3D).map(([k, a]) => `<option value="${k}" ${vis.aparencia.arma === k ? 'selected' : ''}>${esc(a.nome)}</option>`).join('')}</select></div>
    <div><label for="n_sec">Outra mão</label><select id="n_sec">${Object.entries(SECUNDARIAS).map(([k, a]) => `<option value="${k}" ${vis.aparencia.secundaria === k ? 'selected' : ''}>${esc(a.nome)}</option>`).join('')}</select></div>
    <div><label for="n_roupa">Roupa</label><input id="n_roupa" type="color" value="${esc(vis.aparencia.corRoupa || vis.aparencia.roupa || '#8c7a63')}"></div></div>
    <p class="cr-nota" style="margin:2px 0 0">Para monstros escolha Miniatura “Criatura” e o modelo em “Criatura 3D”. Para pessoas, a raça define pele e traços.</p>
    <div class="linha">${f('vigor', 'Vigor')}${f('vigorMax', 'Vigor máx.')}${f('defesa', 'Defesa')}</div>
    <div class="linha">${f('ini', 'Bônus inic.')}${f('desloc', 'Desloc.')}${f('tamanho', 'Tamanho (casas)')}</div>
    <div class="linha">${f('ataque', 'Bônus de ataque')}${f('dano', 'Dano', 'text')}${f('alcance', 'Alcance (casas)')}${f('protecao', 'Proteção')}<div><label for="n_xp">XP ao derrotar</label><input id="n_xp" type="number" min="0" placeholder="${Math.max(1, Math.round(num(n.vigorMax, 10) / 5))}" value="${esc(n.xp ?? '')}"></div></div>
    <label style="display:flex;gap:8px;align-items:center;font-size:15px;color:var(--ink)"><input id="n_visivel" type="checkbox" style="width:auto" ${n.visivel !== false ? 'checked' : ''}> Visível para os jogadores</label>
    <label for="n_descricao">Descrição (jogadores veem)</label><textarea id="n_descricao">${esc(n.descricao)}</textarea>
    <label for="n_falas">Falas (uma por linha)</label><textarea id="n_falas">${esc((n.falas || []).join('\n'))}</textarea>
    <label for="n_notas">Notas secretas do Mestre</label><textarea id="n_notas">${esc(n.notas)}</textarea>
    <button class="pri" style="width:100%;margin-top:10px">Salvar NPC</button></form>`;
  c.hidden = false;
  $('fechaCartao').onclick = () => { c.hidden = true; };
  $('formNpc').onsubmit = e => {
    e.preventDefault(); const v = k => $('n_' + k).value;
    const raca = v('raca'), sexo = v('sexo'), base = raca === 'criatura' ? {} : aparenciaPadrao(raca, 'lamina', sexo);
    const pele = RACAS[raca]?.pele, trocou = n.raca !== raca || (n.aparencia?.sexo || 'm') !== sexo;
    const aparencia = { ...base, ...(trocou ? {} : n.aparencia || {}), sexo, corRoupa: v('roupa'), arma: v('arma'), secundaria: v('sec'), criatura: v('criatura'), base: v('cor'), ...(trocou && pele ? { pele: pele[Math.floor(Math.random() * pele.length)] } : {}) };
    const dados = { nome: v('nome'), sigla: v('sigla'), cor: v('cor'), tipo: v('tipo'), raca, aparencia, vigor: num(v('vigor')), vigorMax: num(v('vigorMax')), defesa: num(v('defesa')), ini: num(v('ini')), desloc: num(v('desloc'), 6), tamanho: num(v('tamanho'), 1), ataque: num(v('ataque'), 3), dano: v('dano') || '2', alcance: num(v('alcance'), 1), protecao: num(v('protecao')), ...(v('xp') !== '' ? { xp: num(v('xp')) } : {}), visivel: $('n_visivel').checked, descricao: v('descricao'), falas: v('falas').split('\n').map(s => s.trim()).filter(Boolean), notas: v('notas') };
    npcs[id] = { ...npcs[id], ...dados }; enviar({ tipo: 'npc', id, dados });
    selecionar('npc:' + id);
  };
}
function ligar() {
  const q = s => document.querySelector(s);
  if (q('#abrirCriador')) q('#abrirCriador').onclick = abrirCriacao;
  if (q('#subirNivel')) q('#subirNivel').onclick = subirNivel;
  if (q('#fm_pc')) {
    const id = fichaMestreId, sec = () => q('#fm_secreta').checked;
    q('#fm_pc').onchange = e => { fichaMestreId = e.target.value; painel(); };
    q('#fm_salvar').onclick = () => { enviar({ tipo: 'fichaMestre', id, notasMestre: $('fm_nm_' + id).value, notasJogador: $('fm_nj_' + id).value }); avisar('Anotações salvas.', 2000); };
    q('#fm_darxp').onclick = () => { const valor = num(q('#fm_xp').value); if (valor) enviar({ tipo: 'xp', alvos: [id], valor, motivo: q('#fm_xpm').value, secreta: sec() }); };
    q('#fm_ajudar').onclick = () => { enviar({ tipo: 'ajuda', id, texto: q('#fm_aj').value, bonus: num(q('#fm_ajb').value), secreta: sec() }); q('#fm_aj').value = ''; delete q('#fm_aj').dataset.mexido; };
  }
  document.querySelectorAll('[data-aprovar]').forEach(b => b.onclick = () => { const id = b.dataset.aprovar; enviar({ tipo: 'decidir', id, aprovar: true, dif: num(q('#pd_dif_' + id).value, 15), xp: num(q('#pd_xp_' + id).value) }); });
  document.querySelectorAll('[data-recusar]').forEach(b => b.onclick = () => enviar({ tipo: 'decidir', id: b.dataset.recusar, aprovar: false }));
  if (q('#darXp')) q('#darXp').onclick = () => {
    const alvos = [...document.querySelectorAll('[data-xpalvo]:checked')].map(c => c.dataset.xpalvo), valor = num(q('#xpValor').value);
    if (!alvos.length || !valor) return avisar('Escolha os jogadores e a quantidade de XP.', 2500);
    enviar({ tipo: 'xp', alvos, valor, motivo: q('#xpMotivo').value, secreta: q('#xpSecreta').checked });
  };
  if (q('#xpFonte')) q('#xpFonte').onchange = e => { const [n, v] = FONTES_XP[e.target.value] || []; if (n) { q('#xpValor').value = v; q('#xpMotivo').value = n; } };
  document.querySelectorAll('#conteudo [data-mv]').forEach(b => b.onclick = () => ajustar(b.dataset.k, b.dataset.mv, num(b.dataset.d)));
  document.querySelectorAll('#conteudo [data-rolar]').forEach(b => b.onclick = () => rolarTeste(b.dataset.rolar, num(b.dataset.mod)));
  document.querySelectorAll('#conteudo [data-tec]').forEach(b => b.onclick = () => usarTecnica(num(b.dataset.tec), b.dataset.nome));
  document.querySelectorAll('#conteudo [data-dano]').forEach(b => b.onclick = () => enviar({ tipo: 'rolar', modo: 'expr', expr: b.dataset.dano, rotulo: 'Dano · ' + b.dataset.nome }));
  if (q('#imbuir')) q('#imbuir').onclick = () => {
    const p = pcs[eu()]; if (!p?.ficha) return;
    const liga = !p.imbuido, gratis = (p.ficha.talentos || []).includes('imb4');
    const dados = { imbuido: liga };
    if (liga && !gratis) { if (num(p.folego) < 1) { avisar('Sem Fôlego para imbuir a arma.', 2500); return; } dados.folego = num(p.folego) - 1; }
    pcs[eu()] = { ...p, ...dados }; refletirRecursos('pc:' + eu()); enviar({ tipo: 'pc', dados });
    if (liga) cena?.acao('pc:' + eu(), 'magia');
  };
  document.querySelectorAll('[data-pip]').forEach(b => b.onclick = () => {
    const usadas = num(b.dataset.pip) < acoesUsadas() ? acoesUsadas() - 1 : acoesUsadas() + 1;
    pcs[eu()] = { ...pcs[eu()], acoes: { chave: chaveTurno(), usadas } }; painel(); enviar({ tipo: 'acoes', usadas });
  });
  if (q('#fimTurno')) q('#fimTurno').onclick = () => { enviar({ tipo: 'aviso', texto: 'terminou o turno.' }); avisar('Mestre avisado.', 2000); };
  if (q('#rolarTeste')) q('#rolarTeste').onclick = () => {
    memo.mod = $('d_mod').value; memo.dif = $('d_dif').value;
    enviar({ tipo: 'rolar', modo: 'teste', mod: num($('d_mod').value), tirith: $('d_modo').value, dif: num($('d_dif').value), dom: $('d_dom').checked, rotulo: $('d_rot').value, oculta: !!q('#d_oculta')?.checked });
  };
  if (q('#rolarExpr')) q('#rolarExpr').onclick = () => { memo.expr = $('d_expr').value; enviar({ tipo: 'rolar', modo: 'expr', expr: $('d_expr').value, rotulo: 'Dano ' + $('d_expr').value, oculta: !!q('#d_oculta')?.checked }); };
  document.querySelectorAll('[data-rapido]').forEach(b => b.onclick = () => enviar({ tipo: 'rolar', modo: 'expr', expr: b.dataset.rapido, rotulo: b.dataset.rapido, oculta: !!q('#d_oculta')?.checked }));
  document.querySelectorAll('[data-modo]').forEach(b => b.onclick = () => { modoMestre = b.dataset.modo; mostrarPrevia(null); painel(); });
  document.querySelectorAll('[data-ferr]').forEach(b => b.onclick = () => { ferramenta = b.dataset.ferr; painel(); });
  document.querySelectorAll('[data-ir]').forEach(b => b.onclick = () => enviar({ tipo: 'mapa', acao: 'ir', id: b.dataset.ir }));
  if (q('#m_forma')) q('#m_forma').onchange = e => { formaPincel = e.target.value; };
  if (q('#m_desfazer')) q('#m_desfazer').onclick = () => voltarEdicao(desfazer, refazer, 'antes');
  if (q('#m_refazer')) q('#m_refazer').onclick = () => voltarEdicao(refazer, desfazer, 'depois');
  if (q('#m_tudo')) q('#m_tudo').onclick = () => { const antes = mesa.grid.slice(), arr = antes.map(l => pincel.repeat(l.length)); desfazer.push({ camada: 'grid', antes, depois: arr }); refazer.length = 0; mesa = { ...mesa, grid: arr }; render(); enviar({ tipo: 'mesa', dados: { grid: arr } }); painel(); };
  if (q('#m_novo')) q('#m_novo').onclick = () => { const nome = prompt('Nome do novo mapa:', 'Novo mapa'); if (nome) enviar({ tipo: 'mapa', acao: 'criar', nome, cols: mesa.cols, rows: mesa.rows }); };
  if (q('#m_baixar')) q('#m_baixar').onclick = baixarMapa;
  if (q('#m_arquivo')) q('#m_arquivo').onchange = e => { carregarArquivoMapa(e.target.files[0]); e.target.value = ''; };
  if (q('#m_trazer')) confirmar(q('#m_trazer'), () => enviar({ tipo: 'mapa', acao: 'trazer' }));
  if (q('#m_inicial')) q('#m_inicial').onclick = () => enviar({ tipo: 'mapa', acao: 'inicial' });
  if (q('#m_apagarMapa')) confirmar(q('#m_apagarMapa'), () => enviar({ tipo: 'mapa', acao: 'apagar', id: mesa.id }));
  document.querySelectorAll('[data-pincel]').forEach(b => b.onclick = () => { pincel = b.dataset.pincel; painel(); });
  document.querySelectorAll('[data-alt]').forEach(b => b.onclick = () => { pincelAlt = b.dataset.alt; painel(); });
  document.querySelectorAll('[data-ed]').forEach(b => b.onclick = () => editorNpc(b.dataset.ed));
  if (q('#m_tam')) q('#m_tam').onchange = e => tamPincel = num(e.target.value, 1);
  if (q('#m_luz')) q('#m_luz').onchange = e => enviar({ tipo: 'mesa', dados: { luz: e.target.value } });
  if (q('#m_lua')) q('#m_lua').onchange = e => enviar({ tipo: 'mesa', dados: { lua: e.target.value } });
  if (q('#salvarMapa')) q('#salvarMapa').onclick = () => enviar({ tipo: 'mesa', dados: { nome: $('m_nome').value, cols: num($('m_cols').value, 24), rows: num($('m_rows').value, 16) } });
  if (q('#trocarSenha')) q('#trocarSenha').onclick = () => { enviar({ tipo: 'senhaNova', senha: $('m_senha').value }); $('m_senha').value = ''; };
  if (q('#iniCombate')) q('#iniCombate').onclick = () => enviar({ tipo: 'combate', acao: 'iniciar' });
  if (q('#proxTurno')) q('#proxTurno').onclick = () => enviar({ tipo: 'combate', acao: 'proximo' });
  if (q('#fimCombate')) q('#fimCombate').onclick = () => enviar({ tipo: 'combate', acao: 'encerrar' });
}

// ================= Combate: HUD, mira, alcance =================
let mira = null, filaDados = Promise.resolve(), filaOcupada = 0, tirithHud = 'normal', menuTec = false;
const corDoDom = k => { const [t, id] = partir(k); const f = t === 'pc' ? pcs[id]?.ficha : null; return f && ehAurethian(f) ? TODOS_DONS[f.dom]?.cor : '#9ad0ff'; };
// quem o usuário controla agora: o NPC selecionado (Mestre) ou o próprio personagem
function atorAtivo() {
  const sel = tokenPorK(selecionado);
  if (souMestre() && sel && sel.tipo !== 'pc') return sel;
  return tokenPorK('pc:' + eu());
}
function armaDoAtor(t) {
  if (t.tipo === 'pc' && t.ficha) return ataqueArma(t.ficha, !!t.imbuido);
  const al = Math.max(1, num(t.alcance, 1));
  return { nome: 'Ataque', mod: num(t.ataque, 3), dano: t.dano || '2', alcance: al, longo: al > 1 ? al * 2 : al, tipo: al > 1 ? 'distancia' : 'lamina' };
}
function vezDe(k) { const cb = mesa?.combate; return !!(cb?.ativo && cb.ordem?.[cb.turno]?.k === k); }
function acoesDe(t) {
  const cb = mesa?.combate || {}; if (!cb.ativo) return null;
  const chave = `${num(cb.rodada, 1)}:${num(cb.turno)}`;
  return 3 - (t.acoes?.chave === chave ? num(t.acoes.usadas) : 0);
}
function podeAgir(t) {
  if (!t || !mesa) return false;
  if (!mesa.combate?.ativo) return true;
  if (souMestre() && t.tipo !== 'pc') return true;
  return vezDe(t.k) && acoesDe(t) > 0;
}
function hud() {
  const el = $('hud'); if (!el) return;
  const t = atorAtivo();
  if (!t || !mesa) { el.hidden = true; return; }
  const cb = mesa.combate || {}, arma = armaDoAtor(t), f = t.tipo === 'pc' ? t.ficha : null;
  const dom = f && ehAurethian(f) ? TODOS_DONS[f.dom] : null, n = f ? nivelDom(f) : 0;
  const resta = acoesDe(t), minha = vezDe(t.k), pode = podeAgir(t);
  const ops = opcoesBarra(t), barra = barraDe(t, ops);
  const barraHud = (rot, v, m, cls) => `<div class="hb ${cls}" title="${rot} ${num(v)}/${num(m)}"><span>${rot}</span><i><b style="width:${Math.max(0, Math.min(100, num(v) / Math.max(1, num(m)) * 100))}%"></b></i><em>${num(v)}/${num(m)}</em></div>`;
  const ehMeu = t.k === 'pc:' + eu(), mo = moedasDe(t);
  const retrato = `<div class="hud-retrato"><span class="hud-sigla" style="--cor:${esc(t.cor || '#e2b04a')}">${(() => { const r = t.tipo === 'pc' ? retratoDe(t.ficha, hud) : null; return r ? `<img src="${r}" alt="">` : esc(t.sigla || String(t.nome || '?')[0]); })()}</span><div class="hud-rec">${barraHud('Vigor', t.vigor, t.vigorMax, 'vigor')}${t.tipo === 'pc' ? barraHud('Fôlego', t.folego, t.folegoMax, 'folego') + barraHud('Tensão', t.tensao, t.limiar, 'tensao') : ''}</div></div>`;
  const bolsa = ehMeu ? `<button class="hud-b hud-bolsa ${aba === 'itens' ? 'on' : ''}" data-hud="bolsa" title="Abrir o Inventário"><span class="ic">🎒</span><span>Inventário</span><small><b class="m-k">${mo.k}</b> <b class="m-l">${mo.l}</b> <b class="m-t">${mo.t}</b></small></button>` : '';
  let topoHud = '';
  if (cb.ativo) {
    const vez = tokenPorK(cb.ordem?.[cb.turno]?.k);
    topoHud = minha || (souMestre() && t.tipo !== 'pc' && vezDe(t.k))
      ? `<span class="hud-vez">Sua vez</span>${t.tipo === 'pc' ? `<span class="pips-hud">${[0, 1, 2].map(i => `<i class="${i < resta ? 'ok' : ''}"></i>`).join('')}</span><span class="hud-sub">${resta} ${resta === 1 ? 'ação' : 'ações'} · Mover: 1 ação = ${num(t.desloc, 6)} casas${restoMov(t) ? ` · restam ${restoMov(t)}` : ''}</span>` : ''}`
      : `<span class="hud-sub">Rodada ${num(cb.rodada, 1)} · vez de <b>${esc(vez?.nome || '—')}</b></span>`;
  } else topoHud = `<span class="hud-sub">Fora de combate · ações livres</span>`;
  el.innerHTML = `<div class="hud-linha">${retrato}<div class="hud-meio"><div class="hud-topo"><b class="hud-nome">${esc(t.nome)}</b>${topoHud}</div>
    <div class="hud-acoes">
      <div class="atalhos ${editandoBarra ? 'editando' : ''}" role="toolbar" aria-label="Atalhos 1 a 0">${barra.map((id, i) => {
        const op = ops.find(o => o.id === id), ativo = op && ((id === 'arma' && mira?.tipo === 'arma') || (id.startsWith('tec:') && mira?.tipo === 'tec' && mira.nivel === num(id.slice(4))) || op.on);
        const livre = op && (id === 'imbuir' || (id === 'defender' ? pode && !t.guarda : pode));
        return `<button class="slot ${op ? '' : 'vazio'} ${ativo ? 'on' : ''} ${editandoBarra && slotEditado === i ? 'sel' : ''}" data-slot="${i}" ${!editandoBarra && op && !livre ? 'disabled' : ''} title="${op ? esc(`${op.nome} — ${op.sub}`) : editandoBarra ? 'Escolher atalho' : 'Vazio'}"${op?.cor ? ` style="--cor:${op.cor}"` : ''}><kbd>${(i + 1) % 10}</kbd><span class="ic">${op ? op.ic : ''}</span><small>${op ? esc(op.nome) : ''}</small></button>`;
      }).join('')}</div>
      <div class="hud-lado">
        <label class="hud-tirith" title="Dado de Tirith"><select id="hudTirith"><option value="normal">Normal</option><option value="vantagem">Vantagem</option><option value="desvantagem">Desvant.</option></select></label>
        ${t.k === 'pc:' + eu() ? `<button class="mini hud-editar ${editandoBarra ? 'ativo' : ''}" data-hud="editar" title="Organizar os atalhos">${editandoBarra ? 'Pronto' : '✎ Atalhos'}</button>` : ''}
        ${bolsa}
        ${cb.ativo && (minha || (souMestre() && vezDe(t.k))) ? `<button class="hud-b fim" data-hud="fim"><span class="ic">⏭</span><span>Fim do turno</span><small>passa a vez</small></button>` : ''}
        ${souMestre() && cb.ativo && !(vezDe(t.k)) ? `<button class="hud-b fim" data-hud="fim"><span class="ic">⏭</span><span>Próximo</span><small>turno</small></button>` : ''}
      </div>
    </div>
    ${editandoBarra && slotEditado >= 0 ? `<div class="hud-menu escolha-atalho"><b>Atalho ${(slotEditado + 1) % 10}</b>${ops.map((o, j) => `<button data-escolha="${j}"${o.cor ? ` style="--cor:${o.cor}"` : ''}><span class="ic">${o.ic}</span><span><b>${esc(o.nome)}</b><small>${esc(o.sub)}</small></span></button>`).join('')}<button data-escolha="-1"><span class="ic">∅</span><span><b>Deixar vazio</b></span></button></div>` : ''}
    </div></div></div>
    ${mira ? `<div class="hud-mira">${esc(mira.titulo)} — clique no alvo · <button class="mini" data-hud="cancelar">Cancelar (Esc)</button></div>` : ''}`;
  el.hidden = false;
  $('hudTirith').value = tirithHud;
  $('hudTirith').onchange = e => { tirithHud = e.target.value; };
  el.querySelectorAll('[data-hud]').forEach(b => b.onclick = () => acaoHud(b.dataset.hud, t));
  el.querySelectorAll('[data-slot]').forEach(b => b.onclick = () => usarSlot(num(b.dataset.slot)));
  el.querySelectorAll('[data-escolha]').forEach(b => b.onclick = () => { const j = num(b.dataset.escolha), nova = [...barra]; nova[slotEditado] = j < 0 ? '' : ops[j].id; slotEditado = -1; salvarBarra(nova); });
}
// ===== barra de atalhos 1–0 (cada jogador organiza a sua; fica salva no personagem) =====
let editandoBarra = false, slotEditado = -1;
function tecDe(f, dom, nivel) { return { nome: dom.tec[nivel - 1], nivel, custo: CUSTO_DOM[nivel - 1], inf: dom.inf[nivel - 1], dano: danoTecnica(f, nivel), ...alcanceTecnica(f, nivel) }; }
function opcoesBarra(t) {
  const f = t.tipo === 'pc' ? t.ficha : null, dom = f && ehAurethian(f) ? TODOS_DONS[f.dom] : null, n = f ? nivelDom(f) : 0;
  const ops = [{ id: 'arma', ic: '⚔', nome: 'Atacar', sub: armaDoAtor(t).nome }];
  if (t.k === 'pc:' + eu()) { const r = restoMov(t); ops.push({ id: 'mover', ic: '👣', nome: 'Mover', sub: r ? `${r} casas restantes neste turno` : `1 ação · até ${num(t.desloc, 6)} casas no turno`, on: movendo }); }
  if (dom) for (let i = 1; i <= n; i++) ops.push({ id: 'tec:' + i, ic: '✦', cor: dom.cor, nome: dom.tec[i - 1], sub: `${dom.nome} N${i} · ${CUSTO_DOM[i - 1]} Fôlego` });
  if (f && temImbuir(f)) ops.push({ id: 'imbuir', ic: '🜂', cor: dom?.cor, nome: t.imbuido ? 'Imbuída' : 'Imbuir', sub: f.talentos.includes('imb4') ? 'grátis' : '1 Fôlego', on: !!t.imbuido });
  if (t.tipo === 'pc') ops.push({ id: 'defender', ic: '⛨', nome: 'Defender', sub: '+2 Defesa até seu turno', on: !!t.guarda });
  if (t.k === 'pc:' + eu()) for (const it of (Array.isArray(t.itens) ? t.itens : [])) ops.push({ id: 'item:' + it.n, ic: '🧪', nome: it.n, sub: `Item · ${num(it.q, 1)} no Inventário` });
  return ops;
}
function barraDe(t, ops) {
  if (t.k === 'pc:' + eu() && Array.isArray(t.barra)) {
    const b = Array.from({ length: 10 }, (_, i) => t.barra[i] || '');
    // barras salvas antes do Mover existir ganham o Mover no primeiro espaço vazio
    if (!b.includes('mover') && !t.barra.includes('mover')) { const v = b.indexOf(''); if (v >= 0) b[v] = 'mover'; }
    return b;
  }
  const ids = ops.filter(o => !o.id.startsWith('item:')).map(o => o.id);
  return Array.from({ length: 10 }, (_, i) => ids[i] || '');
}
function salvarBarra(barra) {
  const p = pcs[eu()]; if (!p) return;
  pcs[eu()] = { ...p, barra }; hud();
  enviar({ tipo: 'pc', dados: { barra } });
}
function usarSlot(i) {
  const t = atorAtivo(); if (!t || !mesa) return;
  if (editandoBarra) { slotEditado = slotEditado === i ? -1 : i; hud(); return; }
  const ops = opcoesBarra(t), id = barraDe(t, ops)[i]; if (!id) return;
  const op = ops.find(o => o.id === id);
  if (!op) return avisar(id.startsWith('item:') ? 'Esse item não está mais no Inventário.' : 'Atalho indisponível para este personagem.', 2200);
  if (id === 'mover') return alternarMover(t);
  if (id.startsWith('item:')) {
    if (!podeAgir(t)) return avisar('Não é a sua vez (ou acabaram as ações).', 2500);
    return enviar({ tipo: 'usarItem', n: op.nome });
  }
  if (id.startsWith('tec:')) {
    const f = t.ficha, nivel = num(id.slice(4)); menuTec = false;
    if (mira?.tipo === 'tec' && mira.nivel === nivel) return cancelarMira();
    iniciarMira(t, { tipo: 'tec', ...tecDe(f, TODOS_DONS[f.dom], nivel) });
  } else acaoHud(id, t);
  // alvo já selecionado no mapa: a habilidade sai direto nele
  const alvo = mira && selecionado && selecionado !== t.k ? tokenPorK(selecionado) : null;
  if (alvo && mira.casas?.has(num(alvo.x) + ',' + num(alvo.y))) dispararMira({ x: num(alvo.x), y: num(alvo.y), k: alvo.k });
  else if (alvo && mira) avisar(`${alvo.nome} está fora do alcance. Escolha outro alvo.`, 2200);
}
document.addEventListener('keydown', e => {
  if (!/^[0-9]$/.test(e.key) || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
  if ($('telaMesa').hidden || document.querySelector('.criador') || e.target.closest?.('input,textarea,select,[contenteditable]')) return;
  e.preventDefault(); usarSlot(e.key === '0' ? 9 : num(e.key) - 1);
});
function acaoHud(a, t) {
  if (a === 'arma') { menuTec = false; if (mira?.tipo === 'arma') return cancelarMira(); iniciarMira(t, { tipo: 'arma' }); }
  else if (a === 'tecs') { menuTec = !menuTec; if (mira) cancelarMira(); else hud(); }
  else if (a === 'imbuir') $('imbuir') ? $('imbuir').click() : alternarImbuir();
  else if (a === 'defender') enviar({ tipo: 'defender' });
  else if (a === 'editar') { editandoBarra = !editandoBarra; slotEditado = -1; hud(); }
  else if (a === 'bolsa') { aba = 'itens'; painel(); hud(); if (matchMedia('(max-width:900px)').matches) $('abas').scrollIntoView({ behavior: 'smooth' }); }
  else if (a === 'fim') { cancelarMira(); enviar({ tipo: 'combate', acao: 'proximo' }); }
  else if (a === 'cancelar') cancelarMira();
}
function alternarImbuir() {
  const p = pcs[eu()]; if (!p?.ficha) return;
  const liga = !p.imbuido, gratis = (p.ficha.talentos || []).includes('imb4'), dados = { imbuido: liga };
  if (liga && !gratis) { if (num(p.folego) < 1) { avisar('Sem Fôlego para imbuir a arma.', 2500); return; } dados.folego = num(p.folego) - 1; }
  pcs[eu()] = { ...p, ...dados }; refletirRecursos('pc:' + eu()); enviar({ tipo: 'pc', dados });
  if (liga) cena?.acao('pc:' + eu(), 'magia');
}
// alcance da ação a partir do ator
function cfgMira(t, cfg) {
  if (cfg.tipo === 'arma') { const a = armaDoAtor(t); return { ...cfg, ...a, tipo: 'arma', tipoArma: a.tipo, raio: 0, distancia: a.tipo === 'distancia', titulo: `${a.nome}: alcance ${a.alcance}${a.longo > a.alcance ? ` (até ${a.longo} com −3)` : ''}` }; }
  const f = t.ficha, at = f ? atributosFinais(f) : {}, dm = f ? TODOS_DONS[f.dom] : null;
  const modTec = f && dm ? at[dm.chave] + gradPericia(f, 'canalizacao') + bonusTesteDom(f) : 0;
  return { ...cfg, modTec, longo: cfg.alcance, distancia: true, titulo: `${cfg.nome}: alcance ${cfg.alcance}${cfg.raio ? ` · área ${cfg.raio * 2 + 1}×${cfg.raio * 2 + 1}` : ''}` };
}
function iniciarMira(t, cfg) {
  if (!podeAgir(t)) { avisar(mesa.combate?.ativo ? 'Não é a sua vez (ou acabaram as ações).' : 'Não dá para agir agora.', 2500); return; }
  if (movendo) { movendo = false; alcance = null; }
  mira = { ...cfgMira(t, cfg), de: t.k, x: num(t.x), y: num(t.y) };
  // casas ao alcance: forte = alcance normal, fraco = alcance longo; sem linha de visão fica de fora
  const mapa = new Map(), o = { x: mira.x, y: mira.y };
  const extra = mira.distancia ? 2 * Math.max(0, nivelEm(mesa, o.x, o.y)) : 0;
  const lim = mira.longo + extra;
  for (let y = Math.max(0, o.y - lim); y <= Math.min(mesa.rows - 1, o.y + lim); y++) for (let x = Math.max(0, o.x - lim); x <= Math.min(mesa.cols - 1, o.x + lim); x++) {
    const d = distanciaCasas(o, { x, y }); if (!d || d > lim) continue;
    if (mira.distancia && !linhaDeVisao(mesa, o, { x, y }).livre) continue;
    mapa.set(x + ',' + y, d <= mira.alcance + extra ? .85 : .4);
  }
  mira.casas = mapa;
  cena?.marcar(1, mapa, true);
  $('cartao').hidden = true;
  hud();
}
function cancelarMira() { mira = null; cena?.marcar(1, null); cena?.marcar(2, null); $('miraDica').hidden = true; hud(); }
document.addEventListener('keydown', e => { if (e.key === 'Escape' && mira) cancelarMira(); else if (e.key === 'Escape' && movendo) pararMover(); });
function tokensEm(x, y, raio) {
  return tokensTodos().filter(t => { const tam = num(t.tamanho, 1); for (let i = 0; i < tam; i++) for (let j = 0; j < tam; j++) if (Math.max(Math.abs(num(t.x) + i - x), Math.abs(num(t.y) + j - y)) <= raio) return true; return false; });
}
// calcula bônus e avisos para cada alvo
function avaliar(ator, cfg, alvo) {
  const o = { x: num(ator.x), y: num(ator.y) }, d = { x: num(alvo.x), y: num(alvo.y) };
  const dist = distanciaCasas(o, d), ef = efeitoAltura(mesa, o, d, cfg.distancia), notas = [...ef.notas];
  let mod = (cfg.tipo === 'tec' ? cfg.modTec : cfg.mod) + ef.mod, cob = 0, ok = true;
  if (!cfg.distancia) {
    if (dist > cfg.alcance) { ok = false; notas.push(`Fora do alcance corpo a corpo (${dist} casas)`); }
    if (!ef.podeCorpo) ok = false;
  } else {
    const los = linhaDeVisao(mesa, o, d);
    if (!los.livre) { ok = false; notas.push('Sem linha de visão'); }
    const lim = cfg.alcance + ef.alcance;
    if (dist > cfg.longo + ef.alcance) { ok = false; notas.push(`Longe demais (${dist} casas)`); }
    else if (dist > lim) { mod -= 3; notas.push('Alcance longo (−3)'); }
    const c = (mesa.grid[d.y] || '')[d.x];
    if (los.cobertura || TERRENOS[c]?.cobertura) { cob = 2; notas.push('Alvo com cobertura (+2 Defesa)'); }
  }
  if (alvo.guarda) notas.push('Alvo em guarda (+2 Defesa)');
  return { ok, mod, cob, dist, notas };
}
function mirarEm(i, e) {
  if (!dentro(i.x, i.y)) return;
  const ator = tokenPorK(mira.de); if (!ator) return cancelarMira();
  const area = new Map();
  for (let y = i.y - mira.raio; y <= i.y + mira.raio; y++) for (let x = i.x - mira.raio; x <= i.x + mira.raio; x++) area.set(x + ',' + y, 1);
  cena?.marcar(2, area, true);
  const alvos = mira.raio ? tokensEm(i.x, i.y, mira.raio).filter(t => t.k !== ator.k) : (i.k ? [tokenPorK(i.k)] : tokensEm(i.x, i.y, 0)).filter(t => t && t.k !== ator.k);
  const dica = $('miraDica');
  const noAlcance = mira.casas.has(i.x + ',' + i.y);
  let h = `<b>${esc(mira.nome)}</b>`;
  if (!alvos.length) h += `<div>${noAlcance ? (mira.raio ? 'Nenhum alvo na área' : 'Escolha uma miniatura') : 'Fora do alcance'}</div>`;
  for (const a of alvos.slice(0, 5)) { const av = avaliar(ator, mira, a); h += `<div class="${av.ok ? '' : 'ruim'}">${esc(a.nome)} · <b>${sinal(av.mod)}</b> · ${av.dist} casas${av.notas.length ? `<br><small>${av.notas.map(esc).join(' · ')}</small>` : ''}</div>`; }
  dica.innerHTML = h; dica.hidden = false;
  const r = $('area').getBoundingClientRect();
  dica.style.left = Math.min(r.width - 260, (e?.clientX ?? 0) - r.left + 16) + 'px'; dica.style.top = Math.max(8, (e?.clientY ?? 0) - r.top - 10) + 'px';
}
function dispararMira(i) {
  const ator = tokenPorK(mira.de); if (!ator) return cancelarMira();
  const alvos = mira.raio ? tokensEm(i.x, i.y, mira.raio).filter(t => t.k !== ator.k) : (i.k ? [tokenPorK(i.k)] : tokensEm(i.x, i.y, 0)).filter(t => t && t.k !== ator.k);
  if (mira.raio ? !mira.casas.has(i.x + ',' + i.y) : !alvos.length) { avisar(mira.raio ? 'Fora do alcance.' : 'Clique numa miniatura.', 1800); return; }
  const cfg = mira; cancelarMira();
  atacarAlvos(ator, cfg, alvos.map(t => t.k), i);
}
// resolve no servidor: rolagem, Defesa de cada alvo e dano
function atacarAlvos(ator, cfg0, ks, centro) {
  const cfg = cfg0.mod === undefined && cfg0.tipo === 'arma' ? cfgMira(ator, cfg0) : cfg0;
  const f = ator.tipo === 'pc' ? ator.ficha : null;
  if (cfg.tipo === 'tec' && f) {
    // custo de Fôlego e Tensão
    const p = pcs[eu()]; let folego = num(p.folego), tensao = num(p.tensao); const falta = Math.max(0, cfg.custo - folego);
    folego = Math.max(0, folego - cfg.custo); tensao += falta + (cfg.nivel >= 4 ? 1 : 0);
    pcs[eu()] = { ...p, folego, tensao }; refletirRecursos('pc:' + eu()); enviar({ tipo: 'pc', dados: { folego, tensao } });
    if (tensao > num(p.limiar)) avisar('Tensão acima do Limiar: faça o Teste de Colapso!', 5000);
    else if (falta || cfg.nivel >= 4) avisar(`+${falta + (cfg.nivel >= 4 ? 1 : 0)} Tensão (Zona 2: role um Sintoma).`, 4000);
  }
  const alvos = ks.map(tokenPorK).filter(Boolean);
  if (!alvos.length) {
    // técnica numa área vazia: só o teste
    if (cfg.tipo === 'tec') rolarTeste(`${cfg.nome} (N${cfg.nivel})`, cfg.modTec, true);
    return;
  }
  const av = alvos.map(a => avaliar(ator, cfg, a));
  const validos = alvos.filter((a, i) => av[i].ok || cfg.raio);
  if (!validos.length) { avisar(av[0].notas.join(' · ') || 'Alvo inválido.', 3000); return; }
  // em área usa o pior modificador de altura; num alvo só, o dele
  const mod = Math.min(...validos.map(a => av[alvos.indexOf(a)].mod));
  const cob = Object.fromEntries(validos.map(a => [a.k, av[alvos.indexOf(a)].cob]));
  const rotulo = cfg.tipo === 'tec' ? `${cfg.nome} (N${cfg.nivel})` : `${cfg.nome} em ${validos.length > 1 ? validos.length + ' alvos' : validos[0].nome}`;
  enviar({ tipo: 'ataque', de: ator.k, alvos: validos.map(a => a.k), mod, cob, tirith: tirithHud, dano: cfg.dano, rotulo, dom: cfg.tipo === 'tec' || (cfg.tipo === 'arma' && !!ator.imbuido && !!f && temImbuir(f)), distancia: !!cfg.distancia });
}
function anunciarTurno(m) {
  const b = $('banner'); if (!b) return;
  const minha = m.k === 'pc:' + eu() || (souMestre() && m.k?.startsWith('npc:'));
  b.textContent = m.k === 'pc:' + eu() ? 'Sua vez!' : `Vez de ${m.nome}`;
  b.className = 'banner' + (m.k === 'pc:' + eu() ? ' meu' : ''); b.hidden = false;
  clearTimeout(anunciarTurno.t); anunciarTurno.t = setTimeout(() => { b.hidden = true; }, m.k === 'pc:' + eu() ? 2200 : 1500);
  if (minha && m.k.startsWith('npc:') && souMestre()) selecionar(m.k);
  const t = tokenPorK(m.k); if (t && cena) cena.focar(num(t.x), num(t.y));
}
// trilha de iniciativa no canto do mapa
function trilha() {
  const el = $('iniciativa'); if (!el) return;
  const cb = mesa?.combate;
  if (!cb?.ativo) { el.hidden = true; return; }
  el.innerHTML = `<div class="ini-topo">Rodada ${num(cb.rodada, 1)}</div>` + (cb.ordem || []).map((o, i) => {
    const t = tokenPorK(o.k); if (!t) return '';
    const vis = souMestre() || t.tipo === 'pc', v = num(t.vigor), m = num(t.vigorMax);
    const caido = m && v <= 0, resta = i === cb.turno ? acoesDe(t) : null;
    return `<button class="ini ${i === cb.turno ? 'vez' : ''} ${caido ? 'caido' : ''}" data-ini="${esc(o.k)}"><i style="background:${esc(t.cor || '#8c7a63')}"></i><span class="ini-n">${esc(t.nome)}</span><small>${num(o.ini)}</small>
      ${vis && m ? `<span class="ini-v"><b style="width:${Math.max(0, Math.min(100, v / m * 100))}%"></b></span>` : ''}${resta !== null && t.tipo === 'pc' ? `<span class="ini-a">${'●'.repeat(Math.max(0, resta))}${'○'.repeat(3 - Math.max(0, resta))}</span>` : ''}${t.guarda ? '<span title="Em guarda">⛨</span>' : ''}</button>`;
  }).join('');
  el.hidden = false;
  el.querySelectorAll('[data-ini]').forEach(b => b.onclick = () => { selecionar(b.dataset.ini); const t = tokenPorK(b.dataset.ini); if (t) cena?.focar(num(t.x), num(t.y)); });
}

// ganchos para testes automáticos (só no servidor local)
if (['127.0.0.1', 'localhost'].includes(location.hostname)) globalThis.__arkahad = { selecionar, enviar, iniciarMira, atorAtivo, tokenPorK, get mira() { return mira; }, get mesa() { return mesa; }, get cena() { return cena; } };

// ================= Início =================
(async () => {
  try { config = await (await fetch('/api/config')).json(); } catch { config = { apelido: true }; }
  sessao = lerLS('arkahad.sessao');
  if (sessao) { try { await api('/api/eu'); } catch { sessao = null; } }
  rota();
})();
