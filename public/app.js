import { TERRENOS, LUZES as NOMES_LUZ, LUAS, NIVEIS, num, dijkstra, nivelEm, efeitoAltura } from './regras.js';
import { criarCena } from './cena3d.js';
import { CRIATURAS_3D, ARMAS_3D, SECUNDARIAS, SEXOS, ESTILO_DOM } from './modelos.js';
import { abrirCriador } from './criacao.js';
import {
  ATRIBUTOS, PERICIAS, RACAS, VOCACOES, TODOS_DONS, DONS, CUSTO_DOM, RESSONANCIAS, ORIGENS, ESTRATOS,
  ataqueArma, danoTecnica, bonusTesteDom, temImbuir, TALENTO, ARVORES, pontosTalento,
  aparenciaPadrao, atributosFinais, gradPericia, bonusPericia, ehAurethian, nivelDom, derivados,
} from './conteudo.js';

// ================= CONFIGURAÇÃO VISUAL (fácil de editar) =================
const COR_LUZ = { dia: '#ffb347', noite: '#05060f', azul: '#3f6fe0', conjuncao: '#9a7fe0' };
const MATERIAIS = { cristal: 'Cristal', osso: 'Osso', ferro: 'Ferro Lunar', brasa: 'Brasa' };
const CORES_TERRENO = { '.': '#7d6146', '_': '#8f877b', ',': '#d3ad6a', '"': '#4d7536', '~': '#2a6585', '=': '#7a4e2c', '+': '#5a3a1e', 'v': '#1b1820', '#': '#3a342e', m: '#6b4a2a', h: '#7a7468', k: '#4f8a3a', P: '#24502a', Q: '#6a5040', 'T': '#2d5a27', '^': '#6b6158', '*': '#ff8a1e', b: '#8a5a2a', c: '#b08a52', s: '#c8b48a', n: '#d8c8a0', a: '#7d8288', o: '#c0392f', w: '#6b4423' };

// ================= ESTADO =================
let config = {}, sessao = null, ws = null, codigoAtual = null, reconectar = true, tentativaWs = 0;
let voce = null, sala = null, mesa = null, pcs = {}, npcs = {}, log = [], online = [];
let selecionado = null, aba = 'ficha', modoMestre = 'mover', pincel = '.', tamPincel = 1, pincelAlt = '2', pintandoAlt = null, tocadas = null;
let pintando = null, arrasto = null, alcance = null, npcParaEditar = null, cena = null, quadroPendente = false;
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
      : '<p class="sub">Nenhuma sala aberta. Crie a primeira ao lado.</p>';
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
  avisar('Conectando à mesa…');
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
      if (tentativaWs > 1 && !mesa) { avisar('Não consegui abrir a sala. Ela ainda existe?'); }
      else avisar('Conexão perdida. Reconectando…');
      setTimeout(() => { if (codigoAtual && reconectar) conectar(); }, Math.min(8000, 1000 * tentativaWs));
    }
  };
}
function sairDaSala() {
  reconectar = false; codigoAtual = null; $('modalSenha').hidden = true;
  if (ws) { const w = ws; ws = null; try { w.close(); } catch {} }
}
function enviar(msg) { if (ws?.readyState === 1) ws.send(JSON.stringify(msg)); else avisar('Sem conexão com a mesa.', 2500); }
$('voltar').onclick = () => { location.hash = ''; };

function receber(m) {
  switch (m.tipo) {
    case 'estado': {
      tentativaWs = 0; $('modalSenha').hidden = true;
      const primeira = !voce;
      voce = m.voce; sala = m.sala; mesa = m.mesa; pcs = m.pcs || {}; npcs = m.npcs || {}; log = m.log || []; online = m.online || [];
      if (primeira) avisar('');
      $('abaMestre').hidden = !souMestre();
      if (!souMestre() && aba === 'mestre') aba = 'ficha';
      const t = tokenPorK(selecionado);
      if (selecionado && !t) { selecionado = null; alcance = null; $('cartao').hidden = true; }
      else if (t) calcAlcance(t);
      if (!pintando && !pintandoAlt) render();
      if (aba !== 'dados' || primeira) painel();
      atualizarOnline();
      if (t && !$('cartao').hidden && !$('formNpc')) cartao(t);
      if (npcParaEditar && npcs[npcParaEditar]) { const id = npcParaEditar; npcParaEditar = null; editorNpc(id); }
      break;
    }
    case 'senha':
      avisar('');
      $('senhaTitulo').textContent = 'Senha de “' + (m.sala || 'sala') + '”';
      $('erroSenha').textContent = m.erro || '';
      $('modalSenha').hidden = false; $('senhaSala').value = ''; $('senhaSala').focus();
      break;
    case 'dado': animarDados(m); break;
    case 'ping': mostrarPing(num(m.x), num(m.y), String(m.cor || '#e2b04a')); break;
    case 'aviso': avisar(m.texto, 4000); break;
    case 'erro':
      if (!$('modalSenha').hidden) $('erroSenha').textContent = m.texto; else avisar(m.texto, 3000);
      break;
    case 'npcCriado': npcParaEditar = m.id; break;
    case 'removida':
      reconectar = false; sairDaSala(); location.hash = '';
      setTimeout(() => alertaSaguao(m.texto || 'A sala foi removida pelo Mestre.'), 300);
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
  for (const [id, p] of Object.entries(pcs)) if (p && p.nome) l.push({ k: 'pc:' + id, id, tipo: 'pc', ...p });
  for (const [id, n] of Object.entries(npcs)) if (n) l.push({ k: 'npc:' + id, id, ...n, tipo: n.tipo || 'npc' });
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
  topo();
}
function agendarRender() { if (!quadroPendente) { quadroPendente = true; requestAnimationFrame(render); } }
function topo() {
  if (!mesa) return;
  $('nomeMesa').textContent = mesa.nome || sala?.nome || 'Mesa';
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
function calcAlcance(t) {
  alcance = t && possoMover(t) && mesa.combate?.ativo && !souMestre() ? dijkstra(mesa, ocupadas(t.k), num(t.x), num(t.y), num(t.desloc, 6)) : null;
}
function moverToken(t, x, y) {
  if (!possoMover(t)) return;
  const tam = num(t.tamanho, 1);
  if (x < 0 || y < 0 || x + tam > mesa.cols || y + tam > mesa.rows) return;
  if (!souMestre()) {
    const d = dijkstra(mesa, ocupadas(t.k), num(t.x), num(t.y), mesa.combate?.ativo ? num(t.desloc, 6) : 9999);
    if (!d.has(x + ',' + y)) { avisar(mesa.combate?.ativo ? 'Fora do seu Deslocamento.' : 'Sem caminho até lá.', 2500); return; }
  }
  const base = t.tipo === 'pc' ? pcs : npcs;
  base[t.id] = { ...base[t.id], x, y }; alcance = null; render();
  enviar({ tipo: 'mover', k: t.k, x, y });
}

// ================= Entrada no mapa =================
function dentro(x, y) { return mesa && x >= 0 && y >= 0 && x < mesa.cols && y < mesa.rows; }
function aoPressionar(i, e) {
  if (!mesa) return;
  if (souMestre() && modoMestre === 'pintar') { pintando = mesa.grid.slice(); pintar(i.x, i.y); return; }
  if (souMestre() && modoMestre === 'altura') { pintandoAlt = altDe(mesa).slice(); tocadas = new Set(); pintarAlt(i.x, i.y); return; }
  if (souMestre() && modoMestre === 'npc' && !i.k) { if (dentro(i.x, i.y)) enviar({ tipo: 'npc', dados: { x: i.x, y: i.y } }); return; }
  if (i.k) arrasto = { k: i.k, x: i.x, y: i.y };
}
function aoMover(i) { if (pintando) pintar(i.x, i.y); if (pintandoAlt) pintarAlt(i.x, i.y); }
function aoSoltar(i) {
  if (pintando) { const g = pintando; pintando = null; enviar({ tipo: 'mesa', dados: { grid: g } }); return; }
  if (pintandoAlt) { const a = pintandoAlt; pintandoAlt = null; tocadas = null; enviar({ tipo: 'mesa', dados: { alt: a } }); return; }
  if (arrasto) {
    const a = arrasto; arrasto = null; const t = tokenPorK(a.k);
    if (!t || (a.x === i.x && a.y === i.y) || i.k === a.k) { selecionar(a.k); return; }
    moverToken(t, i.x, i.y); return;
  }
  const t = tokenPorK(selecionado);
  if (i.k && i.k !== selecionado) { selecionar(i.k); return; }
  if (t && possoMover(t) && dentro(i.x, i.y)) moverToken(t, i.x, i.y);
  else { selecionado = null; alcance = null; $('cartao').hidden = true; render(); }
}
function pintar(x, y) {
  for (let i = 0; i < tamPincel; i++) for (let j = 0; j < tamPincel; j++) {
    const px = x + i, py = y + j;
    if (!dentro(px, py)) continue;
    const l = pintando[py]; pintando[py] = l.slice(0, px) + pincel + l.slice(px + 1);
  }
  mesa = { ...mesa, grid: pintando.slice() }; agendarRender();
}
function altDe(m) { return Array.from({ length: m.rows }, (_, y) => String(m.alt?.[y] || '').padEnd(m.cols, '1').slice(0, m.cols)); }
function pintarAlt(x, y) {
  for (let i = 0; i < tamPincel; i++) for (let j = 0; j < tamPincel; j++) {
    const px = x + i, py = y + j, ch = px + ',' + py;
    if (!dentro(px, py) || tocadas.has(ch)) continue; tocadas.add(ch);
    const l = pintandoAlt[py], atual = l[px];
    let novo = pincelAlt;
    if (pincelAlt === '+') novo = String(Math.min(4, Number(atual) + 1));
    if (pincelAlt === '-') novo = String(Math.max(0, Number(atual) - 1));
    pintandoAlt[py] = l.slice(0, px) + novo + l.slice(px + 1);
  }
  mesa = { ...mesa, alt: pintandoAlt.slice() }; agendarRender();
}
function mostrarPing(x, y, cor) { cena?.ping(x, y, cor); }
$('zMais').onclick = () => cena?.zoom(.8);
$('zMenos').onclick = () => cena?.zoom(1.25);
$('girarE').onclick = () => cena?.girar(Math.PI / 4);
$('girarD').onclick = () => cena?.girar(-Math.PI / 4);
$('centrar').onclick = () => { const p = pcs[eu()]; if (p && cena) cena.focar(num(p.x), num(p.y)); else cena?.enquadrar(); };

// ================= Cartão de token =================
function selecionar(k) { selecionado = k; const t = tokenPorK(k); calcAlcance(t); render(); cartao(t); }
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
  if (souMestre() && t.tipo === 'pc' && t.id !== eu()) h += `<div style="margin-top:10px"><button id="expulsar">Remover jogador da mesa</button></div>`;
  if (possoMover(t)) h += `<p style="color:var(--mudo);font-size:13px;margin-top:10px">Clique numa casa do mapa (ou arraste a miniatura) para mover. Botão direito gira a câmera.</p>`;
  c.innerHTML = h; c.hidden = false;
  $('fechaCartao').onclick = () => { c.hidden = true; selecionado = null; alcance = null; render(); };
  let iFala = 0; if ($('outraFala')) $('outraFala').onclick = () => { iFala = (iFala + 1) % falas.length; $('fala').textContent = '“' + falas[iFala] + '”'; };
  c.querySelectorAll('[data-mv]').forEach(b => b.onclick = () => ajustar(b.dataset.k, b.dataset.mv, num(b.dataset.d)));
  if ($('atacarAlvo')) $('atacarAlvo').onclick = e => rolarTeste(e.currentTarget.dataset.rot, num(e.currentTarget.dataset.mod));
  if (edita) {
    $('editarNpc').onclick = () => editorNpc(t.id);
    $('visNpc').onclick = () => enviar({ tipo: 'npc', id: t.id, dados: { visivel: t.visivel === false } });
    confirmar($('apagarNpc'), () => { enviar({ tipo: 'apagarNpc', id: t.id }); c.hidden = true; });
  }
  if ($('expulsar')) confirmar($('expulsar'), () => { enviar({ tipo: 'expulsar', id: t.id }); c.hidden = true; });
}
function confirmar(b, acao) { b.onclick = () => { if (!b.dataset.ok) { b.dataset.ok = 1; b.textContent = 'Confirmar?'; return; } acao(); }; }
function ajustar(k, campo, d) {
  const [tipo, id] = partir(k); const base = tipo === 'pc' ? pcs : npcs;
  if (!base[id]) return;
  const v = num(base[id][campo]) + d;
  base[id] = { ...base[id], [campo]: v }; render(); painel();
  if (!$('cartao').hidden && selecionado === k) cartao(tokenPorK(k));
  enviar({ tipo: tipo === 'pc' ? 'pc' : 'npc', id, dados: { [campo]: v } });
}

// ================= Dados (3D) =================
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
  enviar({ tipo: 'rolar', modo: 'teste', mod, tirith: $('fichaTirith')?.value || 'normal', dif: num($('fichaDif')?.value), dom, rotulo });
}
function usarTecnica(nivel, nome) {
  const p = pcs[eu()], f = p?.ficha; if (!f) return;
  const custo = CUSTO_DOM[nivel - 1], a = atributosFinais(f), dom = TODOS_DONS[f.dom];
  let folego = num(p.folego), tensao = num(p.tensao);
  const falta = Math.max(0, custo - folego);
  folego = Math.max(0, folego - custo); tensao += falta + (nivel >= 4 ? 1 : 0);
  pcs[eu()] = { ...p, folego, tensao }; painel(); render();
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
  const tecnicas = (dd, nn) => dd.tec.slice(0, nn).map((t, i) => `<button class="tec" data-tec="${i + 1}" data-nome="${esc(t)}" ${dd !== dom ? 'data-sec="1"' : ''}><span><b>N${i + 1}</b> ${esc(t)}</span><small>${CUSTO_DOM[i]} Fôlego · ${danoTecnica(f, i + 1)}</small></button>`).join('');
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
    <div class="linha" style="margin-top:8px"><div><label for="fichaDif">DIF</label><input id="fichaDif" type="number" placeholder="—"></div><div><label for="fichaTirith">Dado de Tirith</label><select id="fichaTirith"><option value="normal">Normal</option><option value="vantagem">Vantagem</option><option value="desvantagem">Desvantagem</option></select></div></div>
    <p class="cr-nota" style="margin:6px 0 0">Clique num atributo, perícia ou técnica para rolar.</p></div>
    ${blocoCombate}
    ${dom ? `<div class="bloco"><h3 style="color:${dom.cor}">${esc(dom.nome)} — ${esc(dom.tema)}</h3><div style="font-size:13px;color:var(--mudo);margin-bottom:6px">Chave ${dom.chave} · Canalização ${gradPericia(f, 'canalizacao')} · Cristal ${esc(RESSONANCIAS[f.ressonancia]?.nome || '')}</div>${tecnicas(dom, n)}
      ${dom2 ? `<h3 style="color:${dom2.cor};margin-top:10px">${esc(dom2.nome)} (secundário)</h3>${tecnicas(dom2, Math.max(1, n - 1))}` : ''}</div>` : ''}
    <div class="bloco"><h3>Perícias</h3><div class="pers">${destaques.map(linhaPer).join('')}</div>
      <details><summary>Outras perícias</summary><div class="pers">${outras.map(linhaPer).join('')}</div></details></div>
    <div class="bloco"><h3>${esc(voc.nome)}</h3><p style="margin:0 0 6px">${esc(voc.hab)}</p><div style="font-size:14px;color:var(--mudo)">Kit: ${esc(voc.kit)} · Armadura: ${esc(d.armadura)}</div>
      ${f.fardo ? `<p style="margin:8px 0 0"><b>Fardo:</b> ${esc(f.fardo)}</p>` : ''}${f.juramento ? `<p style="margin:4px 0 0"><b>Juramento:</b> ${esc(f.juramento)}</p>` : ''}
      ${(f.facanhas || []).length ? `<p style="margin:4px 0 0"><b>Façanhas:</b> ${f.facanhas.map(esc).join(', ')}</p>` : ''}</div>
    <button class="pri" id="abrirCriador" style="width:100%">Editar personagem</button>`;
}
function abrirCriacao() {
  const p = pcs[eu()];
  cena?.pausar(true);
  abrirCriador({
    ficha: p?.ficha, dadosCor: p?.dados, aoFechar: () => cena?.pausar(false),
    aoSalvar(f, dc) {
      const d = derivados(f);
      const dados = {
        nome: f.nome, sigla: f.sigla || f.nome.slice(0, 2), cor: f.aparencia.base,
        vigorMax: d.vigorMax, folegoMax: d.folegoMax, limiar: d.limiar, defesa: d.defesa, desloc: d.desloc, ini: d.ini,
        robustez: d.robustez, determinacao: d.determinacao, protecao: d.protecao, limiarFer: d.limiarFer,
        ficha: f, aparencia: f.aparencia, dados: dc,
      };
      if (!p) Object.assign(dados, { vigor: d.vigorMax, folego: d.folegoMax });
      enviar({ tipo: 'pc', dados }); avisar('Personagem salvo.', 2000);
    },
  });
}

// ================= Painel lateral =================
$('abas').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; aba = b.dataset.aba; painel(); });
function painel() {
  document.querySelectorAll('#abas button').forEach(x => x.classList.toggle('ativo', x.dataset.aba === aba));
  const c = $('conteudo'), rolagem = c.scrollTop, dif = $('fichaDif')?.value, tir = $('fichaTirith')?.value;
  if (aba === 'ficha') c.innerHTML = htmlFicha();
  else if (aba === 'dados') c.innerHTML = htmlDados();
  else if (aba === 'registro') c.innerHTML = htmlRegistro();
  else if (aba === 'mestre') c.innerHTML = htmlMestre();
  c.scrollTop = rolagem;
  if ($('fichaDif') && dif !== undefined) $('fichaDif').value = dif;
  if ($('fichaTirith') && tir) $('fichaTirith').value = tir;
  ligar();
}
function htmlFicha() {
  if (!voce) return '<p class="sub">Conectando…</p>';
  const p = pcs[eu()];
  let h = '';
  if (souMestre() && !p) h += `<div class="bloco"><h3>Você é o Mestre</h3><p style="margin:0">Use a aba Mestre para o mapa, NPCs e combate. Se quiser, crie também um personagem.</p></div>`;
  if (mesa?.combate?.ativo && p) h += `<div class="bloco"><h3>${minhaVez() ? 'Sua vez!' : 'Combate em andamento'}</h3>${minhaVez() ? `<p style="margin:0 0 8px">Ações neste turno (mover gasta 1):</p><div class="pips">${[0, 1, 2].map(i => `<button data-pip="${i}" class="${i < acoesUsadas() ? 'usada' : ''}">${i + 1}</button>`).join('')}</div><button id="fimTurno" style="margin-top:10px">Avisar fim do turno</button>` : '<p style="margin:0">Aguarde seu turno para se mover.</p>'}</div>`;
  if (p?.ficha) return h + htmlFichaCompleta(p);
  if (p) return h + `<div class="bloco"><h3>${esc(p.nome)}</h3>${medidor('Vigor', 'vigor', 'vigorMax', '#5d9a4a', { ...p, k: 'pc:' + eu() }, true)}<p>Este personagem foi criado no modo simples.</p></div><button class="pri" id="abrirCriador" style="width:100%">Criar ficha completa</button>`;
  return h + `<div class="bloco"><h3>Sem personagem nesta mesa</h3><p style="margin:0 0 10px">Monte sua miniatura: raça, vocação, Dom, atributos, perícias e aparência — tudo equilibrado pelas regras de Arkahad.</p><button class="pri" id="abrirCriador" style="width:100%">Criar personagem</button></div>`;
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
  return `<ul class="registro">${log.length ? log.map(x => `<li><span class="ponto" style="display:inline-block;background:${esc(x.cor)}"></span> <b>${esc(x.nome)}</b>${x.rotulo ? ' · ' + esc(x.rotulo) : ''}${x.oculta ? ' · oculta' : ''} — <b style="color:var(--ouro);font-size:18px">${num(x.total)}</b>${x.grau ? ' · ' + esc(x.grau) : ''}<div style="color:var(--mudo);font-size:13px">${esc(x.desc)} · ${new Date(x.t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>${(x.tags || []).map(t => `<span class="tag ${/Ruína|Aranor|Eco/.test(t) ? 'ruim' : ''}">${esc(t)}</span>`).join('')}</li>`).join('') : '<li>Nenhuma rolagem ainda.</li>'}</ul>`;
}
function htmlMestre() {
  if (!souMestre() || !mesa) return '';
  const cb = mesa.combate || {};
  return `<div class="bloco"><h3>Ferramenta</h3><div class="linha">${[['mover', 'Mover'], ['pintar', 'Pintar terreno'], ['altura', 'Altura'], ['npc', 'Colocar NPC']].map(([k, n]) => `<button data-modo="${k}" class="${modoMestre === k ? 'ativo' : ''}">${n}</button>`).join('')}</div>
    ${modoMestre === 'pintar' ? `<div class="paleta" style="margin-top:10px">${Object.entries(TERRENOS).map(([k, t]) => `<button data-pincel="${esc(k)}" class="${pincel === k ? 'ativo' : ''}"><i class="amostra" style="background:${CORES_TERRENO[k]}"></i>${esc(t.n)}</button>`).join('')}</div><label for="m_tam">Tamanho do pincel</label><select id="m_tam">${[1, 2, 3].map(n => `<option ${tamPincel === n ? 'selected' : ''}>${n}</option>`).join('')}</select>` : ''}
    ${modoMestre === 'altura' ? `<div class="paleta" style="margin-top:10px">${[...Object.entries(NIVEIS), ['+', 'Subir 1 nível'], ['-', 'Descer 1 nível']].map(([k, n]) => `<button data-alt="${k}" class="${pincelAlt === k ? 'ativo' : ''}"><i class="amostra" style="background:${{ '0': '#2a3a4a', '1': '#7d6146', '2': '#9a7a52', '3': '#b8956a', '4': '#d8c09a', '+': '#5d9a4a', '-': '#c0392f' }[k]}"></i>${esc(n)}</button>`).join('')}</div><label for="m_tam">Tamanho do pincel</label><select id="m_tam">${[1, 2, 3].map(n => `<option ${tamPincel === n ? 'selected' : ''}>${n}</option>`).join('')}</select>
      <p class="cr-nota" style="margin:8px 0 0">Arraste no mapa para elevar ou afundar. Subir 1 nível custa +1 casa de movimento; desníveis de 2+ só escalando (você move). Quem ataca de cima ganha +2; de baixo, −2.</p>` : ''}
    ${modoMestre === 'npc' ? '<p style="margin:8px 0 0;color:var(--mudo)">Clique numa casa vazia para criar um NPC.</p>' : ''}</div>
    <div class="bloco"><h3>Céu da cena</h3><label for="m_luz">Luz</label><select id="m_luz">${Object.entries(NOMES_LUZ).map(([k, n]) => `<option value="${k}" ${mesa.luz === k ? 'selected' : ''}>${n}</option>`).join('')}</select>
    <label for="m_lua">Lua dominante</label><select id="m_lua">${Object.entries(LUAS).map(([k, n]) => `<option value="${k}" ${mesa.lua === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
    <div class="bloco"><h3>Combate</h3>${cb.ativo ? `<p style="margin:0 0 8px">Rodada ${num(cb.rodada, 1)} · vez de <b>${esc(nomeDe(cb.ordem?.[cb.turno]?.k))}</b></p><div class="linha"><button class="pri" id="proxTurno">Próximo turno</button><button id="fimCombate">Encerrar combate</button></div>` : `<button class="pri" id="iniCombate" style="width:100%">Iniciar combate (rola iniciativa)</button><p style="color:var(--mudo);font-size:13px">Entram todos os jogadores e os NPCs visíveis.</p>`}</div>
    <div class="bloco"><h3>NPCs e criaturas</h3>${Object.entries(npcs).map(([id, n]) => `<div style="display:flex;gap:6px;align-items:center;margin:4px 0"><span class="ponto" style="background:${esc(n.cor)}"></span><span class="cresce">${esc(n.nome)}${n.visivel === false ? ' (oculto)' : ''}</span><button class="mini" data-ed="${esc(id)}">Editar</button></div>`).join('') || '<p>Nenhum. Use “Colocar NPC”.</p>'}</div>
    <div class="bloco"><h3>Mapa e sala</h3><label for="m_nome">Nome da mesa</label><input id="m_nome" type="text" value="${esc(mesa.nome)}">
    <div class="linha"><div><label for="m_cols">Colunas</label><input id="m_cols" type="number" value="${mesa.cols}"></div><div><label for="m_rows">Linhas</label><input id="m_rows" type="number" value="${mesa.rows}"></div></div>
    <button id="salvarMapa" style="margin-top:10px;width:100%">Salvar nome e tamanho</button>
    <label for="m_senha">Nova senha da sala</label><div style="display:flex;gap:8px"><input id="m_senha" type="password" autocomplete="new-password"><button id="trocarSenha">Trocar</button></div></div>`;
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
    const dados = { nome: v('nome'), sigla: v('sigla'), cor: v('cor'), tipo: v('tipo'), raca, aparencia, vigor: num(v('vigor')), vigorMax: num(v('vigorMax')), defesa: num(v('defesa')), ini: num(v('ini')), desloc: num(v('desloc'), 6), tamanho: num(v('tamanho'), 1), visivel: $('n_visivel').checked, descricao: v('descricao'), falas: v('falas').split('\n').map(s => s.trim()).filter(Boolean), notas: v('notas') };
    npcs[id] = { ...npcs[id], ...dados }; enviar({ tipo: 'npc', id, dados });
    selecionar('npc:' + id);
  };
}
function ligar() {
  const q = s => document.querySelector(s);
  if (q('#abrirCriador')) q('#abrirCriador').onclick = abrirCriacao;
  document.querySelectorAll('#conteudo [data-mv]').forEach(b => b.onclick = () => ajustar(b.dataset.k, b.dataset.mv, num(b.dataset.d)));
  document.querySelectorAll('#conteudo [data-rolar]').forEach(b => b.onclick = () => rolarTeste(b.dataset.rolar, num(b.dataset.mod)));
  document.querySelectorAll('#conteudo [data-tec]').forEach(b => b.onclick = () => usarTecnica(num(b.dataset.tec), b.dataset.nome));
  document.querySelectorAll('#conteudo [data-dano]').forEach(b => b.onclick = () => enviar({ tipo: 'rolar', modo: 'expr', expr: b.dataset.dano, rotulo: 'Dano · ' + b.dataset.nome }));
  if (q('#imbuir')) q('#imbuir').onclick = () => {
    const p = pcs[eu()]; if (!p?.ficha) return;
    const liga = !p.imbuido, gratis = (p.ficha.talentos || []).includes('imb4');
    const dados = { imbuido: liga };
    if (liga && !gratis) { if (num(p.folego) < 1) { avisar('Sem Fôlego para imbuir a arma.', 2500); return; } dados.folego = num(p.folego) - 1; }
    pcs[eu()] = { ...p, ...dados }; painel(); render(); enviar({ tipo: 'pc', dados });
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
  document.querySelectorAll('[data-modo]').forEach(b => b.onclick = () => { modoMestre = b.dataset.modo; painel(); });
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

// ganchos para testes automáticos (só no servidor local)
if (['127.0.0.1', 'localhost'].includes(location.hostname)) globalThis.__arkahad = { selecionar, enviar, get cena() { return cena; } };

// ================= Início =================
(async () => {
  try { config = await (await fetch('/api/config')).json(); } catch { config = { apelido: true }; }
  sessao = lerLS('arkahad.sessao');
  if (sessao) { try { await api('/api/eu'); } catch { sessao = null; } }
  rota();
})();
