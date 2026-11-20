import { DurableObject } from 'cloudflare:workers';
import { TERRENOS, LUZES, LUAS, r, num, custoCel, dijkstra, rolar2d10, rolarAtaque, rolarExpr } from '../public/regras.js';

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
const CAMPOS_PC = ['nome', 'sigla', 'cor', 'vigor', 'vigorMax', 'folego', 'folegoMax', 'tensao', 'limiar', 'defesa', 'desloc', 'ini', 'dados', 'robustez', 'determinacao', 'protecao', 'limiarFer', 'ficha', 'aparencia', 'imbuido'];
const CAMPOS_NPC = ['nome', 'sigla', 'cor', 'tipo', 'vigor', 'vigorMax', 'defesa', 'ini', 'desloc', 'tamanho', 'visivel', 'descricao', 'falas', 'notas', 'x', 'y', 'raca', 'aparencia', 'ataque', 'dano', 'alcance', 'protecao'];
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
  if ('ficha' in o) { o.ficha = objetoLimitado(o.ficha, 16000); if (!o.ficha) delete o.ficha; }
  if ('aparencia' in o) { o.aparencia = objetoLimitado(o.aparencia, 3000); if (!o.aparencia) delete o.aparencia; }
  if ('imbuido' in o) o.imbuido = !!o.imbuido;
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
    const m = await this.ctx.storage.get(['meta', 'mesa', 'mapas', 'pcs', 'npcs', 'log']);
    this.s = {
      meta: m.get('meta') || null,
      mapas: m.get('mapas') || null,
      pcs: m.get('pcs') || {},
      npcs: m.get('npcs') || {},
      log: m.get('log') || [],
    };
    // sessões antigas tinham um mapa só ("mesa"): vira o primeiro mapa da sessão
    if (!this.s.mapas && m.get('mesa')) {
      this.s.mapas = { m1: { ...m.get('mesa'), id: 'm1' } };
      if (this.s.meta) { this.s.meta.mapaInicial = 'm1'; this.s.meta.vendo = 'm1'; }
    }
    this.s.mapas ||= {};
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
    for (const [id, p] of Object.entries(s.pcs)) pcs[id] = { ...p, mapa: this.idMapa(p) };
    return {
      tipo: 'estado',
      voce: { id: att.id, nome: att.nome, mestre: att.mestre },
      sala: { codigo: s.meta.codigo, nome: s.meta.nome, mestreNome: s.meta.mestreNome, max: MAX_JOGADORES, mapaInicial: s.meta.mapaInicial },
      mapas: Object.values(s.mapas).map(m => ({ id: m.id, nome: m.nome, cols: m.cols, rows: m.rows })),
      mesa, pcs, npcs,
      log: s.log.filter(l => att.mestre || !l.oculta).slice(0, 40),
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
        if (!s.pcs[alvo]) {
          if (alvo !== att.id) return;
          const mapa = mestre ? mesa.id : this.idMapa(null);
          const [x, y] = this.casaLivre(mapa);
          s.pcs[alvo] = { nome: att.nome, cor: '#e2b04a', vigorMax: 21, folegoMax: 18, limiar: 6, defesa: 12, desloc: 6, ini: 0, ...dados, x, y, mapa, tensao: 0 };
          s.pcs[alvo].vigor ??= s.pcs[alvo].vigorMax;
          s.pcs[alvo].folego ??= s.pcs[alvo].folegoMax;
        } else Object.assign(s.pcs[alvo], dados);
        await this.gravar('pcs');
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
          const lim = cb.ativo ? num(obj.desloc, 6) : 9999;
          if (cb.ativo) {
            if (cb.ordem[cb.turno]?.k !== 'pc:' + id) return erro('Aguarde o seu turno.');
            const chave = `${cb.rodada}:${cb.turno}`;
            const usadas = obj.acoes?.chave === chave ? num(obj.acoes.usadas) : 0;
            if (usadas >= 3) return erro('Você já usou as 3 ações.');
            obj.acoes = { chave, usadas: usadas + 1 };
          }
          const d = dijkstra(mesa, this.ocupadas('pc:' + id, mesa.id), num(obj.x), num(obj.y), lim);
          if (!d.has(x + ',' + y)) return erro(cb.ativo ? 'Fora do seu Deslocamento.' : 'Sem caminho até lá.');
        }
        obj.x = x; obj.y = y;
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
          const vez = this.objetoDe(cb.ordem[turno]?.k);
          if (vez) delete vez.guarda;   // a Defesa extra dura até o próximo turno de quem defendeu
          const nomeVez = vez?.nome || '—';
          this.enviarTodos({ tipo: 'turno', k: cb.ordem[turno]?.k, nome: nomeVez, rodada });
          await this.gravar('pcs', 'npcs');
        } else if (msg.acao === 'encerrar') {
          mesa.combate = { ...COMBATE_VAZIO };
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
        const alvos = [...new Set((Array.isArray(msg.alvos) ? msg.alvos : []).map(String))].slice(0, 16).map(k => [k, this.objetoDe(k)]).filter(([, o]) => o);
        if (!alvos.length) return erro('Escolha um alvo.');
        const cob = msg.cob && typeof msg.cob === 'object' ? msg.cob : {};
        const res = rolarAtaque(msg.mod, msg.tirith, !!msg.dom);
        const coroa = res.kael === 20, olho = res.kael === 1;
        const acertos = [], tags = [];
        let critico = false;
        for (const [k, o] of alvos) {
          const def = num(o.defesa, 10) + Math.max(0, Math.min(5, Math.round(num(cob[k])))) + (o.guarda ? 2 : 0);
          const ok = coroa || (!olho && res.total >= def);
          const crit = ok && (coroa || res.kael === res.lyra);
          if (ok) acertos.push([k, o, crit]);
          if (crit) critico = true;
          tags.push(`${o.nome}: ${ok ? (crit ? 'crítico!' : 'acertou') : 'errou'}`);
        }
        const pele = (de.startsWith('pc:') ? autor.dados : null) || {};
        // dados em sequência (acerto → dano → punição); o golpe e o dano aparecem só no fim ('golpe')
        const base = { tipo: 'dado', nome: autor.nome, cor: autor.cor || '#e2b04a', kael: pele.kael || '#d9a23a', lyra: pele.lyra || '#3f78e0', material: pele.material || 'cristal' };
        const rot = texto(msg.rotulo, 60);
        const mandar = ev => { this.enviarTodos(ev); this.registrar({ ...ev, dados: undefined, tipo: undefined }); };
        const dadoLyra = res.dados.find(d => d.c === 'lyra'), dadoAranor = res.dados.find(d => d.c === 'aranor');
        mandar({ ...base, t: Date.now(), dados: res.dados.filter(d => d !== dadoLyra && d !== dadoAranor), total: res.total, tags, grau: acertos.length ? (alvos.length > 1 ? `${acertos.length} de ${alvos.length} atingidos` : 'Acertou') : 'Errou', desc: res.desc.split(' · ')[0], rotulo: rot });
        if (acertos.length) {
          // dano = Lyra + dano da arma/técnica com seus modificadores (vazio = só Lyra)
          const d = (msg.dano && rolarExpr(msg.dano)) || { dados: [], total: 0, desc: '' };
          // crítico: Lyra conta como 20 e o alvo usa só metade da Proteção
          const somaDano = res.lyra + d.total, somaCrit = 20 + d.total, tagsD = critico ? ['Crítico: Lyra 20, ½ Proteção'] : [];
          for (const [, o, crit] of acertos) {
            const prot = crit ? Math.floor(num(o.protecao) / 2) : num(o.protecao);
            const sofre = Math.max(0, (crit ? somaCrit : somaDano) - prot);
            o.vigor = Math.max(-99, num(o.vigor) - sofre);
            tagsD.push(`${o.nome} −${sofre}${prot ? ` (Proteção ${prot})` : ''}`);
          }
          mandar({ ...base, t: Date.now() + 1, dados: [dadoLyra, ...d.dados], total: critico ? somaCrit : somaDano, tags: tagsD, grau: '', desc: `Lyra ${res.lyra}${d.desc ? ' + ' + d.desc : ''}`, rotulo: 'Dano · ' + texto(msg.rotulo, 50) });
          // shortcut: tabela de punição ainda não existe; ligar aqui quando o dono montar
          if (dadoAranor) mandar({ ...base, t: Date.now() + 2, dados: [dadoAranor], total: res.aranor, tags: [`Aranor ${res.aranor}: punição do Dom`], grau: '', desc: `Aranor ${res.aranor}`, rotulo: 'Punição · ' + texto(msg.rotulo, 46) });
        }
        this.enviarTodos({ tipo: 'golpe', k: de, dom: !!msg.dom, alvos: alvos.map(([k]) => k), acertos: acertos.map(([k]) => k), distancia: !!msg.distancia });
        await this.gravar('pcs', 'npcs', 'log');
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

  objetoDe(k) {
    k = String(k || ''); const i = k.indexOf(':'), t = k.slice(0, i), id = k.slice(i + 1);
    return t === 'pc' ? this.s.pcs[id] : t === 'npc' ? this.s.npcs[id] : null;
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
