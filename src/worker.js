import { DurableObject } from 'cloudflare:workers';
import { TERRENOS, LUZES, LUAS, r, num, custoCel, dijkstra, rolar2d10, rolarAtaque, rolarExpr, nivelPorXp, CONDICOES, CONDS_CAOS, modCond, temCond, deslocCom, distanciaCasas } from '../public/regras.js';
import { HABILIDADE, danoHabilidade, ataqueArma, temImbuir, temTalento, TODOS_DONS, DOM_FUNDIDO, migrarHabs, migrarFicha } from '../public/conteudo.js';

const MAX_JOGADORES = 6;
const SESSAO_DIAS = 30;
const enc = new TextEncoder();
const dec = new TextDecoder();

// ---------- utilidades ----------
const json = (dados, status = 200) => new Response(JSON.stringify(dados), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});
function b64url(bytes) {
  let s = ''; for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function deB64url(s) {
  s = String(s).replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s); const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
const hex = bytes => [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
const deHex = h => new Uint8Array((h.match(/../g) || []).map(x => parseInt(x, 16)));
const texto = (v, max = 200) => String(v ?? '').slice(0, max);
const cor = v => /^#[0-9a-fA-F]{6}$/.test(String(v)) ? String(v) : '#e2b04a';
function codigoSala() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = ''; for (let i = 0; i < 6; i++) c += A[r(A.length) - 1];
  return c;
}
function iguais(a, b) {
  if (a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

// ---------- sessão (token assinado com HMAC) ----------
async function chaveHmac(segredo) {
  return crypto.subtle.importKey('raw', enc.encode(segredo), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
async function assinar(obj, segredo) {
  const p = b64url(enc.encode(JSON.stringify(obj)));
  const sig = await crypto.subtle.sign('HMAC', await chaveHmac(segredo), enc.encode(p));
  return p + '.' + b64url(new Uint8Array(sig));
}
async function lerSessao(token, segredo) {
  try {
    const [p, s] = String(token || '').split('.');
    if (!p || !s) return null;
    const ok = await crypto.subtle.verify('HMAC', await chaveHmac(segredo), deB64url(s), enc.encode(p));
    if (!ok) return null;
    const o = JSON.parse(dec.decode(deB64url(p)));
    return o.exp > Date.now() ? o : null;
  } catch { return null; }
}

// ---------- login Google (verifica o ID token) ----------
let jwks = null, jwksEm = 0;
async function chavesGoogle() {
  if (jwks && Date.now() - jwksEm < 3600_000) return jwks;
  const res = await fetch('https://www.googleapis.com/oauth2/v3/certs');
  jwks = (await res.json()).keys; jwksEm = Date.now();
  return jwks;
}
async function verificarGoogle(credencial, clientId) {
  const [h, p, s] = String(credencial).split('.');
  const cab = JSON.parse(dec.decode(deB64url(h)));
  const dados = JSON.parse(dec.decode(deB64url(p)));
  const jwk = (await chavesGoogle()).find(k => k.kid === cab.kid);
  if (!jwk) throw new Error('chave desconhecida');
  const chave = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', chave, deB64url(s), enc.encode(h + '.' + p));
  if (!ok) throw new Error('assinatura inválida');
  if (!['accounts.google.com', 'https://accounts.google.com'].includes(dados.iss)) throw new Error('emissor inválido');
  if (dados.aud !== clientId) throw new Error('aplicativo inválido');
  if (dados.exp * 1000 < Date.now()) throw new Error('token expirado');
  return dados;
}

// ---------- senha da sala ----------
async function hashSenha(senha, saltHex) {
  const salt = saltHex ? deHex(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const base = await crypto.subtle.importKey('raw', enc.encode(senha), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, base, 256);
  return { salt: hex(salt), hash: hex(new Uint8Array(bits)) };
}

// =====================================================================
// Worker: páginas + API
// =====================================================================
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    try {
      return await api(request, env, url);
    } catch (e) {
      return json({ erro: 'Erro interno: ' + texto(e?.message, 120) }, 500);
    }
  },
};

const saguao = env => env.SAGUAO.getByName('saguao');
async function segredo(env) {
  return env.SESSION_SECRET || await saguao(env).segredo();
}
async function usuarioDe(request, env, url) {
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : url.searchParams.get('token');
  return lerSessao(token, await segredo(env));
}
const apelidoPermitido = env => !env.GOOGLE_CLIENT_ID || env.PERMITIR_APELIDO === '1';

async function api(request, env, url) {
  const p = url.pathname, m = request.method;

  if (p === '/api/config') {
    return json({ googleClientId: env.GOOGLE_CLIENT_ID || '', apelido: apelidoPermitido(env), maxJogadores: MAX_JOGADORES });
  }

  if (p === '/api/login' && m === 'POST') {
    const corpo = await request.json().catch(() => ({}));
    let usuario;
    if (corpo.credential && env.GOOGLE_CLIENT_ID) {
      try {
        const g = await verificarGoogle(corpo.credential, env.GOOGLE_CLIENT_ID);
        usuario = { id: 'g-' + g.sub, nome: texto(g.name || g.email || 'Jogador', 60), foto: texto(g.picture, 400) };
      } catch (e) { return json({ erro: 'Login do Google recusado: ' + e.message }, 401); }
    } else if (corpo.apelido && apelidoPermitido(env)) {
      const nome = texto(corpo.apelido, 40).trim();
      if (nome.length < 2) return json({ erro: 'Apelido muito curto.' }, 400);
      usuario = { id: 'a-' + hex(crypto.getRandomValues(new Uint8Array(8))), nome, foto: '' };
    } else return json({ erro: 'Forma de login indisponível.' }, 400);
    const token = await assinar({ ...usuario, exp: Date.now() + SESSAO_DIAS * 86400_000 }, await segredo(env));
    return json({ token, usuario });
  }

  const eu = await usuarioDe(request, env, url);
  if (!eu) return json({ erro: 'Sessão expirada. Entre novamente.' }, 401);

  if (p === '/api/eu') return json({ usuario: { id: eu.id, nome: eu.nome, foto: eu.foto } });

  if (p === '/api/salas' && m === 'GET') return json({ salas: await saguao(env).listar() });

  if (p === '/api/salas' && m === 'POST') {
    const corpo = await request.json().catch(() => ({}));
    const nome = texto(corpo.nome, 60).trim();
    const senha = String(corpo.senha || '');
    if (nome.length < 2) return json({ erro: 'Dê um nome à sala.' }, 400);
    if (senha.length < 4) return json({ erro: 'A senha precisa de pelo menos 4 caracteres.' }, 400);
    const codigo = codigoSala();
    const { salt, hash } = await hashSenha(senha);
    await env.SALA.getByName(codigo).criar({ codigo, nome, salt, hash, mestreId: eu.id, mestreNome: eu.nome });
    await saguao(env).registrar({ codigo, nome, mestreId: eu.id, mestreNome: eu.nome, criada: Date.now(), online: 0 });
    return json({ codigo });
  }

  const mApagar = p.match(/^\/api\/salas\/([A-Z0-9]{6})$/);
  if (mApagar && m === 'DELETE') {
    const ok = await env.SALA.getByName(mApagar[1]).apagar(eu.id);
    if (!ok) return json({ erro: 'Só o Mestre pode apagar a sala.' }, 403);
    await saguao(env).remover(mApagar[1]);
    return json({ ok: true });
  }

  const mWs = p.match(/^\/api\/salas\/([A-Z0-9]{6})\/ws$/);
  if (mWs) {
    if (request.headers.get('Upgrade') !== 'websocket') return json({ erro: 'Esperado WebSocket.' }, 426);
    const h = new Headers(request.headers);
    h.set('x-usuario', JSON.stringify({ id: eu.id, nome: eu.nome, foto: eu.foto }));
    return env.SALA.getByName(mWs[1]).fetch(new Request(request.url, { headers: h }));
  }

  return json({ erro: 'Rota desconhecida.' }, 404);
}

// =====================================================================
// Saguão: segredo das sessões e lista de salas
// =====================================================================
export class Saguao extends DurableObject {
  async segredo() {
    let s = await this.ctx.storage.get('segredo');
    if (!s) { s = hex(crypto.getRandomValues(new Uint8Array(32))); await this.ctx.storage.put('segredo', s); }
    return s;
  }
  async listar() {
    const mapa = await this.ctx.storage.list({ prefix: 'sala:' });
    return [...mapa.values()].sort((a, b) => (b.online - a.online) || (b.criada - a.criada));
  }
  async registrar(info) { await this.ctx.storage.put('sala:' + info.codigo, info); }
  async atualizar(codigo, patch) {
    const atual = await this.ctx.storage.get('sala:' + codigo);
    if (atual) await this.ctx.storage.put('sala:' + codigo, { ...atual, ...patch });
  }
  async remover(codigo) { await this.ctx.storage.delete('sala:' + codigo); }
}

// =====================================================================
// Sala: uma mesa de jogo (estado + WebSockets)
// =====================================================================
const COMBATE_VAZIO = { ativo: false, ordem: [], turno: 0, rodada: 1 };
const CAMPOS_PC = ['nome', 'sigla', 'cor', 'vigor', 'vigorMax', 'folego', 'folegoMax', 'tensao', 'limiar', 'defesa', 'desloc', 'ini', 'dados', 'robustez', 'determinacao', 'protecao', 'limiarFer', 'ficha', 'aparencia', 'imbuido', 'itens', 'moedas', 'barra'];
const CAMPOS_NPC = ['nome', 'sigla', 'cor', 'tipo', 'vigor', 'vigorMax', 'defesa', 'ini', 'desloc', 'tamanho', 'visivel', 'descricao', 'falas', 'notas', 'x', 'y', 'raca', 'aparencia', 'ataque', 'dano', 'alcance', 'protecao', 'xp', 'dom', 'habs'];
const RACAS_OK = ['sarthani', 'zarathim', 'veloryn', 'draveth', 'sypheris', 'dvarith', 'criatura'];
function objetoLimitado(v, max) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined;
  try { const s = JSON.stringify(v); return s.length <= max ? JSON.parse(s) : undefined; } catch { return undefined; }
}

function limparPc(d) {
  const o = {};
  for (const k of CAMPOS_PC) if (k in d) o[k] = d[k];
  if ('nome' in o) o.nome = texto(o.nome, 40) || 'Sem nome';
  if ('sigla' in o) o.sigla = texto(o.sigla, 3);
  if ('cor' in o) o.cor = cor(o.cor);
  for (const k of ['vigor', 'vigorMax', 'folego', 'folegoMax', 'tensao', 'limiar', 'defesa', 'desloc', 'ini', 'robustez', 'determinacao', 'protecao', 'limiarFer']) if (k in o) o[k] = Math.max(-99, Math.min(999, Math.round(num(o[k]))));
  if ('ficha' in o) { o.ficha = migrarFicha(objetoLimitado(o.ficha, 16000)); if (!o.ficha) delete o.ficha; }
  if ('aparencia' in o) { o.aparencia = objetoLimitado(o.aparencia, 3000); if (!o.aparencia) delete o.aparencia; }
  if ('imbuido' in o) o.imbuido = !!o.imbuido;
  if ('itens' in o) o.itens = (Array.isArray(o.itens) ? o.itens : []).slice(0, 80).map(it => ({ n: texto(it?.n, 60), q: Math.max(1, Math.min(999, Math.round(num(it?.q, 1)))) })).filter(it => it.n);
  if ('barra' in o) o.barra = (Array.isArray(o.barra) ? o.barra : []).slice(0, 20).map(x => { const v = texto(x, 70); return /^(arma|mover|defender|imbuir|tec:[1-5]|hab:hab_[a-z_]+_[1-9]|brasas|solnegro|item:.{1,60})$/.test(v) ? v : ''; });
  if ('moedas' in o) { const m = o.moedas || {}; o.moedas = Object.fromEntries(['k', 'l', 't'].map(c => [c, Math.max(0, Math.min(999999, Math.round(num(m[c]))))])); }
  if ('dados' in o) {
    const dd = o.dados || {};
    o.dados = { kael: cor(dd.kael), lyra: cor(dd.lyra), material: ['cristal', 'osso', 'ferro', 'brasa'].includes(dd.material) ? dd.material : 'cristal' };
  }
  return o;
}
function limparNpc(d) {
  const o = {};
  for (const k of CAMPOS_NPC) if (k in d) o[k] = d[k];
  if ('nome' in o) o.nome = texto(o.nome, 50) || 'NPC';
  if ('sigla' in o) o.sigla = texto(o.sigla, 3);
  if ('cor' in o) o.cor = cor(o.cor);
  if ('tipo' in o) o.tipo = ['npc', 'monstro', 'aliado'].includes(o.tipo) ? o.tipo : 'npc';
  for (const k of ['vigor', 'vigorMax', 'defesa', 'ini', 'desloc', 'x', 'y', 'ataque', 'protecao']) if (k in o) o[k] = Math.round(num(o[k]));
  if ('xp' in o) o.xp = Math.max(0, Math.min(200, Math.round(num(o.xp))));
  if ('dom' in o) { o.dom = DOM_FUNDIDO[o.dom] || o.dom; o.dom = TODOS_DONS[o.dom] ? o.dom : ''; }
  if ('habs' in o) o.habs = migrarHabs((Array.isArray(o.habs) ? o.habs : []).map(String)).filter(id => HABILIDADE[id]).slice(0, 12);
  if ('alcance' in o) o.alcance = Math.max(1, Math.min(40, Math.round(num(o.alcance, 1))));
  if ('dano' in o) o.dano = /^[0-9d+\-]{1,20}$/i.test(String(o.dano || '')) ? String(o.dano).toLowerCase() : '1d6';
  if ('tamanho' in o) o.tamanho = Math.max(1, Math.min(4, Math.round(num(o.tamanho, 1))));
  if ('visivel' in o) o.visivel = o.visivel !== false;
  if ('descricao' in o) o.descricao = texto(o.descricao, 1000);
  if ('notas' in o) o.notas = texto(o.notas, 2000);
  if ('falas' in o) o.falas = (Array.isArray(o.falas) ? o.falas : []).slice(0, 20).map(f => texto(f, 300)).filter(Boolean);
  if ('raca' in o) o.raca = RACAS_OK.includes(o.raca) ? o.raca : 'sarthani';
  if ('aparencia' in o) { o.aparencia = objetoLimitado(o.aparencia, 3000); if (!o.aparencia) delete o.aparencia; }
  return o;
}

function novoMapa(id, nome) {
  return { id, nome, cols: 24, rows: 16, grid: Array.from({ length: 16 }, () => '"'.repeat(24)), alt: Array.from({ length: 16 }, () => '1'.repeat(24)), luz: 'dia', lua: 'nenhuma', portais: {}, combate: { ...COMBATE_VAZIO } };
}
// mapa vindo de fora (novo ou arquivo enviado pelo Mestre): tudo validado
function mapaValidado(id, d) {
  const cols = Math.max(6, Math.min(60, Math.round(num(d.cols, 24)))), rows = Math.max(6, Math.min(60, Math.round(num(d.rows, 16))));
  const g = Array.isArray(d.grid) ? d.grid : [], a = Array.isArray(d.alt) ? d.alt : [];
  const m = novoMapa(id, texto(d.nome, 60) || 'Novo mapa');
  Object.assign(m, {
    cols, rows,
    grid: Array.from({ length: rows }, (_, y) => [...String(g[y] || '').padEnd(cols, '"').slice(0, cols)].map(c => TERRENOS[c] ? c : '.').join('')),
    alt: Array.from({ length: rows }, (_, y) => [...String(a[y] || '').padEnd(cols, '1').slice(0, cols)].map(c => /[0-4]/.test(c) ? c : '1').join('')),
    luz: LUZES[d.luz] ? d.luz : 'dia', lua: LUAS[d.lua] ? d.lua : 'nenhuma',
  });
  return m;
}

export class Sala extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.s = null; // estado em memória, recarregado do armazenamento após hibernar
  }

  async carregar() {
    if (this.s) return this.s;
    const m = await this.ctx.storage.get(['meta', 'mesa', 'mapas', 'pcs', 'npcs', 'log', 'pedidos']);
    this.s = {
      meta: m.get('meta') || null,
      mapas: m.get('mapas') || null,
      pcs: m.get('pcs') || {},
      npcs: m.get('npcs') || {},
      log: m.get('log') || [],
      pedidos: m.get('pedidos') || [],
    };
    // sessões antigas tinham um mapa só ("mesa"): vira o primeiro mapa da sessão
    if (!this.s.mapas && m.get('mesa')) {
      this.s.mapas = { m1: { ...m.get('mesa'), id: 'm1' } };
      if (this.s.meta) { this.s.meta.mapaInicial = 'm1'; this.s.meta.vendo = 'm1'; }
    }
    this.s.mapas ||= {};
    // Dons cortados na revisão: fichas e NPCs salvos vão para o Dom que absorveu o antigo
    for (const p of Object.values(this.s.pcs)) migrarFicha(p?.ficha);
    for (const n of Object.values(this.s.npcs)) if (n) { if (DOM_FUNDIDO[n.dom]) n.dom = DOM_FUNDIDO[n.dom]; if (n.habs) n.habs = migrarHabs(n.habs); }
    return this.s;
  }
  async gravar(...chaves) {
    const s = await this.carregar();
    const obj = {}; for (const k of chaves) obj[k] = s[k];
    await this.ctx.storage.put(obj);
  }

  async criar(info) {
    const s = await this.carregar();
    if (s.meta) return false;
    s.meta = { ...info, membros: {}, criada: Date.now() };
    s.mapas = { m1: novoMapa('m1', 'Primeiro mapa') };
    s.meta.mapaInicial = 'm1'; s.meta.vendo = 'm1';
    await this.gravar('meta', 'mapas', 'pcs', 'npcs', 'log');
    return true;
  }

  async apagar(quemId) {
    const s = await this.carregar();
    if (!s.meta || s.meta.mestreId !== quemId) return false;
    for (const ws of this.ctx.getWebSockets()) { try { ws.send(JSON.stringify({ tipo: 'removida' })); ws.close(4000, 'sala removida'); } catch {} }
    await this.ctx.storage.deleteAll();
    this.s = null;
    return true;
  }

  // ---------- conexões ----------
  async fetch(request) {
    const s = await this.carregar();
    if (!s.meta) return new Response('Sala inexistente', { status: 404 });
    let u;
    try { u = JSON.parse(request.headers.get('x-usuario')); } catch { return new Response('Sem usuário', { status: 401 }); }
    const [cliente, servidor] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(servidor);
    const mestre = u.id === s.meta.mestreId;
    const att = { id: u.id, nome: texto(u.nome, 60), foto: texto(u.foto, 400), mestre, ok: false, tentativas: 0 };
    if (mestre || s.meta.membros[u.id]) {
      att.ok = true;
      servidor.serializeAttachment(att);
      this.ctx.waitUntil(this.depoisDeEntrar());
    } else {
      servidor.serializeAttachment(att);
      servidor.send(JSON.stringify({ tipo: 'senha', sala: s.meta.nome }));
    }
    return new Response(null, { status: 101, webSocket: cliente });
  }

  async depoisDeEntrar() {
    await this.difundir();
    await this.avisarSaguao();
  }

  conectados(exceto) {
    return this.ctx.getWebSockets().filter(ws => ws !== exceto).map(ws => ({ ws, att: ws.deserializeAttachment() })).filter(x => x.att?.ok);
  }

  async avisarSaguao(exceto) {
    const s = await this.carregar();
    if (!s.meta) return;
    const ids = new Set(this.conectados(exceto).map(x => x.att.id));
    const jogadores = Object.keys(s.meta.membros).length;
    try { await this.env.SAGUAO.getByName('saguao').atualizar(s.meta.codigo, { online: ids.size, jogadores, nome: s.meta.nome }); } catch {}
  }

  // ---------- mapas da sessão ----------
  idMapa(o) { const s = this.s; return o?.mapa && s.mapas[o.mapa] ? o.mapa : (s.mapas[s.meta.mapaInicial] ? s.meta.mapaInicial : Object.keys(s.mapas)[0]); }
  mapaDe(att) {
    const s = this.s;
    const id = att.mestre ? (s.mapas[s.meta.vendo] ? s.meta.vendo : this.idMapa(null)) : this.idMapa(s.pcs[att.id]);
    return s.mapas[id];
  }
  estadoPara(att, online) {
    const s = this.s, mesa = this.mapaDe(att);
    const npcs = {}, pcs = {};
    for (const [id, n] of Object.entries(s.npcs)) {
      const mapa = this.idMapa(n);
      if (!att.mestre && (n.visivel === false || mapa !== mesa.id)) continue;
      npcs[id] = att.mestre ? { ...n, mapa } : { ...n, mapa, notas: undefined };
    }
    for (const [id, p] of Object.entries(s.pcs)) pcs[id] = att.mestre ? { ...p, mapa: this.idMapa(p) } : { ...p, mapa: this.idMapa(p), notasMestre: undefined, ...(id === att.id ? {} : { notasJogador: undefined, ajuda: undefined }) };
    return {
      tipo: 'estado',
      voce: { id: att.id, nome: att.nome, mestre: att.mestre },
      sala: { codigo: s.meta.codigo, nome: s.meta.nome, mestreNome: s.meta.mestreNome, max: MAX_JOGADORES, mapaInicial: s.meta.mapaInicial },
      mapas: Object.values(s.mapas).map(m => ({ id: m.id, nome: m.nome, cols: m.cols, rows: m.rows })),
      mesa, pcs, npcs,
      log: s.log.filter(l => att.mestre || !l.oculta || l.para === att.id).slice(0, 40).map(l => att.mestre ? l : { ...l, difMestre: undefined }),
      pedidos: s.pedidos.filter(p => att.mestre || p.pc === att.id),
      online,
    };
  }

  async difundir(exceto) {
    await this.carregar();
    const lista = this.conectados(exceto);
    const vistos = new Map();
    for (const { att } of lista) if (!vistos.has(att.id)) vistos.set(att.id, { id: att.id, nome: att.nome, mestre: att.mestre });
    const online = [...vistos.values()];
    for (const { ws, att } of lista) { try { ws.send(JSON.stringify(this.estadoPara(att, online))); } catch {} }
  }

  enviarTodos(msg, soMestre = false) {
    const t = JSON.stringify(msg);
    for (const { ws, att } of this.conectados()) if (!soMestre || att.mestre) { try { ws.send(t); } catch {} }
  }

  async webSocketClose(ws, code, reason) {
    try { ws.close(); } catch {}
    await this.carregar();
    if (!this.s.meta) return;
    await this.difundir(ws);
    await this.avisarSaguao(ws);
  }
  async webSocketError(ws) { await this.webSocketClose(ws); }

  async webSocketMessage(ws, bruto) {
    const s = await this.carregar();
    if (!s.meta) return;
    let msg;
    try { msg = JSON.parse(typeof bruto === 'string' ? bruto : dec.decode(bruto)); } catch { return; }
    const att = ws.deserializeAttachment();
    const erro = t => ws.send(JSON.stringify({ tipo: 'erro', texto: t }));

    if (!att.ok) {
      if (msg.tipo !== 'senha') return;
      const { hash } = await hashSenha(String(msg.senha || ''), s.meta.salt);
      if (!iguais(hash, s.meta.hash)) {
        att.tentativas++; ws.serializeAttachment(att);
        if (att.tentativas >= 5) { ws.send(JSON.stringify({ tipo: 'erro', texto: 'Muitas tentativas.' })); ws.close(4003, 'tentativas'); return; }
        ws.send(JSON.stringify({ tipo: 'senha', sala: s.meta.nome, erro: 'Senha incorreta.' }));
        return;
      }
      if (Object.keys(s.meta.membros).length >= MAX_JOGADORES) { erro(`A sessão está cheia (${MAX_JOGADORES} jogadores).`); ws.close(4004, 'cheia'); return; }
      s.meta.membros[att.id] = att.nome;
      await this.gravar('meta');
      att.ok = true; ws.serializeAttachment(att);
      await this.depoisDeEntrar();
      return;
    }

    const mestre = att.mestre;
    const mesa = this.mapaDe(att);
    switch (msg.tipo) {
      case 'mesa': {
        if (!mestre) return erro('Só o Mestre altera o mapa.');
        const d = msg.dados || {};
        if ('nome' in d) mesa.nome = texto(d.nome, 60) || 'Mapa';
        if ('luz' in d && LUZES[d.luz]) mesa.luz = d.luz;
        if ('lua' in d && LUAS[d.lua]) mesa.lua = d.lua;
        if ('cols' in d || 'rows' in d || 'grid' in d || 'alt' in d) {
          const cols = Math.max(6, Math.min(60, Math.round(num(d.cols, mesa.cols))));
          const rows = Math.max(6, Math.min(60, Math.round(num(d.rows, mesa.rows))));
          const g = Array.isArray(d.grid) ? d.grid : mesa.grid;
          mesa.grid = Array.from({ length: rows }, (_, y) => [...String(g[y] || '').padEnd(cols, ',').slice(0, cols)].map(c => TERRENOS[c] ? c : '.').join(''));
          // altura de cada casa: '0' fosso, '1' chão, '2'..'4' terreno alto
          const a = Array.isArray(d.alt) ? d.alt : (mesa.alt || []);
          mesa.alt = Array.from({ length: rows }, (_, y) => [...String(a[y] || '').padEnd(cols, '1').slice(0, cols)].map(c => /[0-4]/.test(c) ? c : '1').join(''));
          mesa.cols = cols; mesa.rows = rows;
          for (const k of Object.keys(mesa.portais || {})) { const [x, y] = k.split(',').map(Number); if (x >= cols || y >= rows) delete mesa.portais[k]; }
        }
        await this.gravar('mapas');
        break;
      }
      case 'mapa': {
        if (!mestre) return;
        const a = msg.acao;
        if (a === 'criar' || a === 'importar') {
          if (Object.keys(s.mapas).length >= 30) return erro('Limite de 30 mapas por sessão.');
          const id = 'm' + hex(crypto.getRandomValues(new Uint8Array(4)));
          const d = a === 'importar' ? (msg.dados?.mapa || msg.dados || {}) : msg;
          const novo = mapaValidado(id, d);
          s.mapas[id] = novo; s.meta.vendo = id;
          if (a === 'importar' && Array.isArray(msg.dados?.npcs)) for (const n of msg.dados.npcs.slice(0, 60)) {
            const nid = 'n' + hex(crypto.getRandomValues(new Uint8Array(5)));
            s.npcs[nid] = { nome: 'NPC', sigla: 'NP', tipo: 'npc', cor: '#8c7a63', vigor: 10, vigorMax: 10, defesa: 12, ini: 1, desloc: 6, tamanho: 1, visivel: true, descricao: '', falas: [], notas: '', ...limparNpc(n), mapa: id };
          }
          await this.gravar('mapas', 'meta', 'npcs');
        } else if (a === 'ir' && s.mapas[msg.id]) { s.meta.vendo = msg.id; await this.gravar('meta'); }
        else if (a === 'inicial') { s.meta.mapaInicial = mesa.id; await this.gravar('meta'); }
        else if (a === 'trazer') {
          for (const p of Object.values(s.pcs)) { if (this.idMapa(p) === mesa.id) continue; p.mapa = mesa.id; [p.x, p.y] = this.casaLivre(mesa.id); }
          await this.gravar('pcs');
        } else if (a === 'apagar') {
          const id = String(msg.id || mesa.id);
          if (Object.keys(s.mapas).length <= 1) return erro('A sessão precisa de pelo menos um mapa.');
          delete s.mapas[id];
          if (s.meta.mapaInicial === id) s.meta.mapaInicial = Object.keys(s.mapas)[0];
          if (s.meta.vendo === id) s.meta.vendo = s.meta.mapaInicial;
          for (const p of Object.values(s.pcs)) if (p.mapa === id) { p.mapa = s.meta.mapaInicial; [p.x, p.y] = this.casaLivre(p.mapa); }
          for (const [nid, n] of Object.entries(s.npcs)) if (n.mapa === id) delete s.npcs[nid];
          for (const m of Object.values(s.mapas)) for (const [k, pt] of Object.entries(m.portais || {})) if (pt.para === id) delete m.portais[k];
          await this.gravar('mapas', 'meta', 'pcs', 'npcs');
        } else return;
        break;
      }
      case 'portal': {
        if (!mestre) return;
        const x = Math.round(num(msg.x)), y = Math.round(num(msg.y)), k = x + ',' + y;
        if (x < 0 || y < 0 || x >= mesa.cols || y >= mesa.rows) return;
        mesa.portais ||= {};
        if (msg.remover) delete mesa.portais[k];
        else {
          const dest = s.mapas[msg.para]; if (!dest) return erro('Escolha o mapa de destino.');
          const px = Math.max(0, Math.min(dest.cols - 1, Math.round(num(msg.px, x)))), py = Math.max(0, Math.min(dest.rows - 1, Math.round(num(msg.py, y))));
          mesa.portais[k] = { para: dest.id, x: px, y: py, nome: texto(msg.nome, 40) || dest.nome, cor: cor(msg.cor || '#7ad0ff') };
          if (msg.volta && dest.id !== mesa.id) { dest.portais ||= {}; dest.portais[px + ',' + py] = { para: mesa.id, x, y, nome: mesa.nome, cor: cor(msg.cor || '#7ad0ff') }; }
        }
        await this.gravar('mapas');
        break;
      }
      case 'pc': {
        const alvo = mestre && msg.id ? String(msg.id) : att.id;
        if (!mestre && alvo !== att.id) return erro('Você só edita o seu personagem.');
        const dados = limparPc(msg.dados || {});
        // Jogador só sobe de nível até onde o XP permite (o Mestre ajusta livre).
        if (!mestre && dados.ficha) dados.ficha.nivel = Math.max(1, Math.min(Math.round(num(dados.ficha.nivel, 1)), Math.max(num(s.pcs[alvo]?.ficha?.nivel, 1), nivelPorXp(s.pcs[alvo]?.xp))));
        if (!s.pcs[alvo]) {
          if (alvo !== att.id) return;
          const mapa = mestre ? mesa.id : this.idMapa(null);
          const [x, y] = this.casaLivre(mapa);
          s.pcs[alvo] = { nome: att.nome, cor: '#e2b04a', vigorMax: 21, folegoMax: 18, limiar: 6, defesa: 12, desloc: 6, ini: 0, moedas: { k: 15, l: 0, t: 0 }, itens: [], ...dados, x, y, mapa, tensao: 0 };
          s.pcs[alvo].vigor ??= s.pcs[alvo].vigorMax;
          s.pcs[alvo].folego ??= s.pcs[alvo].folegoMax;
        } else Object.assign(s.pcs[alvo], dados);
        await this.gravar('pcs');
        break;
      }
      case 'xp': {
        if (!mestre) return;
        const delta = Math.max(-300, Math.min(300, Math.round(num(msg.valor))));
        const ids = (Array.isArray(msg.alvos) ? msg.alvos : []).map(String).filter(id => s.pcs[id]);
        if (!delta || !ids.length) return;
        const motivo = texto(msg.motivo, 60) || 'XP';
        for (const id of ids) this.darXp(id, delta, motivo, !!msg.secreta);
        await this.gravar('pcs', 'log');
        break;
      }
      case 'npc': {
        if (!mestre) return;
        const id = msg.id ? texto(msg.id, 40) : 'n' + hex(crypto.getRandomValues(new Uint8Array(5)));
        const dados = limparNpc(msg.dados || {});
        s.npcs[id] = { nome: 'Novo NPC', sigla: 'NP', tipo: 'npc', cor: '#8c7a63', vigor: 10, vigorMax: 10, defesa: 12, ini: 1, desloc: 6, tamanho: 1, visivel: true, descricao: '', falas: [], notas: '', x: 0, y: 0, mapa: mesa.id, ...(s.npcs[id] || {}), ...dados };
        await this.gravar('npcs');
        if (!msg.id) ws.send(JSON.stringify({ tipo: 'npcCriado', id }));
        break;
      }
      case 'apagarNpc': {
        if (!mestre) return;
        delete s.npcs[String(msg.id)];
        await this.gravar('npcs');
        break;
      }
      case 'mover': {
        const kk = String(msg.k || ''), i2 = kk.indexOf(':'); const tipo = kk.slice(0, i2), id = kk.slice(i2 + 1);
        const obj = tipo === 'pc' ? s.pcs[id] : tipo === 'npc' ? s.npcs[id] : null;
        if (!obj) return;
        const mesa = s.mapas[this.idMapa(obj)];
        const x = Math.round(num(msg.x)), y = Math.round(num(msg.y)), tam = num(obj.tamanho, 1);
        if (x < 0 || y < 0 || x + tam > mesa.cols || y + tam > mesa.rows) return;
        if (!mestre) {
          if (tipo !== 'pc' || id !== att.id) return erro('Você só move o seu personagem.');
          const cb = mesa.combate || COMBATE_VAZIO;
          if (!cb.ativo) {
            const d = dijkstra(mesa, this.ocupadas('pc:' + id, mesa.id), num(obj.x), num(obj.y), 9999);
            if (!d.has(x + ',' + y)) return erro('Sem caminho até lá.');
          } else {
            // Mover: 1 ação dá o Deslocamento inteiro, que pode ser dividido entre outras ações no mesmo turno
            if (cb.ordem[cb.turno]?.k !== 'pc:' + id) return erro('Aguarde o seu turno.');
            if (temCond(obj, 'imovel')) return erro(`${obj.nome} está ${Object.keys(obj.cond).filter(c => CONDICOES[c]?.imovel).map(c => CONDICOES[c].nome.toLowerCase()).join(' e ')} e não pode se mover.`);
            const chave = `${cb.rodada}:${cb.turno}`, desloc = deslocCom(obj, num(obj.desloc, 6));
            const usadas = obj.acoes?.chave === chave ? num(obj.acoes.usadas) : 0;
            const resta = obj.mov?.chave === chave ? num(obj.mov.resta) : 0;
            const d = dijkstra(mesa, this.ocupadas('pc:' + id, mesa.id), num(obj.x), num(obj.y), Math.max(resta, usadas < 3 ? desloc : 0));
            const custo = d.get(x + ',' + y);
            if (custo === undefined) return erro('Fora do seu Deslocamento.');
            if (custo <= resta) obj.mov = { chave, resta: resta - custo };
            else {
              if (usadas >= 3) return erro('Você já usou as 3 ações.');
              if (custo > desloc) return erro('Fora do seu Deslocamento.');
              obj.acoes = { chave, usadas: usadas + 1 };
              obj.mov = { chave, resta: desloc - custo };
            }
          }
        }
        obj.x = x; obj.y = y;
        this.pisarFogo(obj, mesa);
        // portal: quem para em cima atravessa para o outro mapa
        const pt = mesa.portais?.[x + ',' + y], dest = pt && s.mapas[pt.para];
        if (dest && tipo === 'pc') {
          obj.mapa = dest.id;
          [obj.x, obj.y] = this.casaLivre(dest.id, pt.x, pt.y);
          this.enviarTodos({ tipo: 'aviso', texto: `${obj.nome} atravessou o portal para ${dest.nome}.` });
        }
        await this.gravar(tipo === 'pc' ? 'pcs' : 'npcs');
        break;
      }
      case 'acoes': {
        const pc = s.pcs[att.id], cb = s.mapas[this.idMapa(pc)]?.combate;
        if (!pc || !cb?.ativo) return;
        pc.acoes = { chave: `${cb.rodada}:${cb.turno}`, usadas: Math.max(0, Math.min(3, Math.round(num(msg.usadas)))) };
        await this.gravar('pcs');
        break;
      }
      case 'combate': {
        const cb = mesa.combate || { ...COMBATE_VAZIO };
        // o jogador pode encerrar o próprio turno
        if (!mestre && !(msg.acao === 'proximo' && cb.ativo && cb.ordem[cb.turno]?.k === 'pc:' + att.id)) return;
        if (msg.acao === 'iniciar') {
          const lista = [
            ...Object.entries(s.pcs).filter(([, p]) => this.idMapa(p) === mesa.id).map(([id, p]) => ({ k: 'pc:' + id, b: num(p.ini), nome: p.nome })),
            ...Object.entries(s.npcs).filter(([, n]) => n.visivel !== false && this.idMapa(n) === mesa.id).map(([id, n]) => ({ k: 'npc:' + id, b: num(n.ini), nome: n.nome })),
          ].map(o => ({ ...o, ini: r(10) + r(10) + o.b }));
          lista.sort((a, b) => b.ini - a.ini || b.b - a.b);
          mesa.combate = { ativo: true, ordem: lista.map(({ k, ini }) => ({ k, ini })), turno: 0, rodada: 1 };
          this.registrar({ nome: 'Mestre', cor: '#e2b04a', rotulo: 'Iniciativa', total: lista[0]?.ini || 0, grau: 'Começa: ' + (lista[0]?.nome || '—'), desc: 'Iniciativa rolada para todos', tags: lista.map(o => `${o.nome} ${o.ini}`) });
        } else if (msg.acao === 'proximo' && cb.ativo) {
          let turno = cb.turno + 1, rodada = cb.rodada;
          if (turno >= cb.ordem.length) { turno = 0; rodada++; }
          mesa.combate = { ...cb, turno, rodada };
          if (rodada !== cb.rodada && mesa.fogo) { for (const [c, n] of Object.entries(mesa.fogo)) if (n <= 1) delete mesa.fogo[c]; else mesa.fogo[c] = n - 1; if (!Object.keys(mesa.fogo).length) delete mesa.fogo; }
          const vez = this.objetoDe(cb.ordem[turno]?.k);
          if (vez) this.pisarFogo(vez, mesa);
          if (vez) delete vez.guarda;   // a Defesa extra dura até o próximo turno de quem defendeu
          const nomeVez = vez?.nome || '—';
          this.enviarTodos({ tipo: 'turno', k: cb.ordem[turno]?.k, nome: nomeVez, rodada });
          if (vez?.cond) this.tickCondicoes(vez, cb.ordem[turno].k, `${rodada}:${turno}`);
          if (vez && num(vez.brasas) >= 5) { const v = rolarExpr('1d4').total; vez.vigor = Math.max(-99, num(vez.vigor) - v); this.enviarTodos({ tipo: 'aviso', texto: `${vez.nome}: ♨ −${v} (Superaquecido)` }); }
          await this.gravar('pcs', 'npcs');
        } else if (msg.acao === 'encerrar') {
          mesa.combate = { ...COMBATE_VAZIO }; delete mesa.fogo;
          for (const o of [...Object.values(s.pcs), ...Object.values(s.npcs)]) if (this.idMapa(o) === mesa.id) { delete o.cond; delete o.escudo; delete o.brasas; delete o.solNegro; }
          await this.gravar('pcs', 'npcs');
        }
        await this.gravar('mapas', 'log');
        break;
      }
      case 'defender': {
        const pc = s.pcs[att.id], cb = s.mapas[this.idMapa(pc)]?.combate;
        if (!pc) return;
        if (cb?.ativo) {
          if (cb.ordem[cb.turno]?.k !== 'pc:' + att.id) return erro('Aguarde o seu turno.');
          const chave = `${cb.rodada}:${cb.turno}`, usadas = pc.acoes?.chave === chave ? num(pc.acoes.usadas) : 0;
          if (usadas >= 3) return erro('Você já usou as 3 ações.');
          pc.acoes = { chave, usadas: usadas + 1 };
        }
        pc.guarda = true;
        this.enviarTodos({ tipo: 'aviso', texto: `${pc.nome} assume a guarda (+2 Defesa até o próximo turno).` });
        await this.gravar('pcs');
        break;
      }
      case 'usarItem': {
        const pc = s.pcs[att.id], cb = s.mapas[this.idMapa(pc)]?.combate;
        if (!pc) return;
        const i = (Array.isArray(pc.itens) ? pc.itens : []).findIndex(it => it.n === texto(msg.n, 60));
        if (i < 0) return erro('Esse item não está no Inventário.');
        if (cb?.ativo) {
          if (cb.ordem[cb.turno]?.k !== 'pc:' + att.id) return erro('Aguarde o seu turno.');
          const chave = `${cb.rodada}:${cb.turno}`, usadas = pc.acoes?.chave === chave ? num(pc.acoes.usadas) : 0;
          if (usadas >= 3) return erro('Você já usou as 3 ações.');
          pc.acoes = { chave, usadas: usadas + 1 };
        }
        const it = pc.itens[i];
        it.q = num(it.q, 1) - 1;
        if (it.q <= 0) pc.itens.splice(i, 1);
        this.enviarTodos({ tipo: 'aviso', texto: `${pc.nome} usa ${it.n}${it.q > 0 ? ` (restam ${it.q})` : ''}.` });
        await this.gravar('pcs');
        break;
      }
      case 'ataque': {
        // ataque ou técnica: o servidor rola, compara com a Defesa de cada alvo e aplica o dano
        const de = String(msg.de || '');
        const autor = this.objetoDe(de);
        if (!autor) return;
        if (!mestre && de !== 'pc:' + att.id) return erro('Você só ataca com o seu personagem.');
        const cb = s.mapas[this.idMapa(autor)]?.combate;
        if (cb?.ativo && de.startsWith('pc:')) {
          if (cb.ordem[cb.turno]?.k !== de) { if (!mestre) return erro('Aguarde o seu turno.'); }
          else {
          const chave = `${cb.rodada}:${cb.turno}`, usadas = autor.acoes?.chave === chave ? num(autor.acoes.usadas) : 0;
          if (usadas >= 3 && !mestre) return erro('Você já usou as 3 ações.');
          autor.acoes = { chave, usadas: Math.min(3, usadas + 1) };
          }
        }
        let alvos = [...new Set((Array.isArray(msg.alvos) ? msg.alvos : []).map(String))].slice(0, 16).map(k => [k, this.objetoDe(k)]).filter(([, o]) => o);
        // habilidade do Dom: dados, condições e efeitos vêm da tabela, não do cliente
        const hab = msg.hab ? HABILIDADE[String(msg.hab)] : null;
        // PC: aprendida na árvore; NPC: o Mestre marcou no editor
        const sabe = hab && (de.startsWith('pc:') ? (autor.ficha?.talentos || []).includes(hab.id) : mestre && (autor.habs || []).includes(hab.id));
        if (msg.hab && !sabe) return erro('Habilidade não aprendida.');
        if (hab && temCond(autor, 'mudo')) return erro(`${autor.nome} está silenciado e não pode usar o Dom.`);
        if (!hab || hab.t === 'atq') this.tirarCond(autor, 'oculto'); // atacar revela quem está oculto
        if (hab && hab.t !== 'atq') {
          const falta = await this.habilidadeEspecial(autor, de, hab, alvos, msg);
          if (falta) return erro(falta);
          break;
        }
        if (!alvos.length) return erro('Escolha um alvo.');
        if (hab?.cadeia) alvos = this.cadeia(alvos, hab.cadeia, de);
        if (hab?.ricochete && alvos[0]?.[1].cond?.queimando) alvos = this.cadeia(alvos, hab.ricochete, de, o => o.cond?.queimando);
        const fogo = this.kalthor(autor), quente = fogo && num(autor.brasas) >= 5; // Brasa Viva / Superaquecido
        // Arma de Brasa (árvore imbuida_kalthor): só com a arma imbuída
        const fa = autor.ficha, brasa = fogo && !hab && !!msg.arma && !!autor.imbuido && !!fa && temImbuir(fa), mesaA = s.mapas[this.idMapa(autor)], notasBrasa = [];
        let danoExtra = '', mudouMapa = false;
        if (msg.solNegro) {
          if (!brasa || !temTalento(fa, 'imbk4')) return erro('Golpe do Sol Negro: precisa da arma em brasa.');
          if (autor.solNegro) return erro('O Golpe do Sol Negro já foi usado neste combate.');
          if (!num(autor.brasas)) return erro('Sem Brasas para o Golpe do Sol Negro.');
          const casas = this.linha(autor, alvos[0][1], 6, mesaA), naLinha = new Set(casas.map(c => c.join()));
          alvos = this.inimigos(autor, de).filter(([, o]) => naLinha.has(num(o.x) + ',' + num(o.y)));
          for (const [x, y] of casas) this.inflamar(mesaA, x, y);
          mudouMapa = casas.length > 0;
          danoExtra = autor.brasas + 'd6'; notasBrasa.push(`Sol Negro: ${autor.brasas} Brasas descarregadas`);
          autor.brasas = 0; autor.solNegro = true;
        } else if (brasa && msg.queimar && num(autor.brasas) > 0) {
          const ja = new Set(alvos.map(([k]) => k));
          if (!msg.distancia && temTalento(fa, 'imbk2a')) {
            const mais = this.inimigos(autor, de).filter(([k, o]) => !ja.has(k) && distanciaCasas(o, autor) <= 1);
            if (mais.length) { alvos.push(...mais); autor.brasas--; notasBrasa.push(`Lâmina Flamejante: corta ${mais.length} a mais`); }
          } else if (msg.distancia && temTalento(fa, 'imbk2d')) {
            // shortcut: os disparos extras ignoram cobertura e linha de visão; checar se a mesa reclamar
            const alc = ataqueArma(fa, true).alcance, mais = this.inimigos(autor, de).filter(([k, o]) => !ja.has(k) && distanciaCasas(o, autor) <= alc)
              .sort((a, b) => distanciaCasas(a[1], autor) - distanciaCasas(b[1], autor)).slice(0, num(autor.brasas));
            if (mais.length) { alvos.push(...mais); autor.brasas -= mais.length; notasBrasa.push(`Saraivada: ${mais.length} disparo${mais.length > 1 ? 's' : ''} extra`); }
          }
        }
        const cob = msg.cob && typeof msg.cob === 'object' ? msg.cob : {};
        const res = rolarAtaque(num(msg.mod) + modCond(autor, 'atq'), msg.tirith, !!msg.dom || !!hab);
        const coroa = res.kael === 20, olho = res.kael === 1;
        const acertos = [], tags = [];
        let critico = false;
        for (const [k, o] of alvos) {
          const def = num(o.defesa, 10) + Math.max(0, Math.min(5, Math.round(num(cob[k])))) + (o.guarda ? 2 : 0) + modCond(o, 'def');
          let ok = coroa || (!olho && res.total - (!msg.distancia && this.aparar(o, autor) ? 2 : 0) >= def), nota = o.aparou ? ' (aparou em chamas)' : '';
          delete o.aparou;
          // premonição: o golpe erra; imagens: 40% de acertar uma cópia
          if (ok && o.cond?.premonicao) { ok = false; this.tirarCond(o, 'premonicao'); nota = ' (previu o golpe)'; }
          else if (ok && o.cond?.imagens && Math.random() < .4) { ok = false; this.tirarCond(o, 'imagens'); nota = ' (era uma cópia)'; }
          const crit = ok && (coroa || res.kael === res.lyra);
          if (ok) acertos.push([k, o, crit]);
          if (crit) critico = true;
          tags.push(`${o.nome}: ${ok ? (crit ? 'crítico!' : 'acertou') : 'errou'}${nota}`);
        }
        const pele = (de.startsWith('pc:') ? autor.dados : null) || {};
        // dados em sequência (acerto → dano → punição); o golpe e o dano aparecem só no fim ('golpe')
        const base = { tipo: 'dado', nome: autor.nome, cor: autor.cor || '#e2b04a', kael: pele.kael || '#d9a23a', lyra: pele.lyra || '#3f78e0', material: pele.material || 'cristal' };
        const rot = texto(msg.rotulo, 60);
        const mandar = ev => { this.enviarTodos(ev); this.registrar({ ...ev, dados: undefined, tipo: undefined }); };
        const dadoLyra = res.dados.find(d => d.c === 'lyra'), dadoAranor = res.dados.find(d => d.c === 'aranor');
        mandar({ ...base, t: Date.now(), dados: res.dados.filter(d => d !== dadoLyra && d !== dadoAranor), total: res.total, tags, grau: acertos.length ? (alvos.length > 1 ? `${acertos.length} de ${alvos.length} atingidos` : 'Acertou') : 'Errou', desc: res.desc.split(' · ')[0], rotulo: rot });
        if (hab) {
          for (const [, o] of acertos) this.aplicarCond(o, hab);
          const extras = this.efeitosAtaque(autor, de, hab, acertos, msg, alvos);
          if (extras.length) this.enviarTodos({ tipo: 'aviso', texto: `${hab.nome}: ${extras.join(' · ')}` });
          this.enviarTodos({ tipo: 'habilidade', k: de, hab: hab.id, alvos: alvos.map(([k]) => k), acertos: acertos.map(([k]) => k), centro: this.centroDe(msg, alvos) });
          if (acertos.length && Object.keys(hab.cond).length) this.enviarTodos({ tipo: 'aviso', texto: `${hab.nome}: ${acertos.map(([, o]) => o.nome).join(', ')} — ${Object.keys(hab.cond).map(c => CONDICOES[c].ic + ' ' + CONDICOES[c].nome).join(', ')}.` });
        }
        // habilidade de controle (sem dano) só põe as condições
        if (acertos.length && hab?.dados !== '-') {
          // dano = Lyra + dano da arma/técnica com seus modificadores (vazio = só Lyra)
          const exprDano = [hab ? danoHabilidade(autor.ficha, hab) : msg.dano, quente && (hab || autor.imbuido) && '1d6', danoExtra].filter(Boolean).join('+');
          const d = (exprDano && rolarExpr(exprDano)) || { dados: [], total: 0, desc: '' };
          // crítico: Lyra conta como 20 e o alvo usa só metade da Proteção
          const somaDano = res.lyra + d.total, somaCrit = 20 + d.total, tagsD = critico ? ['Crítico: Lyra 20, ½ Proteção'] : [], abatidos = [], volta = [];
          let causado = 0;
          for (const [, o, crit] of acertos) {
            const prot = hab?.perfura || (brasa && quente && temTalento(fa, 'imbk3a')) ? 0 : crit ? Math.floor(num(o.protecao) / 2) : num(o.protecao);
            let sofre = Math.max(0, (crit ? somaCrit : somaDano) - prot), extra = '';
            if (o.cond?.vulneravel) { const v = rolarExpr('1d6').total; sofre += v; extra += ` +${v} vulnerável`; }
            const abs = this.absorver(o, sofre); sofre -= abs; if (abs) extra += ` (escudo −${abs})`;
            const antes = num(o.vigor);
            o.vigor = Math.max(-99, antes - sofre);
            if (this.eterno(o)) extra += ' (Eterno: volta com 10)';
            if (sofre > 0) this.tirarCond(o, 'adormecido');
            causado += sofre;
            if (fogo && antes > 0 && o.vigor <= 0 && o.cond?.queimando) autor.brasas = Math.min(5, num(autor.brasas) + 1);
            if (antes > 0 && o.vigor <= 0 && o.tipo !== 'aliado' && Object.values(s.npcs).includes(o) && (de.startsWith('pc:') || autor.tipo === 'aliado')) abatidos.push(o);
            tagsD.push(`${o.nome} −${sofre}${prot ? ` (Proteção ${prot})` : ''}${extra}`);
            // reflexo e espinhos ferem quem golpeou
            if (o.cond?.refletindo && sofre > 1) { const r = Math.floor(sofre / 2); autor.vigor = num(autor.vigor) - r; volta.push(`${autor.nome} −${r} (reflexo)`); }
            if (o.cond?.espinhos && !msg.distancia) { const r = rolarExpr('1d6').total; autor.vigor = num(autor.vigor) - r; volta.push(`${autor.nome} −${r} (espinhos)`); if (this.kalthor(o) && this.acender(autor, 1)) volta.push(`${autor.nome} pega fogo`); }
          }
          if (hab?.dreno && causado) { const c = this.curar(autor, Math.floor(causado * hab.dreno)); if (c) volta.push(`${autor.nome} +${c} (dreno)`); }
          tagsD.push(...volta);
          mandar({ ...base, t: Date.now() + 1, dados: [dadoLyra, ...d.dados], total: critico ? somaCrit : somaDano, tags: tagsD, grau: '', desc: `Lyra ${res.lyra}${d.desc ? ' + ' + d.desc : ''}`, rotulo: 'Dano · ' + texto(msg.rotulo, 50) });
          // shortcut: tabela de punição ainda não existe; ligar aqui quando o dono montar
          if (dadoAranor) mandar({ ...base, t: Date.now() + 2, dados: [dadoAranor], total: res.aranor, tags: [`Aranor ${res.aranor}: punição do Dom`], grau: '', desc: `Aranor ${res.aranor}`, rotulo: 'Punição · ' + texto(msg.rotulo, 46) });
          if (!hab) this.enviarTodos({ tipo: 'golpe', k: de, dom: !!msg.dom && !msg.arma, imbuida: !!msg.dom && !!msg.arma, alvos: acertos.map(([k]) => k), distancia: !!msg.distancia });
          for (const o of abatidos) this.xpAbate(o, de);
        }
        if (brasa) for (const [, o, crit] of acertos) {
          const martelo = crit && !msg.distancia && temTalento(fa, 'imbk2b'), flecha = msg.distancia && temTalento(fa, 'imbk2c');
          if (martelo) { o.cond ||= {}; o.cond.marcado = Math.max(num(o.cond.marcado), 1); notasBrasa.push(`${o.nome} cai`); }
          if (martelo || flecha) { this.inflamar(mesaA, num(o.x), num(o.y)); mudouMapa = true; notasBrasa.push(`o chão sob ${o.nome} pega fogo`); }
        }
        if (notasBrasa.length) this.enviarTodos({ tipo: 'aviso', texto: `Arma de Brasa: ${notasBrasa.join(' · ')}` });
        if (fogo && acertos.length) {
          const linhas = [];
          for (const [k, o] of acertos) { this.acender(o, 1); const t = this.pavor(autor, k, o, mesaA, coroa); if (t) linhas.push(t); }
          autor.brasas = Math.min(5, num(autor.brasas) + 1);
          linhas.push(`${autor.nome}: ${autor.brasas} Brasa${autor.brasas > 1 ? 's' : ''}${autor.brasas >= 5 ? ' — Superaquecido!' : ''}`);
          this.enviarTodos({ tipo: 'aviso', texto: `Brasa Viva: ${linhas.join(' · ')}` });
        }
        await this.gravar('pcs', 'npcs', 'log', ...(hab || mudouMapa ? ['mapas'] : []));
        break;
      }
      case 'rolar': {
        let res;
        if (msg.modo === 'expr') res = rolarExpr(msg.expr);
        else if (msg.dom) {
          // todo uso de Dom rola Kael, Lyra e Aranor (d20); Kael + mod contra a DIF
          const a = rolarAtaque(msg.mod, msg.tirith, true), dif = num(msg.dif);
          const ok = a.kael === 20 || (a.kael !== 1 && a.total >= dif);
          res = { dados: a.dados, total: a.total, tags: [`Aranor ${a.aranor}: punição do Dom`], grau: dif ? (ok ? 'Sucesso' : 'Falha') : '', desc: a.desc + (dif ? ` vs DIF ${dif}` : '') };
        } else res = rolar2d10(msg.mod, msg.tirith, msg.dif, false);
        if (!res) return erro('Use algo como 2d6+3.');
        const pc = s.pcs[att.id];
        const pele = pc?.dados || {};
        const oculta = mestre && !!msg.oculta;
        const evento = {
          tipo: 'dado', nome: mestre && !pc ? 'Mestre' : (pc?.nome || att.nome), cor: pc?.cor || '#e2b04a',
          kael: pele.kael || '#d9a23a', lyra: pele.lyra || '#3f78e0', material: pele.material || 'cristal',
          dados: res.dados, total: res.total, tags: res.tags, grau: res.grau, desc: res.desc,
          rotulo: texto(msg.rotulo, 60), oculta, t: Date.now(), k: pc ? 'pc:' + att.id : null, dom: !!msg.dom,
        };
        this.enviarTodos(evento, oculta);
        this.registrar({ ...evento, dados: undefined, tipo: undefined, k: undefined, dom: undefined });
        await this.gravar('log');
        break;
      }
      case 'fichaMestre': {
        // anotações do Mestre: secretas (só ele) e para o jogador (só o dono vê)
        const p = mestre && s.pcs[String(msg.id)];
        if (!p) return;
        if ('notasMestre' in msg) p.notasMestre = texto(msg.notasMestre, 3000);
        if ('notasJogador' in msg) p.notasJogador = texto(msg.notasJogador, 2000);
        await this.gravar('pcs');
        break;
      }
      case 'ajuda': {
        // dica e/ou bônus no próximo teste aprovado; secreta = só o jogador vê
        if (!mestre) return;
        const id = String(msg.id), p = s.pcs[id];
        if (!p) return;
        const bonus = Math.max(0, Math.min(5, Math.round(num(msg.bonus)))), dica = texto(msg.texto, 300), secreta = !!msg.secreta;
        if (!bonus && !dica) return erro('Escreva a ajuda ou dê um bônus.');
        if (bonus) p.ajuda = bonus;
        const txt = `Ajuda do Mestre para ${p.nome}${bonus ? ` (+${bonus} no próximo teste)` : ''}${dica ? ': ' + dica : ''}`;
        if (secreta) this.enviarPara(id, { tipo: 'aviso', texto: txt }); else this.enviarTodos({ tipo: 'aviso', texto: txt });
        this.registrar({ nome: 'Mestre', cor: '#e2b04a', rotulo: 'Ajuda', total: bonus, grau: p.nome, desc: dica || 'Bônus no próximo teste', ...(secreta ? { oculta: true, para: id } : {}) });
        await this.gravar('pcs', 'log');
        break;
      }
      case 'pedir': {
        // jogador pede um teste; o Mestre define a DIF (oculta) e aprova ou recusa
        const pc = s.pcs[att.id];
        if (mestre || !pc) return;
        if (s.pedidos.filter(p => p.pc === att.id).length >= 3) return erro('Aguarde o Mestre responder seus pedidos.');
        s.pedidos.push({ id: hex(crypto.getRandomValues(new Uint8Array(5))), pc: att.id, nome: pc.nome, cor: pc.cor, rotulo: texto(msg.rotulo, 60) || 'Teste', mod: Math.max(-20, Math.min(30, Math.round(num(msg.mod)))), tirith: ['vantagem', 'desvantagem'].includes(msg.tirith) ? msg.tirith : 'normal', t: Date.now() });
        await this.gravar('pedidos');
        break;
      }
      case 'decidir': {
        if (!mestre) return;
        const i = s.pedidos.findIndex(p => p.id === String(msg.id));
        if (i < 0) return;
        const [ped] = s.pedidos.splice(i, 1), pc = s.pcs[ped.pc];
        if (!msg.aprovar || !pc) {
          this.enviarTodos({ tipo: 'aviso', texto: `O Mestre recusou o teste de ${ped.rotulo} de ${ped.nome}.` });
          await this.gravar('pedidos');
          break;
        }
        const dif = Math.max(1, Math.min(40, Math.round(num(msg.dif, 15))));
        const tirith = ['vantagem', 'desvantagem'].includes(msg.tirith) ? msg.tirith : ped.tirith;
        const ajuda = num(pc.ajuda); delete pc.ajuda;
        const res = rolar2d10(ped.mod + ajuda, tirith, dif, false);
        if (ajuda) res.tags.push(`Ajuda do Mestre +${ajuda}`);
        const ok = /^Sucesso/.test(res.grau) && !res.grau.endsWith('?');
        const pele = pc.dados || {};
        // a DIF não vai para os jogadores: só o grau (sucesso/falha) aparece
        const evento = {
          tipo: 'dado', nome: pc.nome, cor: pc.cor || '#e2b04a', kael: pele.kael || '#d9a23a', lyra: pele.lyra || '#3f78e0', material: pele.material || 'cristal',
          dados: res.dados, total: res.total, tags: res.tags, grau: res.grau, desc: res.desc.replace(/ vs DIF \d+/, ''),
          rotulo: ped.rotulo, t: Date.now(), k: 'pc:' + ped.pc, dom: false,
        };
        this.enviarTodos(evento);
        this.registrar({ ...evento, dados: undefined, tipo: undefined, k: undefined, dom: undefined, difMestre: dif });
        const xp = Math.max(0, Math.min(20, Math.round(num(msg.xp))));
        if (ok && xp) this.darXp(ped.pc, xp, `Sucesso em ${ped.rotulo}`);
        await this.gravar('pedidos', 'pcs', 'log');
        break;
      }
      case 'ping': {
        this.enviarTodos({ tipo: 'ping', x: Math.round(num(msg.x)), y: Math.round(num(msg.y)), cor: s.pcs[att.id]?.cor || '#e2b04a' });
        return;
      }
      case 'aviso': {
        this.enviarTodos({ tipo: 'aviso', texto: `${s.pcs[att.id]?.nome || att.nome}: ${texto(msg.texto, 120)}` }, true);
        return;
      }
      case 'senhaNova': {
        if (!mestre) return;
        const senha = String(msg.senha || '');
        if (senha.length < 4) return erro('A senha precisa de pelo menos 4 caracteres.');
        const { salt, hash } = await hashSenha(senha);
        s.meta.salt = salt; s.meta.hash = hash;
        await this.gravar('meta');
        ws.send(JSON.stringify({ tipo: 'aviso', texto: 'Senha da sala alterada.' }));
        return;
      }
      case 'expulsar': {
        if (!mestre) return;
        const alvo = String(msg.id);
        delete s.meta.membros[alvo]; delete s.pcs[alvo];
        await this.gravar('meta', 'pcs');
        for (const x of this.conectados()) if (x.att.id === alvo) { try { x.ws.send(JSON.stringify({ tipo: 'removida', texto: 'O Mestre removeu você da sessão.' })); x.ws.close(4005, 'expulso'); } catch {} }
        break;
      }
      default: return;
    }
    await this.difundir();
  }

  centroDe(msg, alvos) {
    const c = msg.centro && typeof msg.centro === 'object' ? msg.centro : null;
    if (c) return { x: Math.round(num(c.x)), y: Math.round(num(c.y)) };
    const o = alvos[0]?.[1]; return o ? { x: num(o.x), y: num(o.y) } : null;
  }
  // põe as condições da habilidade (fica a maior duração) e aplica limpa/dissipa/caos
  aplicarCond(o, hab) {
    if (hab.limpa && o.cond) for (const c of Object.keys(o.cond)) if (!CONDICOES[c]?.bom) delete o.cond[c];
    if (hab.dissipa && o.cond) for (const c of Object.keys(o.cond)) if (CONDICOES[c]?.bom) delete o.cond[c];
    const conds = { ...hab.cond };
    if (hab.caos) conds[CONDS_CAOS[Math.floor(Math.random() * CONDS_CAOS.length)]] = 2;
    for (const [c, n] of Object.entries(conds)) { o.cond ||= {}; o.cond[c] = Math.max(num(o.cond[c]), n); }
    if (o.cond?.fenix) delete o.cond.queimando;
    if (o.cond && !Object.keys(o.cond).length) delete o.cond;
    if (hab.escudo) o.escudo = Math.max(num(o.escudo), hab.escudo);
  }
  // condição Eterno: ao cair a 0, volta com 10 e a condição acaba
  eterno(o) { if (num(o.vigor) > 0 || !o.cond?.eterno) return false; o.vigor = 10; this.tirarCond(o, 'eterno'); if (o.cond?.fenix) this.explodirFenix(o); return true; }
  // Renascer da Fênix: ao voltar com Eterno, explode em quem é do outro lado a até 2 casas
  explodirFenix(o) {
    const lado = x => Object.values(this.s.pcs).includes(x) || x.tipo === 'aliado', meu = lado(o), mapa = this.idMapa(o), linhas = [];
    for (const x of [...Object.values(this.s.pcs), ...Object.values(this.s.npcs)]) {
      if (x === o || lado(x) === meu || this.idMapa(x) !== mapa || num(x.vigor, 1) <= 0 || distanciaCasas(x, o) > 2) continue;
      let v = rolarExpr('4d6').total; v -= this.absorver(x, v); x.vigor = Math.max(-99, num(x.vigor) - v); this.acender(x, 2); linhas.push(`${x.nome} −${v}`);
    }
    this.enviarTodos({ tipo: 'aviso', texto: `🪶 ${o.nome} renasce das cinzas e explode${linhas.length ? ': ' + linhas.join(', ') : ''}` });
  }
  // inimigos de quem age, vivos e visíveis no mesmo mapa
  inimigos(autor, de) {
    const meu = de.startsWith('pc:') || autor.tipo === 'aliado', mapa = this.idMapa(autor);
    return [...Object.entries(this.s.pcs).map(([id, o]) => ['pc:' + id, o]), ...Object.entries(this.s.npcs).map(([id, o]) => ['npc:' + id, o])]
      .filter(([k, o]) => (k.startsWith('pc:') || o.tipo === 'aliado') !== meu && this.idMapa(o) === mapa && o.visivel !== false && num(o.vigor, 1) > 0);
  }
  // casas numa reta de n passos na direção do alvo; para em parede (fogueira deixa passar)
  linha(de, para, n, mesa) {
    const dx = num(para.x) - num(de.x), dy = num(para.y) - num(de.y), m = Math.max(Math.abs(dx), Math.abs(dy)) || 1, l = [];
    for (let i = 1; i <= n; i++) {
      const x = num(de.x) + Math.round(dx * i / m), y = num(de.y) + Math.round(dy * i / m), ch = (mesa.grid[y] || '')[x];
      if (x < 0 || y < 0 || x >= mesa.cols || y >= mesa.rows || (ch !== '*' && !Number.isFinite(TERRENOS[ch]?.custo))) break;
      l.push([x, y]);
    }
    return l;
  }
  // rastro de fogo: a casa queima por algumas rodadas (mapa.fogo, só o servidor escreve); quem começa o turno ou para nela pega fogo
  inflamar(mesa, x, y, rodadas = 2) {
    if (x < 0 || y < 0 || x >= mesa.cols || y >= mesa.rows || (mesa.grid[y] || '')[x] === '~') return;
    mesa.fogo ||= {}; mesa.fogo[x + ',' + y] = Math.max(num(mesa.fogo[x + ',' + y]), rodadas);
  }
  pisarFogo(o, mesa) {
    if (!mesa?.fogo?.[num(o.x) + ',' + num(o.y)] || !this.acender(o, 1)) return;
    this.enviarTodos({ tipo: 'aviso', texto: `${o.nome} pisa no rastro de fogo e pega fogo.` });
  }
  // Aparar em Chamas: reação automática de quem tem a arma em brasa (1 Brasa): −2 no golpe e o atacante pega fogo
  aparar(o, autor) {
    if (!o.imbuido || !temTalento(o.ficha, 'imbk3b') || num(o.brasas) < 1) return false;
    o.brasas--; this.acender(autor, 1); o.aparou = true; return true;
  }
  // Kalthor: PC pela ficha (Dom ou 2º Dom de dualista), NPC pelo Dom marcado no editor
  kalthor(o) { const f = o?.ficha; return f ? f.dom === 'kalthor' || (f.estrato === 'dualista' && f.dom2 === 'kalthor') : o?.dom === 'kalthor'; }
  // põe Queimando sem acumular (só renova a duração); Fênix é imune
  acender(o, n) { if (o.cond?.fenix) return false; o.cond ||= {}; o.cond.queimando = Math.max(num(o.cond.queimando), n); return true; }
  // Pavor das Chamas: d20 + (Robustez − 10) do alvo contra 10 + nível do Kalthor; falhou = Amedrontado e foge
  pavor(autor, k, o, mesa, coroa) {
    if (num(o.vigor) <= 0 || o.cond?.abalado) return '';
    // shortcut: NPC não tem nível; usa 3 até o editor ganhar o campo
    const nivel = autor.ficha ? num(autor.ficha.nivel, 1) : 3, r = 1 + Math.floor(Math.random() * 20), total = r + num(o.robustez, 10) - 10;
    if (total >= 10 + nivel) return `${o.nome} resiste ao Pavor (${total})`;
    o.cond ||= {}; o.cond.amedrontado = Math.max(num(o.cond.amedrontado), 1); o.cond.abalado = 2;
    const t = this.empurrar(o, k, { x: num(autor.x), y: num(autor.y) }, (1 + Math.floor(nivel / 2)) * (coroa ? 2 : 1), mesa);
    return `${o.nome} entra em pânico${t ? ' e foge (' + t + ')' : ''}`;
  }
  tirarCond(o, c) { if (o?.cond?.[c]) { delete o.cond[c]; if (!Object.keys(o.cond).length) delete o.cond; } }
  // escudo absorve dano antes do Vigor; devolve quanto absorveu
  absorver(o, dano) { const e = Math.min(num(o.escudo), dano); if (e > 0) { o.escudo = num(o.escudo) - e; if (o.escudo <= 0) delete o.escudo; } return Math.max(0, e); }
  // Ferida de Brasa: quem está Queimando recebe metade da cura (inteira = ignora)
  curar(o, v, inteira = false) { if (o.cond?.queimando && !inteira) v = Math.floor(v / 2); const antes = num(o.vigor), max = num(o.vigorMax, antes); o.vigor = Math.min(Math.max(max, antes), antes + Math.max(0, v)); return o.vigor - antes; }
  livre(mesa, x, y, ocup) { return x >= 0 && y >= 0 && x < mesa.cols && y < mesa.rows && Number.isFinite(TERRENOS[(mesa.grid[y] || '')[x]]?.custo) && !ocup.has(x + ',' + y); }
  // empurra (n > 0) para longe da origem ou puxa (n < 0) para ela; bater em algo = 1d6
  empurrar(o, k, origem, n, mesa) {
    if (num(o.tamanho, 1) > 1) return '';
    let dx = Math.sign(num(o.x) - origem.x), dy = Math.sign(num(o.y) - origem.y);
    if (n < 0) { dx = -dx; dy = -dy; }
    if (!dx && !dy) return '';
    const ocup = this.ocupadas(k, mesa.id); let p = 0;
    for (; p < Math.abs(n); p++) {
      const nx = num(o.x) + dx, ny = num(o.y) + dy;
      if (n < 0 && nx === origem.x && ny === origem.y && distanciaCasas(o, origem) <= 1) break;
      if (!this.livre(mesa, nx, ny, ocup)) {
        if (n > 0) { const v = rolarExpr('1d6').total; o.vigor = num(o.vigor) - v; return `${o.nome} bate e sofre ${v}`; }
        break;
      }
      o.x = nx; o.y = ny;
    }
    return p ? `${o.nome} ${n > 0 ? 'empurrado' : 'puxado'} ${p}` : '';
  }
  // o golpe salta do primeiro alvo para inimigos do mesmo lado a até 3 casas
  cadeia(alvos, n, de, filtro = () => true) {
    const [k0, o0] = alvos[0], mapa = this.idMapa(o0), lista = [...alvos], vistos = new Set(alvos.map(([k]) => k).concat(de));
    const lado = (k, o) => k.startsWith('pc:') || o.tipo === 'aliado' ? 'a' : 'b', meuLado = lado(k0, o0);
    const todos = [...Object.entries(this.s.npcs).map(([id, o]) => ['npc:' + id, o]), ...Object.entries(this.s.pcs).map(([id, o]) => ['pc:' + id, o])];
    let ult = o0;
    for (let i = 0; i < n; i++) {
      const prox = todos.filter(([k, o]) => !vistos.has(k) && this.idMapa(o) === mapa && lado(k, o) === meuLado && num(o.vigor, 1) > 0 && distanciaCasas(o, ult) <= 3 && filtro(o))
        .sort((a, b) => distanciaCasas(a[1], ult) - distanciaCasas(b[1], ult))[0];
      if (!prox) break;
      vistos.add(prox[0]); lista.push(prox); ult = prox[1];
    }
    return lista;
  }
  // depois de acertar: empurrões, troca, arremesso, roubo de Fôlego e mudanças no terreno
  efeitosAtaque(autor, de, hab, acertos, msg, alvos) {
    const mesa = this.s.mapas[this.idMapa(autor)], linhas = [], centro = this.centroDe(msg, alvos);
    const origem = hab.raio && centro ? centro : { x: num(autor.x), y: num(autor.y) };
    for (const [k, o] of acertos) {
      if (hab.empurra) { const t = this.empurrar(o, k, origem, hab.empurra, mesa); if (t) linhas.push(t); }
      if (hab.troca && num(o.tamanho, 1) === 1) { [autor.x, o.x] = [o.x, autor.x]; [autor.y, o.y] = [o.y, autor.y]; autor.tp = num(autor.tp) + 1; o.tp = num(o.tp) + 1; linhas.push(`${autor.nome} troca de lugar com ${o.nome}`); }
      if (hab.joga && num(o.tamanho, 1) === 1) {
        const ocup = this.ocupadas(k, mesa.id), op = [];
        for (let y = num(o.y) - hab.joga; y <= num(o.y) + hab.joga; y++) for (let x = num(o.x) - hab.joga; x <= num(o.x) + hab.joga; x++) if ((x !== o.x || y !== o.y) && this.livre(mesa, x, y, ocup) && !mesa.portais?.[x + ',' + y]) op.push([x, y]);
        const c = op[Math.floor(Math.random() * op.length)]; if (c) { [o.x, o.y] = c; o.tp = num(o.tp) + 1; linhas.push(`${o.nome} é arremessado`); }
      }
      if (hab.rouba && o.folego !== undefined) { const v = Math.min(num(o.folego), hab.rouba); o.folego = num(o.folego) - v; autor.folego = Math.min(num(autor.folegoMax, 99), num(autor.folego) + v); if (v) linhas.push(`${autor.nome} rouba ${v} de Fôlego`); }
    }
    if ((hab.altura || hab.derruba || hab.terreno) && centro) { const t = this.moldar(mesa, centro, hab); if (t) linhas.push(t); }
    return linhas;
  }
  // terreno: cria (só em casas transitáveis; bloqueio só em casa vazia), derruba ou muda a altura
  moldar(mesa, c, hab) {
    const ocup = this.ocupadas(null, mesa.id), novo = TERRENOS[hab.terreno];
    if (hab.altura && !Array.isArray(mesa.alt)) mesa.alt = [];
    let n = 0;
    for (let y = c.y - hab.raio; y <= c.y + hab.raio; y++) for (let x = c.x - hab.raio; x <= c.x + hab.raio; x++) {
      if (x < 0 || y < 0 || x >= mesa.cols || y >= mesa.rows || mesa.portais?.[x + ',' + y]) continue;
      const linha = mesa.grid[y] || '', ch = linha[x], t = TERRENOS[ch];
      const por = v => { mesa.grid[y] = linha.slice(0, x) + v + linha.slice(x + 1); n++; };
      if (novo && Number.isFinite(t?.custo) && ch !== hab.terreno && (Number.isFinite(novo.custo) || !ocup.has(x + ',' + y))) por(hab.terreno);
      if (hab.derruba && t && (t.parede || !Number.isFinite(t.custo)) && !'TPQ'.includes(ch)) por('.');
      if (hab.altura) {
        const a = (mesa.alt[y] || '').padEnd(mesa.cols, '1'), v = Math.max(0, Math.min(4, num(a[x], 1) + hab.altura));
        mesa.alt[y] = a.slice(0, x) + v + a.slice(x + 1); n++;
      }
    }
    return n ? (hab.altura ? `o chão ${hab.altura > 0 ? 'se ergue' : 'afunda'}` : hab.derruba ? 'muros vêm abaixo' : `surge ${TERRENOS[hab.terreno].n.toLowerCase()}`) : '';
  }
  // habilidade sem rolar contra Defesa (si, apoio, teleporte, campo); Kael 1 (Olho de Aranor) falha. Devolve erro ou nada.
  async habilidadeEspecial(autor, de, hab, alvos, msg) {
    const mesa = this.s.mapas[this.idMapa(autor)], centro = this.centroDe(msg, alvos);
    if (hab.t === 'si') alvos = [[de, autor]];
    if (hab.t === 'apoio' && !alvos.length) return 'Escolha um aliado.';
    if (hab.t === 'mov') {
      if (!centro || distanciaCasas(autor, centro) > hab.alc) return 'Longe demais.';
      if (temCond(autor, 'imovel')) return `${autor.nome} não pode se mover.`;
      if (!this.livre(mesa, centro.x, centro.y, this.ocupadas(de, mesa.id))) return 'Essa casa está ocupada ou bloqueada.';
      alvos = [[de, autor]];
    }
    if (hab.t === 'campo') {
      if (!centro || distanciaCasas(autor, centro) > hab.alc) return 'Longe demais.';
      const todos = [...Object.entries(this.s.pcs).map(([id, o]) => ['pc:' + id, o]), ...Object.entries(this.s.npcs).map(([id, o]) => ['npc:' + id, o])];
      alvos = todos.filter(([, o]) => this.idMapa(o) === mesa.id && o.visivel !== false && distanciaCasas(o, centro) <= hab.raio);
    }
    const res = rolarAtaque(num(msg.mod), msg.tirith, true), falha = res.kael === 1;
    const pele = autor.dados || {}, tags = [];
    const base = { tipo: 'dado', nome: autor.nome, cor: autor.cor || '#e2b04a', kael: pele.kael || '#d9a23a', lyra: pele.lyra || '#3f78e0', material: pele.material || 'cristal' };
    const cura = !falha && hab.dados ? rolarExpr(danoHabilidade(autor.ficha, hab)) : null;
    if (!falha) {
      if (hab.t === 'mov') { autor.x = centro.x; autor.y = centro.y; autor.tp = num(autor.tp) + 1; tags.push(`${autor.nome} reaparece em outra casa`); }
      for (const [, o] of alvos) {
        if (hab.revive && num(o.vigor) <= 0) { o.vigor = hab.revive; tags.push(`${o.nome} se levanta`); }
        if (cura) tags.push(`${o.nome} +${this.curar(o, cura.total, !!hab.brasas)} Vigor`);
        if (hab.folego && o.folegoMax !== undefined) { const antes = num(o.folego); o.folego = Math.min(num(o.folegoMax), antes + hab.folego); tags.push(`${o.nome} +${o.folego - antes} Fôlego`); }
        this.aplicarCond(o, hab);
        if (hab.escudo) tags.push(`${o.nome}: escudo ${o.escudo}`);
      }
      if (hab.brasas) { autor.brasas = Math.min(5, num(autor.brasas) + hab.brasas); tags.push(`${autor.nome}: ${autor.brasas} Brasas`); }
      if (hab.turbo && num(autor.brasas) >= hab.turbo.n) { autor.brasas -= hab.turbo.n; this.aplicarCond(autor, { cond: hab.turbo.cond }); tags.push(`gasta ${hab.turbo.n} Brasas: ${Object.keys(hab.turbo.cond).map(c => CONDICOES[c].nome).join(', ')}`); }
      if (hab.t === 'campo') { const t = this.moldar(mesa, centro, hab); if (t) tags.push(t); }
    }
    if (!falha && alvos.length && Object.keys(hab.cond).length) tags.push(Object.keys(hab.cond).map(c => CONDICOES[c].ic + ' ' + CONDICOES[c].nome).join(', ') + ' em ' + alvos.map(([, o]) => o.nome).join(', '));
    const ev = { ...base, t: Date.now(), dados: [...res.dados, ...(cura?.dados || [])], total: cura ? cura.total : res.kael, tags: falha ? ['Olho de Aranor: a habilidade falha'] : tags, grau: falha ? 'Falhou' : 'Sucesso', desc: res.desc + (cura ? ` · cura ${cura.desc}` : ''), rotulo: hab.nome };
    this.enviarTodos(ev); this.registrar({ ...ev, dados: undefined, tipo: undefined });
    this.enviarTodos({ tipo: 'habilidade', k: de, hab: hab.id, alvos: alvos.map(([k]) => k), acertos: falha ? [] : alvos.map(([k]) => k), centro, falhou: falha });
    await this.gravar('pcs', 'npcs', 'log', 'mapas');
  }
  // começo do turno: dano/cura das condições, ação perdida e −1 na duração
  tickCondicoes(o, k, chave) {
    const linhas = [], sangra = !!o.cond.sangrando, perde = Math.max(-1, Math.min(3, modCond(o, 'acoes')));
    // ações: atordoado/adormecido tiram, acelerado dá uma a mais (usadas negativo)
    if (perde && k.startsWith('pc:')) o.acoes = { chave, usadas: perde };
    if (perde > 0) linhas.push(perde >= 3 ? '💤 perde o turno' : `perde ${perde} ação`); else if (perde < 0) linhas.push('⏩ +1 ação');
    for (const [c, n] of Object.entries(o.cond)) {
      if (!o.cond?.[c]) continue; // Eterno pode ter saído no meio do laço
      const def = CONDICOES[c]; if (!def) { delete o.cond[c]; continue; }
      if (def.dot) { let v = rolarExpr(def.dot).total; v -= this.absorver(o, v); o.vigor = Math.max(-99, num(o.vigor) - v); linhas.push(`${def.ic} −${v} (${def.nome})`); if (this.eterno(o)) linhas.push('♾ volta com 10'); }
      if (def.cura) linhas.push(sangra ? `${def.ic} sangrando: não regenera` : `${def.ic} +${this.curar(o, rolarExpr(def.cura).total)} (${def.nome})`);
      if (n <= 1) delete o.cond[c]; else o.cond[c] = n - 1;
    }
    if (o.cond && !Object.keys(o.cond).length) delete o.cond;
    if (linhas.length) this.enviarTodos({ tipo: 'aviso', texto: `${o.nome}: ${linhas.join(' · ')}` });
    this.enviarTodos({ tipo: 'condicao', k, dano: linhas.some(l => l.includes('−')), cura: linhas.some(l => l.includes('+')) });
  }
  objetoDe(k) {
    k = String(k || ''); const i = k.indexOf(':'), t = k.slice(0, i), id = k.slice(i + 1);
    return t === 'pc' ? this.s.pcs[id] : t === 'npc' ? this.s.npcs[id] : null;
  }

  // XP só para personagens dos jogadores (NPCs e Mestre não sobem de nível).
  darXp(id, delta, motivo, secreta = false) {
    const p = this.s.pcs[id]; delta = Math.round(num(delta)); if (!p || !delta) return;
    p.xp = Math.max(0, Math.min(999, num(p.xp) + delta));
    const atual = num(p.ficha?.nivel, 1);
    this.registrar({ nome: p.nome, cor: p.cor, rotulo: 'Experiência', total: delta, grau: `${p.xp} XP`, desc: motivo, tags: nivelPorXp(p.xp) > atual ? [`Pode subir para o nível ${atual + 1}`] : [], ...(secreta ? { oculta: true, para: id } : {}) });
    if (secreta) this.enviarPara(id, { tipo: 'aviso', texto: `O Mestre lhe deu ${delta > 0 ? '+' : ''}${delta} XP: ${motivo}` });
  }
  enviarPara(id, msg) {
    const t = JSON.stringify(msg);
    for (const { ws, att } of this.conectados()) if (att.id === id || att.mestre) { try { ws.send(t); } catch {} }
  }
  // Inimigo derrubado: XP dividida entre os PCs do mapa; quem deu o último golpe ganha +50%.
  xpAbate(npc, autorK) {
    const total = npc.xp ?? Math.max(1, Math.round(num(npc.vigorMax, 10) / 5));
    const mapa = this.idMapa(npc), grupo = Object.keys(this.s.pcs).filter(id => this.idMapa(this.s.pcs[id]) === mapa);
    if (!total || !grupo.length) return;
    const parte = Math.max(1, Math.round(total / grupo.length)), matador = autorK?.startsWith('pc:') ? autorK.slice(3) : null;
    for (const id of grupo) this.darXp(id, parte + (id === matador ? Math.ceil(total / 2) : 0), `${npc.nome} derrotado${id === matador ? ' (último golpe)' : ''}`);
  }

  registrar(entrada) {
    this.s.log = [{ ...entrada, t: Date.now() }, ...this.s.log].slice(0, 60);
  }

  ocupadas(exceto, mapa) {
    const occ = new Set();
    const tudo = [...Object.entries(this.s.pcs).map(([id, p]) => ['pc:' + id, p]), ...Object.entries(this.s.npcs).map(([id, n]) => ['npc:' + id, n])];
    for (const [k, t] of tudo) {
      if (k === exceto || (mapa && this.idMapa(t) !== mapa)) continue;
      const tam = num(t.tamanho, 1);
      for (let i = 0; i < tam; i++) for (let j = 0; j < tam; j++) occ.add((num(t.x) + i) + ',' + (num(t.y) + j));
    }
    return occ;
  }

  casaLivre(mapa, px, py) {
    mapa ||= this.idMapa(null);
    const mesa = this.s.mapas[mapa], occ = this.ocupadas(null, mapa);
    const cx = px ?? Math.floor(mesa.cols / 2), cy = py ?? Math.floor(mesa.rows / 2);
    for (let raio = 0; raio < 60; raio++) for (let dx = -raio; dx <= raio; dx++) for (let dy = -raio; dy <= raio; dy++) {
      const x = cx + dx, y = cy + dy;
      if (Number.isFinite(custoCel(mesa, x, y)) && !occ.has(x + ',' + y)) return [x, y];
    }
    return [0, 0];
  }
}
