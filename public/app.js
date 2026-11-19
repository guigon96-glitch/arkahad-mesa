import { TERRENOS, LUZES as NOMES_LUZ, LUAS, num, custoCel, dijkstra } from './regras.js';

// ================= CONFIGURAÇÃO VISUAL (fácil de editar) =================
const CEL = 48;
const LUZES = {
  dia: { cor: '#ffb347', op: .10, sombras: [['#000', .35, 6, 8]] },
  noite: { cor: '#05060f', op: .62, sombras: [] },
  azul: { cor: '#1d4fb8', op: .42, sombras: [['#0a1d4d', .5, -10, 12]] },
  conjuncao: { cor: '#7a5fd0', op: .25, sombras: [['#000', .45, 8, 8], ['#7fb2ff', .45, -9, 7]] },
};
const COR_LUA = { nenhuma: null, aranor: '#c0392f', nimriel: '#2fd3b4', tirith: '#e8f4ff', triade: '#c9a0ff' };
const MATERIAIS = { cristal: 'Cristal', osso: 'Osso', ferro: 'Ferro Lunar', brasa: 'Brasa' };
const CLIP = {
  10: 'polygon(50% 0,100% 40%,50% 100%,0 40%)', 6: 'inset(6% round 14%)', 4: 'polygon(50% 4%,98% 94%,2% 94%)',
  8: 'polygon(50% 0,100% 50%,50% 100%,0 50%)', 12: 'polygon(50% 0,95% 30%,82% 92%,18% 92%,5% 30%)', 20: 'polygon(50% 0,95% 25%,95% 75%,50% 100%,5% 75%,5% 25%)',
};

// ================= ESTADO =================
let config = {}, sessao = null, ws = null, codigoAtual = null, reconectar = true, tentativaWs = 0;
let voce = null, sala = null, mesa = null, pcs = {}, npcs = {}, log = [], online = [];
let zoom = 1, selecionado = null, aba = 'ficha', modoMestre = 'mover', pincel = '.', tamPincel = 1;
let pintando = null, arrasto = null, alcance = null, npcParaEditar = null;
const memo = { mod: 0, dif: '', expr: '1d8+3' };
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const souMestre = () => !!voce?.mestre;
const eu = () => voce?.id;
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
      if (!pintando) render();
      if (aba !== 'dados' || primeira) painel();
      atualizarOnline();
      const t = tokenPorK(selecionado);
      if (selecionado && !t) { selecionado = null; $('cartao').hidden = true; }
      else if (t) { calcAlcance(t); if (!$('cartao').hidden && !$('formNpc')) cartao(t); }
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

// ================= SVG: padrões de terreno =================
const ID = {}; Object.keys(TERRENOS).forEach((k, i) => ID[k] = 't' + i);
function padroes() {
  const p = (k, corpo) => `<pattern id="${ID[k]}" width="${CEL}" height="${CEL}" patternUnits="userSpaceOnUse">${corpo}</pattern>`;
  const base = c => `<rect width="48" height="48" fill="${c}"/>`;
  const grama = `${base('#4d7536')}<path d="M8 40l2-7M12 40l-1-6M30 18l2-6M34 18l-1-5M38 42l2-6M22 30l-2-6" stroke="#79a85a" stroke-width="2" stroke-linecap="round"/>`;
  return `<defs>
  ${p('.', `${base('#7d6146')}<ellipse cx="14" cy="12" rx="4" ry="2" fill="#6a513a"/><ellipse cx="34" cy="34" rx="5" ry="2.5" fill="#8c6f51"/><circle cx="38" cy="10" r="1.5" fill="#5e4733"/>`)}
  ${p('_', `${base('#8f877b')}<path d="M0 24H48M24 0V24M12 24V48M36 24V48" stroke="#6e675d" stroke-width="2"/><rect x="2" y="2" width="20" height="3" fill="#a9a194"/>`)}
  ${p(',', `${base('#d3ad6a')}<path d="M0 30q12-6 24 0t24 0" stroke="#e7c78a" stroke-width="2" fill="none"/><circle cx="10" cy="12" r="1.2" fill="#b38f50"/><circle cx="36" cy="16" r="1.2" fill="#b38f50"/><circle cx="20" cy="40" r="1" fill="#b38f50"/>`)}
  ${p('"', grama)}
  ${p('~', `${base('#2a6585')}<g stroke="#5fa4c4" stroke-width="2" fill="none"><path d="M-48 14q12-6 24 0t24 0t24 0t24 0t24 0"/><path d="M-48 34q12-6 24 0t24 0t24 0t24 0t24 0"/><animateTransform attributeName="transform" type="translate" from="0 0" to="48 0" dur="5s" repeatCount="indefinite"/></g>`)}
  ${p('=', `${base('#7a4e2c')}<path d="M0 12H48M0 24H48M0 36H48" stroke="#5a3820" stroke-width="2"/><circle cx="8" cy="6" r="1.4" fill="#3d2513"/><circle cx="40" cy="30" r="1.4" fill="#3d2513"/>`)}
  ${p('+', `${base('#5a3a1e')}<path d="M16 0V48M32 0V48" stroke="#3f2711" stroke-width="2"/><rect x="0" y="20" width="48" height="6" fill="#4b4b52"/><circle cx="38" cy="24" r="3" fill="#c9a24a"/>`)}
  ${p('v', `${base('#1b1820')}<path d="M4 44L22 6M26 46L44 12" stroke="#4a4458" stroke-width="2"/><path d="M8 40L18 18" stroke="#8d86a3" stroke-width="1"/>`)}
  ${p('#', `${base('#3a342e')}<path d="M0 16H48M0 32H48M20 0V16M8 16V32M34 16V32M22 32V48" stroke="#252019" stroke-width="2"/><rect width="48" height="4" fill="#5a5148"/>`)}
  ${p('T', `${grama}<circle cx="26" cy="28" r="18" fill="#000" opacity=".25"/><circle cx="24" cy="24" r="18" fill="#2d5a27"/><circle cx="19" cy="19" r="9" fill="#3f7735"/><circle cx="17" cy="16" r="3" fill="#5c9a4c"/>`)}
  ${p('^', `${base('#7d6146')}<path d="M8 38L14 14L30 8L42 22L38 40Z" fill="#6b6158"/><path d="M14 14L30 8L26 20Z" fill="#8c8278"/><path d="M8 38L38 40L42 22" fill="none" stroke="#4a423b" stroke-width="2"/>`)}
  ${p('*', `${base('#7d6146')}<circle cx="24" cy="24" r="15" fill="none" stroke="#5a5550" stroke-width="5" stroke-dasharray="6 3"/><path d="M24 10C32 22 34 28 24 34C14 28 16 22 24 10Z" fill="#ff8a1e"><animate attributeName="opacity" values="1;.7;1" dur=".8s" repeatCount="indefinite"/></path><path d="M24 18C28 25 28 29 24 32C20 29 20 25 24 18Z" fill="#ffe08a"/>`)}
  <pattern id="grade" width="${CEL}" height="${CEL}" patternUnits="userSpaceOnUse"><path d="M48 0H0V48" fill="none" stroke="#000" stroke-opacity=".28" stroke-width="1"/></pattern>
  <radialGradient id="brilhoFogo"><stop offset="0" stop-color="#ffb347" stop-opacity=".55"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>
  </defs>`;
}

// ================= Renderização do mapa =================
function tokensTodos() {
  const l = [];
  for (const [id, p] of Object.entries(pcs)) if (p && p.nome) l.push({ k: 'pc:' + id, id, tipo: 'pc', ...p });
  for (const [id, n] of Object.entries(npcs)) if (n) l.push({ k: 'npc:' + id, id, ...n, tipo: n.tipo || 'npc' });
  return l;
}
function render() {
  const svg = $('mapa');
  if (!mesa) { svg.innerHTML = ''; svg.setAttribute('width', 0); return; }
  const C = mesa.cols, R = mesa.rows, W = C * CEL, H = R * CEL;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', W * zoom); svg.setAttribute('height', H * zoom);
  let cel = ''; const fogos = [];
  for (let y = 0; y < R; y++) { const linha = mesa.grid[y] || ''; for (let x = 0; x < C; x++) { const c = TERRENOS[linha[x]] ? linha[x] : '.'; cel += `<rect x="${x * CEL}" y="${y * CEL}" width="${CEL}" height="${CEL}" fill="url(#${ID[c]})"/>`; if (c === '*') fogos.push([x, y]); } }
  const luz = LUZES[mesa.luz] || LUZES.dia, corLua = COR_LUA[mesa.lua];
  let alc = '';
  if (alcance) for (const [key, d] of alcance) { const [x, y] = key.split(',').map(Number); if (d > 0) alc += `<rect x="${x * CEL + 3}" y="${y * CEL + 3}" width="${CEL - 6}" height="${CEL - 6}" rx="6" fill="#e2b04a" opacity=".18" stroke="#e2b04a" stroke-opacity=".5"/>`; }
  let toks = '';
  for (const t of tokensTodos()) {
    const tam = Math.max(1, num(t.tamanho, 1)), rr = tam * CEL / 2, cx = rr, cy = rr;
    const meu = t.tipo === 'pc' && t.id === eu(), sel = selecionado === t.k;
    let somb = ''; for (const [c, o, dx, dy] of luz.sombras) somb += `<ellipse cx="${cx + dx}" cy="${cy + dy + rr * .55}" rx="${rr * .78}" ry="${rr * .3}" fill="${c}" opacity="${o}"/>`;
    const cor = t.cor || (t.tipo === 'pc' ? '#e2b04a' : t.tipo === 'monstro' ? '#c0392f' : '#8c7a63');
    const fr = Math.max(0, Math.min(1, num(t.vigor) / Math.max(1, num(t.vigorMax, 1))));
    const vida = (souMestre() || t.tipo === 'pc') && num(t.vigorMax) > 0 ? `<rect x="${cx - rr * .7}" y="${tam * CEL - 7}" width="${rr * 1.4}" height="5" rx="2" fill="#000a"/><rect x="${cx - rr * .7}" y="${tam * CEL - 7}" width="${rr * 1.4 * fr}" height="5" rx="2" fill="${fr > .5 ? '#5d9a4a' : num(t.vigor) > 0 ? '#e0a23a' : '#c0392f'}"/>` : '';
    toks += `<g class="tok" data-k="${esc(t.k)}" style="transform:translate(${num(t.x) * CEL}px,${num(t.y) * CEL}px)"${t.visivel === false ? ' opacity=".45"' : ''}>${somb}
      <circle cx="${cx}" cy="${cy}" r="${rr - 5}" fill="#120e0a" stroke="${esc(cor)}" stroke-width="${meu ? 5 : 3.5}"/>
      <circle cx="${cx}" cy="${cy}" r="${rr - 10}" fill="${esc(cor)}" opacity=".85"/>
      <text x="${cx}" y="${cy + 6 * tam}" text-anchor="middle" font-family="Cinzel,serif" font-weight="700" font-size="${16 * tam}" fill="#fff" stroke="#000" stroke-width="2.5" paint-order="stroke">${esc((t.sigla || t.nome || '?').slice(0, 2).toUpperCase())}</text>
      ${sel ? `<circle class="sel" cx="${cx}" cy="${cy}" r="${rr - 1}" fill="none" stroke="#e2b04a" stroke-width="2.5" stroke-dasharray="7 5"/>` : ''}${vida}</g>`;
  }
  svg.innerHTML = padroes() + `<g>${cel}</g>
    ${fogos.map(([x, y]) => `<circle cx="${x * CEL + 24}" cy="${y * CEL + 24}" r="${CEL * 2.2}" fill="url(#brilhoFogo)"/>`).join('')}
    <rect width="${W}" height="${H}" fill="url(#grade)"/>
    <g>${alc}</g><g id="tokens">${toks}</g>
    <rect width="${W}" height="${H}" fill="${luz.cor}" opacity="${luz.op}" style="mix-blend-mode:multiply" pointer-events="none"/>
    ${corLua ? `<rect width="${W}" height="${H}" fill="${corLua}" opacity="${mesa.luz === 'dia' ? 0 : .1}" pointer-events="none"/>` : ''}
    <g id="pings" pointer-events="none"></g>`;
  topo();
}
function topo() {
  if (!mesa) return;
  $('nomeMesa').textContent = mesa.nome || sala?.nome || 'Mesa';
  $('chipCeu').innerHTML = `<span class="ponto" style="background:${(LUZES[mesa.luz] || LUZES.dia).cor}"></span>${esc(NOMES_LUZ[mesa.luz] || NOMES_LUZ.dia)} · ${esc(LUAS[mesa.lua] || LUAS.nenhuma)}`;
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
function celulaDe(e) { const s = $('mapa').getBoundingClientRect(); return [Math.floor((e.clientX - s.left) / (CEL * zoom)), Math.floor((e.clientY - s.top) / (CEL * zoom))]; }
$('mapa').addEventListener('pointerdown', e => {
  if (!mesa) return;
  const g = e.target.closest('.tok'); const [x, y] = celulaDe(e);
  if (souMestre() && modoMestre === 'pintar') { pintando = mesa.grid.slice(); pintar(x, y); $('mapa').setPointerCapture(e.pointerId); return; }
  if (souMestre() && modoMestre === 'npc' && !g) { enviar({ tipo: 'npc', dados: { x, y } }); return; }
  if (g) { arrasto = { k: g.dataset.k, x, y }; $('mapa').setPointerCapture(e.pointerId); }
});
$('mapa').addEventListener('pointermove', e => { if (pintando) { const [x, y] = celulaDe(e); pintar(x, y); } });
$('mapa').addEventListener('pointerup', e => {
  const [x, y] = celulaDe(e);
  if (pintando) { const g = pintando; pintando = null; enviar({ tipo: 'mesa', dados: { grid: g } }); return; }
  if (arrasto) {
    const a = arrasto; arrasto = null; const t = tokenPorK(a.k);
    if (!t || (a.x === x && a.y === y)) { selecionar(a.k); return; }
    moverToken(t, x, y); return;
  }
  const t = tokenPorK(selecionado);
  if (t && possoMover(t)) moverToken(t, x, y);
  else { selecionado = null; alcance = null; $('cartao').hidden = true; render(); }
});
$('mapa').addEventListener('dblclick', e => { const [x, y] = celulaDe(e); enviar({ tipo: 'ping', x, y }); });
function pintar(x, y) {
  for (let i = 0; i < tamPincel; i++) for (let j = 0; j < tamPincel; j++) {
    const px = x + i, py = y + j;
    if (px < 0 || py < 0 || px >= mesa.cols || py >= mesa.rows) continue;
    const l = pintando[py]; pintando[py] = l.slice(0, px) + pincel + l.slice(px + 1);
  }
  mesa = { ...mesa, grid: pintando.slice() }; render();
}
function mostrarPing(x, y, cor) {
  const g = $('pings'); if (!g) return;
  const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  c.setAttribute('cx', x * CEL + 24); c.setAttribute('cy', y * CEL + 24); c.setAttribute('r', 22);
  c.setAttribute('fill', 'none'); c.setAttribute('stroke', cor); c.setAttribute('stroke-width', 4); c.setAttribute('class', 'ping');
  g.appendChild(c); setTimeout(() => c.remove(), 1500);
}
$('zMais').onclick = () => { zoom = Math.min(2.2, zoom + .2); render(); };
$('zMenos').onclick = () => { zoom = Math.max(.4, zoom - .2); render(); };
$('palco').addEventListener('wheel', e => { if (!e.ctrlKey) return; e.preventDefault(); zoom = Math.max(.4, Math.min(2.2, zoom - (e.deltaY > 0 ? .1 : -.1))); render(); }, { passive: false });

// ================= Cartão de token =================
function selecionar(k) { selecionado = k; const t = tokenPorK(k); calcAlcance(t); render(); cartao(t); }
function estadoVida(t) { const v = num(t.vigor), m = num(t.vigorMax, 0); if (!m) return ''; if (v <= 0) return 'Caído'; if (v / m <= .25) return 'À beira da morte'; if (v / m <= .5) return 'Ferido'; if (v < m) return 'Arranhado'; return 'Ileso'; }
function medidor(rot, campo, max, cor, t, pode) {
  const v = num(t[campo]), m = Math.max(1, num(t[max], 1));
  return `<div class="medidor"><span>${rot}</span><div class="barra"><i style="width:${Math.max(0, Math.min(100, v / m * 100))}%;background:${cor}"></i></div><span>${v}/${num(t[max])}${pode ? ` <button class="mini" data-mv="${campo}" data-d="-1" data-k="${esc(t.k)}">−</button><button class="mini" data-mv="${campo}" data-d="1" data-k="${esc(t.k)}">+</button>` : ''}</span></div>`;
}
function cartao(t) {
  const c = $('cartao'); if (!t) { c.hidden = true; return; }
  const meu = t.tipo === 'pc' && t.id === eu(), edita = souMestre() && t.tipo !== 'pc';
  const falas = (t.falas || []).filter(Boolean);
  let h = `<button class="fecha" id="fechaCartao" aria-label="Fechar">×</button>
    <h2 style="font-size:20px;padding-right:40px">${esc(t.nome)}</h2>
    <div style="color:var(--mudo);font-size:14px;margin:2px 0 8px">${t.tipo === 'pc' ? 'Personagem jogador' : t.tipo === 'monstro' ? 'Criatura' : t.tipo === 'aliado' ? 'Aliado' : 'Personagem do Mestre'}${t.visivel === false ? ' · oculto aos jogadores' : ''}</div>`;
  if (t.descricao) h += `<p style="margin:6px 0">${esc(t.descricao)}</p>`;
  if (t.tipo === 'pc' || souMestre()) {
    h += `<div class="linha" style="margin:8px 0"><span class="chip">Defesa ${num(t.defesa)}</span><span class="chip">Desl. ${num(t.desloc, 6)}</span><span class="chip">Inic. +${num(t.ini)}</span></div>`;
    h += medidor('Vigor', 'vigor', 'vigorMax', '#5d9a4a', t, meu || souMestre());
    if (t.tipo === 'pc') { h += medidor('Fôlego', 'folego', 'folegoMax', '#5f92f0', t, meu || souMestre()); h += medidor('Tensão', 'tensao', 'limiar', '#c0392f', t, meu || souMestre()); }
  } else { const ev = estadoVida(t); if (ev) h += `<p><span class="tag">${ev}</span></p>`; }
  if (falas.length) h += `<div class="fala" id="fala">“${esc(falas[0])}”</div>${falas.length > 1 ? '<button id="outraFala" class="mini">Ouvir outra fala</button>' : ''}`;
  if (souMestre() && t.notas) h += `<p style="color:var(--mudo);font-size:14px"><b>Notas do Mestre:</b> ${esc(t.notas)}</p>`;
  if (edita) h += `<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap"><button id="editarNpc" class="pri">Editar</button><button id="visNpc">${t.visivel === false ? 'Revelar' : 'Ocultar'}</button><button id="apagarNpc">Remover</button></div>`;
  if (souMestre() && t.tipo === 'pc' && t.id !== eu()) h += `<div style="margin-top:10px"><button id="expulsar">Remover jogador da mesa</button></div>`;
  if (possoMover(t)) h += `<p style="color:var(--mudo);font-size:13px;margin-top:10px">Clique numa casa do mapa (ou arraste o token) para mover.</p>`;
  c.innerHTML = h; c.hidden = false;
  $('fechaCartao').onclick = () => { c.hidden = true; selecionado = null; alcance = null; render(); };
  let iFala = 0; if ($('outraFala')) $('outraFala').onclick = () => { iFala = (iFala + 1) % falas.length; $('fala').textContent = '“' + falas[iFala] + '”'; };
  c.querySelectorAll('[data-mv]').forEach(b => b.onclick = () => ajustar(b.dataset.k, b.dataset.mv, num(b.dataset.d)));
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
  enviar(tipo === 'pc' ? { tipo: 'pc', id, dados: { [campo]: v } } : { tipo: 'npc', id, dados: { [campo]: v } });
}

// ================= Dados (animação) =================
function animarDados(m) {
  const cam = $('camadaDados'), W = cam.clientWidth, H = cam.clientHeight;
  const cx = W * (.3 + Math.random() * .4), cy = H * (.32 + Math.random() * .3);
  const els = [], dados = (m.dados || []).slice(0, 20);
  dados.forEach((d, i) => {
    const el = document.createElement('div'); const f = CLIP[d.f] ? d.f : 10;
    const corD = d.c === 'lyra' || d.papel === 'lyra' ? m.lyra : d.c === 'tirith' ? '#e9edf2' : m.kael;
    el.className = `dado ${MATERIAIS[m.material] ? m.material : 'cristal'}${d.fora ? ' fora' : ''}`;
    el.style.cssText = `left:${cx + (i - (dados.length - 1) / 2) * 70 + (Math.random() * 16 - 8)}px;top:${cy + (Math.random() * 30 - 15)}px;--c:${esc(corD)};--clip:${CLIP[f]};--r:${Math.round(Math.random() * 40 - 20)}deg;--dx:${Math.round(Math.random() * 200 - 100)}px;animation-delay:${i * .06}s`;
    el.innerHTML = `<div class="forma"></div><span>${num(d.v)}</span>`; cam.appendChild(el); els.push(el);
  });
  const pl = document.createElement('div'); pl.className = 'placa';
  pl.style.cssText = `left:${cx}px;top:${cy + (dados.length ? 78 : 0)}px;border-color:${esc(m.cor)}`;
  pl.innerHTML = `<span>${esc(m.nome)}${m.rotulo ? ' · ' + esc(m.rotulo) : ''}${m.oculta ? ' · oculta' : ''}</span><b>${num(m.total)}</b>${m.grau ? `<div>${esc(m.grau)}</div>` : ''}${(m.tags || []).map(t => `<span class="tag ${/Ruína|Aranor|Eco/.test(t) ? 'ruim' : ''}">${esc(t)}</span>`).join('')}`;
  cam.appendChild(pl); els.push(pl);
  setTimeout(() => els.forEach(e => e.classList.add('some')), 6500);
  setTimeout(() => els.forEach(e => e.remove()), 7300);
}

// ================= Painel lateral =================
$('abas').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; aba = b.dataset.aba; document.querySelectorAll('#abas button').forEach(x => x.classList.toggle('ativo', x === b)); painel(); });
function painel() {
  document.querySelectorAll('#abas button').forEach(x => x.classList.toggle('ativo', x.dataset.aba === aba));
  const c = $('conteudo');
  if (aba === 'ficha') c.innerHTML = htmlFicha();
  else if (aba === 'dados') c.innerHTML = htmlDados();
  else if (aba === 'registro') c.innerHTML = htmlRegistro();
  else if (aba === 'mestre') c.innerHTML = htmlMestre();
  ligar();
}
function htmlFicha() {
  if (!voce) return '<p class="sub">Conectando…</p>';
  const p = pcs[eu()] || {}; const d = p.dados || {}; const tem = !!pcs[eu()];
  let h = '';
  if (souMestre() && !tem) h += `<div class="bloco"><h3>Você é o Mestre</h3><p style="margin:0">Use a aba Mestre para o mapa, NPCs e combate. Se quiser, crie também um personagem abaixo.</p></div>`;
  if (mesa?.combate?.ativo && tem) h += `<div class="bloco"><h3>${minhaVez() ? 'Sua vez!' : 'Combate em andamento'}</h3>${minhaVez() ? `<p style="margin:0 0 8px">Ações neste turno (mover gasta 1):</p><div class="pips">${[0, 1, 2].map(i => `<button data-pip="${i}" class="${i < acoesUsadas() ? 'usada' : ''}">${i + 1}</button>`).join('')}</div><button id="fimTurno" style="margin-top:10px">Avisar fim do turno</button>` : '<p style="margin:0">Aguarde seu turno para se mover.</p>'}</div>`;
  if (tem) { const t = { ...p, k: 'pc:' + eu() }; h += `<div class="bloco"><h3>${esc(p.nome)}</h3>${medidor('Vigor', 'vigor', 'vigorMax', '#5d9a4a', t, true)}${medidor('Fôlego', 'folego', 'folegoMax', '#5f92f0', t, true)}${medidor('Tensão', 'tensao', 'limiar', '#c0392f', t, true)}</div>`; }
  const f = (id, rot, v, tipo = 'number') => `<div><label for="f_${id}">${rot}</label><input id="f_${id}" type="${tipo}" value="${esc(v ?? '')}"></div>`;
  h += `<form class="bloco" id="formFicha"><h3>${tem ? 'Editar personagem' : 'Criar seu personagem'}</h3>
    ${f('nome', 'Nome', p.nome ?? (souMestre() ? '' : voce.nome), 'text')}
    <div class="linha">${f('sigla', 'Sigla do token', p.sigla, 'text')}<div><label for="f_cor">Cor do token</label><input id="f_cor" type="color" value="${esc(p.cor || '#e2b04a')}"></div></div>
    <div class="linha">${f('vigorMax', 'Vigor máx.', p.vigorMax ?? 21)}${f('folegoMax', 'Fôlego máx.', p.folegoMax ?? 18)}${f('limiar', 'Limiar Colapso', p.limiar ?? 6)}</div>
    <div class="linha">${f('defesa', 'Defesa', p.defesa ?? 12)}${f('desloc', 'Deslocamento', p.desloc ?? 6)}${f('ini', 'Bônus inic.', p.ini ?? 4)}</div>
    <h3 style="margin-top:12px">Seus dados</h3>
    <div class="linha"><div><label for="f_kael">Dado de Kael</label><input id="f_kael" type="color" value="${esc(d.kael || '#d9a23a')}"></div><div><label for="f_lyra">Dado de Lyra</label><input id="f_lyra" type="color" value="${esc(d.lyra || '#3f78e0')}"></div></div>
    <label for="f_material">Material</label><select id="f_material">${Object.entries(MATERIAIS).map(([k, n]) => `<option value="${k}" ${d.material === k ? 'selected' : ''}>${n}</option>`).join('')}</select>
    <button class="pri" style="margin-top:12px;width:100%">${tem ? 'Salvar' : 'Colocar na mesa'}</button></form>`;
  return h;
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
  return `<div class="bloco"><h3>Ferramenta</h3><div class="linha">${[['mover', 'Mover'], ['pintar', 'Pintar terreno'], ['npc', 'Colocar NPC']].map(([k, n]) => `<button data-modo="${k}" class="${modoMestre === k ? 'ativo' : ''}">${n}</button>`).join('')}</div>
    ${modoMestre === 'pintar' ? `<div class="paleta" style="margin-top:10px">${Object.entries(TERRENOS).map(([k, t]) => `<button data-pincel="${esc(k)}" class="${pincel === k ? 'ativo' : ''}"><svg viewBox="0 0 48 48"><rect width="48" height="48" fill="url(#${ID[k]})"/></svg>${esc(t.n)}</button>`).join('')}</div><label for="m_tam">Tamanho do pincel</label><select id="m_tam">${[1, 2, 3].map(n => `<option ${tamPincel === n ? 'selected' : ''}>${n}</option>`).join('')}</select>` : ''}
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
function editorNpc(id) {
  const n = npcs[id]; if (!n) return; const c = $('cartao');
  const f = (k, rot, tipo = 'number') => `<div><label for="n_${k}">${rot}</label><input id="n_${k}" type="${tipo}" value="${esc(n[k] ?? '')}"></div>`;
  c.innerHTML = `<button class="fecha" id="fechaCartao" aria-label="Fechar">×</button><h2 style="font-size:18px">Editar NPC</h2><form id="formNpc">
    ${f('nome', 'Nome', 'text')}<div class="linha">${f('sigla', 'Sigla', 'text')}<div><label for="n_cor">Cor</label><input id="n_cor" type="color" value="${esc(n.cor || '#8c7a63')}"></div></div>
    <label for="n_tipo">Tipo</label><select id="n_tipo">${[['npc', 'Personagem'], ['monstro', 'Criatura hostil'], ['aliado', 'Aliado']].map(([k, t]) => `<option value="${k}" ${n.tipo === k ? 'selected' : ''}>${t}</option>`).join('')}</select>
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
    const dados = { nome: v('nome'), sigla: v('sigla'), cor: v('cor'), tipo: v('tipo'), vigor: num(v('vigor')), vigorMax: num(v('vigorMax')), defesa: num(v('defesa')), ini: num(v('ini')), desloc: num(v('desloc'), 6), tamanho: num(v('tamanho'), 1), visivel: $('n_visivel').checked, descricao: v('descricao'), falas: v('falas').split('\n').map(s => s.trim()).filter(Boolean), notas: v('notas') };
    npcs[id] = { ...npcs[id], ...dados }; enviar({ tipo: 'npc', id, dados });
    selecionar('npc:' + id);
  };
}
function ligar() {
  const q = s => document.querySelector(s);
  if (q('#formFicha')) q('#formFicha').onsubmit = e => {
    e.preventDefault(); const v = k => $('f_' + k).value;
    const dados = { nome: v('nome') || voce.nome, sigla: v('sigla'), cor: v('cor'), vigorMax: num(v('vigorMax'), 21), folegoMax: num(v('folegoMax'), 18), limiar: num(v('limiar'), 6), defesa: num(v('defesa'), 12), desloc: num(v('desloc'), 6), ini: num(v('ini')), dados: { kael: v('kael'), lyra: v('lyra'), material: v('material') } };
    enviar({ tipo: 'pc', dados }); avisar('Personagem salvo.', 2000);
  };
  document.querySelectorAll('#conteudo [data-mv]').forEach(b => b.onclick = () => ajustar(b.dataset.k, b.dataset.mv, num(b.dataset.d)));
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

// ================= Início =================
(async () => {
  try { config = await (await fetch('/api/config')).json(); } catch { config = { apelido: true }; }
  sessao = lerLS('arkahad.sessao');
  if (sessao) { try { await api('/api/eu'); } catch { sessao = null; } }
  rota();
})();
