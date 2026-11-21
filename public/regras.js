// Regras compartilhadas entre o navegador e o servidor (Worker).
// Edite aqui para mudar terrenos, custos de movimento ou a mecânica dos dados.

export const TERRENOS = {
  '.': { n: 'Terra', custo: 1 },
  '_': { n: 'Ladrilho', custo: 1 },
  ',': { n: 'Areia', custo: 2 },
  '"': { n: 'Mato', custo: 2 },
  '~': { n: 'Água', custo: 3 },
  '=': { n: 'Madeira', custo: 1 },
  '+': { n: 'Porta', custo: 1 },
  'v': { n: 'Vidro negro', custo: 2 },
  '#': { n: 'Muro de pedra', custo: Infinity, parede: 'pedra' },
  'm': { n: 'Paliçada de madeira', custo: Infinity, parede: 'madeira' },
  'h': { n: 'Muro baixo (cobertura)', custo: 3, parede: 'baixo', cobertura: true },
  'k': { n: 'Arbusto', custo: 2, cobertura: true },
  'f': { n: 'Cerca de madeira', custo: Infinity, parede: 'cerca', cobertura: true },
  'd': { n: 'Porta fechada', custo: Infinity, parede: 'porta' },
  'P': { n: 'Pinheiro', custo: Infinity },
  'Q': { n: 'Árvore seca', custo: Infinity },
  'T': { n: 'Árvore', custo: Infinity },
  '^': { n: 'Rocha', custo: Infinity },
  '*': { n: 'Fogueira', custo: Infinity },
  'b': { n: 'Barril', custo: Infinity },
  'c': { n: 'Caixotes', custo: Infinity },
  's': { n: 'Sacos', custo: Infinity },
  'n': { n: 'Tenda', custo: Infinity },
  'a': { n: 'Armas', custo: Infinity },
  'o': { n: 'Alvo', custo: Infinity },
  'w': { n: 'Carrinho', custo: Infinity },
  // vegetação extra
  'l': { n: 'Palmeira', custo: Infinity },
  't': { n: 'Samambaia', custo: 2, cobertura: true },
  'y': { n: 'Flores', custo: 1 },
  // mobília (KayKit Dungeon Remastered)
  'M': { n: 'Mesa', custo: Infinity, cobertura: true },
  'Y': { n: 'Mesa de taverna', custo: Infinity, cobertura: true },
  'L': { n: 'Mesa de banquete', custo: Infinity, cobertura: true },
  'C': { n: 'Cadeira', custo: 2 },
  'u': { n: 'Trono', custo: Infinity, cobertura: true },
  'U': { n: 'Banquinho', custo: 2 },
  'A': { n: 'Cama', custo: Infinity, cobertura: true },
  'E': { n: 'Estante', custo: Infinity, cobertura: true },
  'R': { n: 'Prateleira', custo: Infinity, cobertura: true },
  'B': { n: 'Baú', custo: Infinity, cobertura: true },
  'O': { n: 'Baú de tesouro', custo: Infinity, cobertura: true },
  'Z': { n: 'Armário', custo: Infinity, cobertura: true },
  'q': { n: 'Cesto', custo: 2 },
  'K': { n: 'Barril grande', custo: Infinity, cobertura: true },
  'G': { n: 'Pipa de vinho', custo: Infinity, cobertura: true },
  'j': { n: 'Caixas empilhadas', custo: Infinity, cobertura: true },
  // masmorra e castelo
  'I': { n: 'Coluna', custo: Infinity, cobertura: true },
  'J': { n: 'Coluna entalhada', custo: Infinity, cobertura: true },
  'X': { n: 'Lanterna', custo: Infinity },
  'V': { n: 'Velas', custo: 2 },
  'F': { n: 'Estandarte vermelho', custo: Infinity },
  'H': { n: 'Estandarte azul', custo: Infinity },
  'S': { n: 'Escudo', custo: Infinity },
  '$': { n: 'Moedas', custo: 1 },
  'D': { n: 'Entulho', custo: 3, cobertura: true },
  'r': { n: 'Barreira', custo: 3, cobertura: true },
  'W': { n: 'Espinhos (armadilha)', custo: 3 },
  'N': { n: 'Grade no chão', custo: 1 },
  'e': { n: 'Escada de mão', custo: Infinity },
  // construção (camada de paredes): materiais e espessuras diferentes
  'g': { n: 'Parede de tijolo', custo: Infinity, parede: 'tijolo' },
  'i': { n: 'Parede de reboco (fina)', custo: Infinity, parede: 'reboco' },
  'p': { n: 'Parede de tábuas (fina)', custo: Infinity, parede: 'tabuas' },
  'z': { n: 'Muralha de castelo (grossa)', custo: Infinity, parede: 'muralha' },
  '!': { n: 'Janela', custo: Infinity, parede: 'janela', cobertura: true },
  '%': { n: 'Grade de ferro', custo: Infinity, parede: 'grade', cobertura: true },
  // rampa e escada ligam níveis de altura (camada do chão)
  '/': { n: 'Rampa', custo: 1, rampa: true },
  '|': { n: 'Escada', custo: 1, escada: true },
};

export const LUZES = {
  dia: 'Dia de Kael',
  noite: 'Noite Verdadeira',
  azul: 'Noite Azul',
  conjuncao: 'Conjunção (sombras duplas)',
};

export const LUAS = {
  nenhuma: 'Nenhuma lua alta',
  aranor: 'Aranor, a Vermelha',
  nimriel: 'Nimriel, a Verde',
  tirith: 'Tirith, a Branca',
  triade: 'Tríade',
};

export const FACES = [4, 6, 8, 10, 12, 20];

export function r(n) {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return 1 + (a[0] % n);
}

export const num = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

// Paredes e cercas ficam numa camada própria (mesa.par, um caractere por casa, ' ' = nada) por cima do chão.
export const PAREDES = ['#', 'm', 'f', 'h', '+', 'd', 'g', 'i', 'p', 'z', '!', '%'];
// Pintura das paredes (camada mesa.tin, um caractere por casa, ' ' = cor natural do material)
export const TINTAS = {
  a: { n: 'Branco caiado', c: '#f1ece0' }, b: { n: 'Creme', c: '#e8d7b0' }, c: { n: 'Ocre', c: '#c99a4a' }, d: { n: 'Terracota', c: '#b5603d' },
  e: { n: 'Vinho', c: '#7a2a2e' }, f: { n: 'Rosa antigo', c: '#c98c8a' }, g: { n: 'Verde sálvia', c: '#9aab8a' }, h: { n: 'Verde musgo', c: '#4f6a3a' },
  i: { n: 'Azul celeste', c: '#8fb3cc' }, j: { n: 'Azul anil', c: '#2f4f86' }, k: { n: 'Lilás', c: '#8e7aa8' }, l: { n: 'Cinza pedra', c: '#9a968e' },
  m: { n: 'Grafite', c: '#4a4a50' }, n: { n: 'Preto', c: '#22201f' }, o: { n: 'Madeira clara', c: '#b08a5a' }, p: { n: 'Madeira escura', c: '#5a3a22' },
  q: { n: 'Dourado', c: '#d4a640' }, r: { n: 'Turquesa', c: '#3f9a96' },
};
export const paredeEm = (mesa, x, y) => { const p = (mesa?.par?.[y] || '')[x]; return PAREDES.includes(p) ? p : ''; };
// o que vale para movimento, visão e cobertura: a parede, se houver; senão o chão
export const celula = (mesa, x, y) => paredeEm(mesa, x, y) || (mesa?.grid?.[y] || '')[x];
export function custoCel(mesa, x, y) {
  if (!mesa || x < 0 || y < 0 || x >= mesa.cols || y >= mesa.rows) return Infinity;
  const c = celula(mesa, x, y);
  return (TERRENOS[c] || TERRENOS['.']).custo;
}

// ---------- Altura do terreno ----------
// Cada casa tem um nível: −1 fosso/vale, 0 chão, +1, +2, +3 (gravado como '0'..'4' em mesa.alt).
export const NIVEIS = { '0': 'Fosso (−1)', '1': 'Chão (0)', '2': 'Elevado (+1)', '3': 'Alto (+2)', '4': 'Penhasco (+3)' };
export function nivelEm(mesa, x, y) {
  const c = (mesa?.alt?.[y] || '')[x];
  return c >= '0' && c <= '4' ? c.charCodeAt(0) - 49 : 0;
}
// Subir 1 nível custa +1 casa; descer é livre; diferença de 2+ níveis exige escalar ou saltar (o Mestre move).
// Rampa: sobe ou desce 1 nível sem custo extra. Escada: vence até 2 níveis, subir custa +1.
export function custoSubida(mesa, x, y, nx, ny) {
  const d = nivelEm(mesa, nx, ny) - nivelEm(mesa, x, y);
  const chao = (a, b) => TERRENOS[(mesa?.grid?.[b] || '')[a]] || {};
  const o = chao(x, y), n = chao(nx, ny);
  // a rampa/escada é a casa mais alta do par: desce até o vizinho mais baixo
  const liga = k => (n[k] && d > 0) || (o[k] && d < 0);
  if (liga('rampa')) return Math.abs(d) >= 2 ? Infinity : 0;
  if (liga('escada')) return Math.abs(d) >= 3 ? Infinity : d > 0 ? 1 : 0;
  if (Math.abs(d) >= 2) return Infinity;
  return d === 1 ? 1 : 0;
}
// Terreno alto em combate. a = atacante {x,y}, b = alvo {x,y}; distancia em casas.
export function efeitoAltura(mesa, a, b, distancia = false) {
  const d = nivelEm(mesa, a.x, a.y) - nivelEm(mesa, b.x, b.y), notas = [];
  let mod = 0, alcance = 0, podeCorpo = true;
  if (d >= 1) { mod = d >= 2 && distancia ? 3 : 2; notas.push(`Terreno alto (+${mod})`); if (distancia) { alcance = 2 * d; notas.push(`+${alcance} casas de alcance`); } }
  if (d <= -1) { mod = -2; notas.push('Atacando de baixo (−2)'); if (distancia) notas.push('O alvo tem cobertura parcial contra disparos de baixo'); }
  if (!distancia && Math.abs(d) >= 2) { podeCorpo = false; notas.push('Desnível de 2+ níveis: fora do alcance corpo a corpo'); }
  return { dif: d, mod, alcance, podeCorpo, notas };
}
// Linha de visão entre duas casas: paredes cortam; árvores, arbustos e muros baixos dão cobertura;
// um morro mais alto que os dois no meio do caminho também bloqueia.
export function linhaDeVisao(mesa, a, b) {
  const ax = a.x + .5, ay = a.y + .5, bx = b.x + .5, by = b.y + .5, d = Math.hypot(bx - ax, by - ay);
  const passos = Math.max(1, Math.ceil(d * 4)), topo = Math.max(nivelEm(mesa, a.x, a.y), nivelEm(mesa, b.x, b.y));
  let cobertura = false; const vistas = new Set();
  for (let i = 1; i < passos; i++) {
    const x = Math.floor(ax + (bx - ax) * i / passos), y = Math.floor(ay + (by - ay) * i / passos), k = x + ',' + y;
    if ((x === a.x && y === a.y) || (x === b.x && y === b.y) || vistas.has(k)) continue;
    vistas.add(k);
    const c = celula(mesa, x, y), t = TERRENOS[c] || {};
    // muro baixo e cerca dão cobertura sem cortar a visão
    if (t.parede && !t.cobertura) return { livre: false, cobertura: true };
    if (nivelEm(mesa, x, y) > topo) return { livre: false, cobertura: true };
    if (t.cobertura || c === 'T' || c === 'P' || c === 'Q' || c === '^') cobertura = true;
  }
  return { livre: true, cobertura };
}
export const distanciaCasas = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
// Queda: 1d6 por nível a partir do segundo (empurrões, Terremoto, Empurrão de Escudo na beirada…)
export function danoQueda(niveis) { return niveis >= 2 ? `${niveis - 1}d6` : null; }

// Distâncias (em casas) a partir de (sx,sy). Diagonal custa 1,5; terreno multiplica.
export function dijkstra(mesa, ocupadas, sx, sy, limite) {
  const dist = new Map([[sx + ',' + sy, 0]]);
  const fila = [[0, sx, sy]];
  while (fila.length) {
    fila.sort((a, b) => a[0] - b[0]);
    const [d, x, y] = fila.shift();
    if (d > (dist.get(x + ',' + y) ?? Infinity)) continue;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy, c0 = custoCel(mesa, nx, ny);
      if (!Number.isFinite(c0)) continue;
      const sobe = custoSubida(mesa, x, y, nx, ny);
      if (!Number.isFinite(sobe)) continue;
      const c = c0 + sobe;
      if (dx && dy && (!Number.isFinite(custoCel(mesa, x + dx, y)) || !Number.isFinite(custoCel(mesa, x, y + dy)))) continue;
      const nd = d + c * (dx && dy ? 1.5 : 1);
      if (nd > limite) continue;
      const key = nx + ',' + ny;
      if (ocupadas.has(key)) continue;
      if (nd < (dist.get(key) ?? Infinity)) { dist.set(key, nd); fila.push([nd, nx, ny]); }
    }
  }
  return dist;
}

// Teste de Conjunção: 2d10 (Kael + Lyra) + mod, com Dado de Tirith para vantagem/desvantagem.
export function rolar2d10(mod, modo, dif, dom) {
  mod = num(mod); dif = num(dif);
  const dados = [{ f: 10, v: r(10), c: 'kael' }, { f: 10, v: r(10), c: 'lyra' }];
  if (modo === 'vantagem' || modo === 'desvantagem') {
    dados.push({ f: 10, v: r(10), c: 'tirith' });
    const ord = [0, 1, 2].sort((a, b) => dados[a].v - dados[b].v);
    const fora = modo === 'vantagem' ? ord[0] : ord[2];
    dados[fora].fora = true;
    if (fora !== 2) dados[2].papel = dados[fora].c;
  }
  const papel = d => d.papel || d.c;
  const k = dados.find(d => !d.fora && papel(d) === 'kael').v;
  const l = dados.find(d => !d.fora && papel(d) === 'lyra').v;
  const total = k + l + mod, conj = k === l, tags = [];
  let grau = '';
  if (conj && k === 10) tags.push('Coroa de Kael');
  else if (conj && k === 1) tags.push('Olho de Aranor');
  else if (conj) tags.push('Conjunção');
  if (dif) {
    let ok;
    if (conj && k === 10) { ok = true; grau = 'Sucesso'; }
    else if (conj && k === 1) { ok = false; grau = 'Falha'; }
    else if (total >= dif + 10) { ok = true; grau = 'Sucesso Extraordinário'; }
    else if (total >= dif + 5) { ok = true; grau = 'Sucesso Pleno'; }
    else if (total >= dif) { ok = true; grau = 'Sucesso'; }
    else if (total >= dif - 2) { ok = false; grau = 'Sucesso com Custo?'; }
    else { ok = false; grau = 'Falha'; }
    if (conj) tags.push(ok ? 'Triunfo' : 'Ruína');
    if (dom && k === 10 && ok) tags.push('−1 Fôlego');
  } else if (conj) tags.push('Triunfo se passar · Ruína se falhar');
  if (dom && l === 1) tags.push('Eco do Fluxo: +1 Tensão');
  const desc = `Kael ${k} + Lyra ${l}${mod ? ` ${mod > 0 ? '+' : '−'} ${Math.abs(mod)}` : ''}${dif ? ` vs DIF ${dif}` : ''}`;
  return { dados, total, tags, grau, desc };
}

// Ataque: Kael d20 + mod = acerto; Lyra d20 = base do dano; Aranor d20 = punição do Dom (só com Dom).
// Tirith (d20) troca o Kael na vantagem/desvantagem. Crítico: Kael 20 (acerta sempre) ou Kael = Lyra num acerto; Kael 1 erra sempre.
export function rolarAtaque(mod, modo, dom) {
  mod = num(mod);
  const dk = { f: 20, v: r(20), c: 'kael' }, dl = { f: 20, v: r(20), c: 'lyra' }, dados = [dk, dl];
  let kael = dk.v;
  if (modo === 'vantagem' || modo === 'desvantagem') {
    const dt = { f: 20, v: r(20), c: 'tirith' };
    dados.push(dt);
    const usaT = modo === 'vantagem' ? dt.v > dk.v : dt.v < dk.v;
    (usaT ? dk : dt).fora = true;
    kael = usaT ? dt.v : dk.v;
  }
  const aranor = dom ? r(20) : 0;
  if (dom) dados.push({ f: 20, v: aranor, c: 'aranor' });
  const total = kael + mod;
  const desc = `Kael ${kael}${mod ? ` ${mod > 0 ? '+' : '−'} ${Math.abs(mod)}` : ''} · Lyra ${dl.v}${dom ? ` · Aranor ${aranor}` : ''}`;
  return { dados, kael, lyra: dl.v, aranor, total, desc };
}

// Expressões livres: "2d6+3", "1d8-1+1d4"
export function rolarExpr(expr) {
  const s = String(expr || '').replace(/\s/g, '').toLowerCase().slice(0, 40);
  if (!/^[0-9d+\-]+$/.test(s)) return null;
  const dados = [];
  let soma = 0, ok = false;
  for (const m of s.matchAll(/([+\-]?)(\d*)d(\d+)|([+\-]?)(\d+)/g)) {
    if (m[3]) {
      const q = Math.min(20, num(m[2] || 1, 1)), f = num(m[3]);
      if (!FACES.includes(f)) return null;
      for (let i = 0; i < q; i++) { const v = r(f); dados.push({ f, v, c: 'dano' }); soma += m[1] === '-' ? -v : v; }
      ok = true;
    } else if (m[5]) { soma += (m[4] === '-' ? -1 : 1) * num(m[5]); ok = true; }
  }
  return ok ? { dados, total: soma, tags: [], grau: '', desc: s } : null;
}

// ---------- Progressão (Livro de Regras 16) ----------
// XP total para cada nível (índice 0 = nível 1).
export const XP_NIVEL = [0, 10, 25, 45, 70, 100, 135, 175, 220, 270];
export const nivelPorXp = xp => XP_NIVEL.filter(x => num(xp) >= x).length || 1;
export const GANHOS_NIVEL = ['Criação · habilidade de Vocação N1', '+1 Talento', 'Habilidade de Vocação N3', '+1 atributo, +1 Talento', 'Habilidade de Vocação N5 · perícias até 4', '+1 Talento', 'Habilidade de Vocação N7', '+1 atributo, +1 Talento', 'Perícias até 5', '+1 Talento · habilidade de Vocação N10'];
export const FONTES_XP = [['Comparecer à sessão', 2], ['Objetivo da aventura', 3], ['Cumprir o Juramento', 3], ['Interpretar o Fardo', 1], ['Segredo do mundo', 1], ['Encontro Mortal', 2]];

// ---------- Condições (habilidades do Dom) ----------
// Duram N turnos de quem as carrega; no começo do turno: dano/cura por turno e conta −1.
// def/atq somam na Defesa/ataque; imovel bloqueia o Mover; acoes = ações perdidas; desl = casas a mais (meio = metade).
export const CONDICOES = {
  queimando: { nome: 'Queimando', ic: '🔥', cor: '#ff7a1e', dot: '1d6', desc: '1d6 de dano no começo do turno.' },
  envenenado: { nome: 'Envenenado', ic: '☠', cor: '#9be04a', dot: '1d4', atq: -1, desc: '1d4 de dano no começo do turno; −1 nos ataques.' },
  congelado: { nome: 'Congelado', ic: '❄', cor: '#8fe3ff', imovel: true, def: -2, desc: 'Não se move; −2 Defesa.' },
  preso: { nome: 'Preso', ic: '⛓', cor: '#7ac06a', imovel: true, desc: 'Não se move.' },
  atordoado: { nome: 'Atordoado', ic: '💫', cor: '#ffe94a', acoes: 1, desc: 'Perde 1 ação no turno.' },
  cego: { nome: 'Cego', ic: '◌', cor: '#9a9aa8', atq: -3, desc: '−3 nos ataques.' },
  lento: { nome: 'Lento', ic: '🐌', cor: '#a08a6a', meio: true, def: -1, desc: 'Metade do Deslocamento; −1 Defesa.' },
  marcado: { nome: 'Marcado', ic: '🎯', cor: '#ff5a5a', def: -2, desc: '−2 Defesa.' },
  amedrontado: { nome: 'Amedrontado', ic: '😱', cor: '#c080ff', atq: -2, desc: '−2 nos ataques.' },
  protegido: { nome: 'Protegido', ic: '🛡', cor: '#6aa8ff', def: 3, bom: true, desc: '+3 Defesa.' },
  regenerando: { nome: 'Regenerando', ic: '✚', cor: '#5fd05a', cura: '1d6', bom: true, desc: 'Cura 1d6 no começo do turno.' },
  fortalecido: { nome: 'Fortalecido', ic: '✦', cor: '#ffb347', atq: 2, bom: true, desc: '+2 nos ataques.' },
  veloz: { nome: 'Veloz', ic: '➶', cor: '#d8f3ff', desl: 3, bom: true, desc: '+3 de Deslocamento.' },
  sangrando: { nome: 'Sangrando', ic: '🩸', cor: '#c0302a', dot: '1d4', desc: '1d4 de dano no começo do turno; não regenera.' },
  confuso: { nome: 'Confuso', ic: '🌀', cor: '#d080ff', atq: -2, def: -2, desc: '−2 nos ataques e na Defesa.' },
  adormecido: { nome: 'Adormecido', ic: '💤', cor: '#9080ff', imovel: true, acoes: 3, def: -3, desc: 'Perde o turno e tem −3 Defesa; acorda ao sofrer dano.' },
  pesado: { nome: 'Pesado', ic: '⚓', cor: '#8a7aff', meio: true, atq: -1, desc: 'Metade do Deslocamento; −1 nos ataques.' },
  vulneravel: { nome: 'Vulnerável', ic: '💔', cor: '#ff4060', desc: 'Sofre +1d6 de dano por golpe.' },
  desarmado: { nome: 'Desarmado', ic: '✋', cor: '#b8c0c8', atq: -3, desc: '−3 nos ataques.' },
  silenciado: { nome: 'Silenciado', ic: '🔇', cor: '#f0c0ff', mudo: true, desc: 'Não usa habilidades do Dom.' },
  acelerado: { nome: 'Acelerado', ic: '⏩', cor: '#ffd27a', acoes: -1, bom: true, desc: '+1 ação no turno.' },
  oculto: { nome: 'Oculto', ic: '👤', cor: '#7a5fd0', def: 4, bom: true, desc: '+4 Defesa; some ao atacar.' },
  refletindo: { nome: 'Refletindo', ic: '🪞', cor: '#e0e8f0', bom: true, desc: 'Quem acerta você sofre metade do dano.' },
  espinhos: { nome: 'Espinhos', ic: '🌵', cor: '#7ff0e0', bom: true, desc: 'Quem acerta você corpo a corpo sofre 1d6.' },
  imagens: { nome: 'Imagens', ic: '👥', cor: '#c9a0ff', bom: true, desc: '40% de chance de um golpe acertar uma cópia (e desfazê-la).' },
  eterno: { nome: 'Eterno', ic: '♾', cor: '#ff8080', bom: true, desc: 'Ao cair a 0 de Vigor, volta com 10 e a condição acaba.' },
  fenix: { nome: 'Fênix', ic: '🪶', cor: '#ff9a3a', bom: true, desc: 'Imune a Queimando; se cair com Eterno, explode (4d6 em quem está a até 2 casas).' },
  abalado: { nome: 'Abalado', ic: '💢', cor: '#c09060', desc: 'Já fugiu do fogo: imune ao Pavor das Chamas.' },
  premonicao: { nome: 'Premonição', ic: '👁', cor: '#f8e8a0', bom: true, desc: 'O próximo golpe contra você erra.' },
};
// condições ruins sorteadas pelo Caos (Entropia)
export const CONDS_CAOS = ['queimando', 'envenenado', 'sangrando', 'atordoado', 'cego', 'lento', 'confuso', 'amedrontado', 'pesado', 'vulneravel'];
// soma de um campo numérico (def, atq, acoes, desl) nas condições ativas
export function modCond(o, campo) { let s = 0; for (const c of Object.keys(o?.cond || {})) s += num(CONDICOES[c]?.[campo]); return s; }
export function temCond(o, flag) { return Object.keys(o?.cond || {}).some(c => CONDICOES[c]?.[flag]); }
export function deslocCom(o, base) { const d = base + modCond(o, 'desl'); return temCond(o, 'meio') ? Math.floor(d / 2) : d; }
