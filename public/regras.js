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

export function custoCel(mesa, x, y) {
  if (!mesa || x < 0 || y < 0 || x >= mesa.cols || y >= mesa.rows) return Infinity;
  const c = (mesa.grid[y] || '')[x];
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
export function custoSubida(mesa, x, y, nx, ny) {
  const d = nivelEm(mesa, nx, ny) - nivelEm(mesa, x, y);
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
