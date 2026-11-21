// Gera um mapa 60x60 com castelo num morro, fosso, rio, estradas e vegetação.
// Uso: node scripts/gerar-mapa-castelo.js  →  mapas/castelo-60x60.json (importar pelo painel do Mestre)
import { writeFileSync, mkdirSync } from 'node:fs';
import { TERRENOS, PAREDES, dijkstra, nivelEm } from '../public/regras.js';

const N = 60;
let semente = 7331;
const rnd = () => ((semente = (semente * 1103515245 + 12345) % 2147483648) / 2147483648);
const grid = Array.from({ length: N }, () => Array(N).fill('"'));
const alt = Array.from({ length: N }, () => Array(N).fill('1'));
const par = Array.from({ length: N }, () => Array(N).fill(' '));
const dentro = (x, y) => x >= 0 && y >= 0 && x < N && y < N;
const chao = (x, y, c) => { if (dentro(x, y)) grid[y][x] = c; };
const parede = (x, y, c) => { if (dentro(x, y)) par[y][x] = c; };
const ret = (x0, y0, x1, y1, f) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) f(x, y); };
const borda = (x0, y0, x1, y1, c) => ret(x0, y0, x1, y1, (x, y) => { if (x === x0 || x === x1 || y === y0 || y === y1) parede(x, y, c); });

// ruído suave (soma de senos com fases aleatórias) para florestas e colinas
const fases = Array.from({ length: 12 }, () => rnd() * 6.28);
const ruido = (x, y, k = 0) => (Math.sin(x * 0.21 + fases[k]) + Math.sin(y * 0.17 + fases[k + 1]) + Math.sin((x + y) * 0.13 + fases[k + 2]) + Math.sin((x - y) * 0.29 + fases[k + 3])) / 4;

// ---------- Castelo: muralha 19..41 x 10..32, morro em volta ----------
const CX0 = 19, CY0 = 10, CX1 = 41, CY1 = 32;
const noMorro = (x, y, m) => x >= CX0 - m && x <= CX1 + m && y >= CY0 - m && y <= CY1 + m;

// ---------- Rio: entra pelo norte a oeste, contorna o morro pelo sul e sai a leste ----------
const rio = new Set();
for (let t = 0; t <= 1; t += 0.002) {
  let x, y;
  if (t < 0.45) { const u = t / 0.45; x = 8 + Math.sin(u * 5) * 2; y = u * 44; }
  else { const u = (t - 0.45) / 0.55; x = 8 + u * 52; y = 44 + Math.sin(u * 6) * 3 - u * 2; }
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { const rx = Math.round(x + dx * 0.9), ry = Math.round(y + dy * 0.9); if (dentro(rx, ry)) rio.add(rx + ',' + ry); }
}

// ---------- Vegetação e relevo base ----------
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
  const f = ruido(x, y, 0), g = ruido(x, y, 4), r = rnd();
  // colinas de pinheiros no noroeste e nordeste
  const colina = ruido(x, y, 8) + (y < 14 ? 0.35 : 0) - (y > 40 ? 0.6 : 0);
  if (colina > 0.45) alt[y][x] = '3'; else if (colina > 0.15) alt[y][x] = '2';
  let c = '"';
  if (y < 18 && f > 0.05) c = r < 0.55 ? 'P' : r < 0.65 ? 'T' : '"';            // pinhal ao norte
  else if (x > 44 && g > 0.1) c = r < 0.5 ? 'T' : r < 0.6 ? 'k' : '"';         // bosque a leste
  else if (x < 20 && y > 46) c = r < 0.2 ? 'Q' : r < 0.3 ? 'k' : r < 0.45 ? '.' : '"'; // charneca seca a sudoeste
  else if (f < -0.35) c = r < 0.25 ? 'T' : r < 0.4 ? 'k' : '"';                // capões de árvores
  else if (r < 0.06) c = 'k'; else if (r < 0.1) c = 'T'; else if (r < 0.115) c = '^'; else if (r < 0.13) c = '.';
  if (alt[y][x] === '3' && r < 0.08) c = '^';
  grid[y][x] = c;
}
// rio, margens de areia
for (const k of rio) { const [x, y] = k.split(',').map(Number); grid[y][x] = '~'; alt[y][x] = '0'; }
ret(0, 0, N - 1, N - 1, (x, y) => {
  if (grid[y][x] === '~') return;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (rio.has((x + dx) + ',' + (y + dy))) { grid[y][x] = rnd() < 0.7 ? ',' : '"'; alt[y][x] = '1'; return; }
});

// morro do castelo: encosta (+1) em volta, platô (+2) dentro do fosso
ret(0, 0, N - 1, N - 1, (x, y) => {
  if (noMorro(x, y, 6)) { alt[y][x] = '2'; if ('PQ^'.includes(grid[y][x]) || grid[y][x] === '~') grid[y][x] = rnd() < 0.15 ? 'k' : '"'; }
  if (noMorro(x, y, 3)) { alt[y][x] = '2'; grid[y][x] = '~'; }                  // fosso cheio d'água
  if (noMorro(x, y, 1)) { alt[y][x] = '3'; grid[y][x] = rnd() < 0.5 ? '.' : '"'; } // borda do platô
});
// rochas na encosta
for (let i = 0; i < 25; i++) { const x = CX0 - 6 + Math.floor(rnd() * 35), y = CY0 - 6 + Math.floor(rnd() * 35); if (noMorro(x, y, 6) && !noMorro(x, y, 4)) grid[y][x] = rnd() < 0.6 ? '^' : 'k'; }

// ---------- Estradas ----------
const estrada = (x, y) => { if (!dentro(x, y)) return; grid[y][x] = grid[y][x] === '~' ? '=' : '.'; if (grid[y][x] === '=') alt[y][x] = alt[y][x] === '0' ? '1' : alt[y][x]; };
// do portão sul até a borda sul, cruzando o fosso e o rio por pontes
for (let y = CY1; y < N; y++) for (let x = 29; x <= 31; x++) estrada(x + Math.round(Math.sin(y * 0.3) * (y > CY1 + 8 ? 1 : 0)), y);
// estrada leste-oeste ao sul do morro, com ponte no rio a oeste
for (let x = 0; x < N; x++) { const y = 41 + Math.round(Math.sin(x * 0.15) * 1.2); estrada(x, y); estrada(x, y + 1); }
// trilha para o norte saindo do portão norte (poterna)
for (let y = 0; y <= CY0; y++) estrada(30, y);
// pontes do fosso: madeira no nível do platô
for (let y = CY1 + 2; y <= CY1 + 3; y++) for (let x = 29; x <= 31; x++) { grid[y][x] = '='; alt[y][x] = '3'; }
for (let y = CY0 - 3; y <= CY0 - 2; y++) { grid[y][30] = '='; alt[y][30] = '3'; }

// ---------- Dentro das muralhas ----------
ret(CX0, CY0, CX1, CY1, (x, y) => { grid[y][x] = '.'; alt[y][x] = '3'; });
ret(CX0 + 1, CY0 + 1, CX1 - 1, CY1 - 1, (x, y) => { grid[y][x] = rnd() < 0.15 ? '"' : '.'; });
borda(CX0, CY0, CX1, CY1, '#');
// portão sul (3 portas) e poterna norte
for (let x = 29; x <= 31; x++) parede(x, CY1, '+');
parede(30, CY0, '+');
// torres nos cantos (5x5, chão de ladrilho, porta para o pátio)
for (const [tx, ty, px, py] of [[CX0, CY0, 2, 4], [CX1 - 4, CY0, 2, 4], [CX0, CY1 - 4, 4, 2], [CX1 - 4, CY1 - 4, 0, 2]]) {
  ret(tx, ty, tx + 4, ty + 4, (x, y) => { grid[y][x] = '_'; alt[y][x] = '4'; par[y][x] = ' '; });
  borda(tx, ty, tx + 4, ty + 4, '#');
  // escada: a porta e a casa à frente ficam no nível do pátio para dar para subir
  const dx = tx + px, dy = ty + py; parede(dx, dy, '+'); alt[dy][dx] = '3';
  grid[ty + 2][tx + 2] = rnd() < 0.5 ? 'b' : 'a';
}
// torres do portão
for (const tx of [26, 32]) { ret(tx, CY1 - 2, tx + 2, CY1, (x, y) => { grid[y][x] = '_'; par[y][x] = ' '; }); borda(tx, CY1 - 2, tx + 2, CY1, '#'); }
parede(28, CY1 - 1, '+'); parede(32, CY1 - 1, '+');
// grande salão (torre de menagem) ao norte: cozinha | salão do trono | capela
const SX0 = 22, SY0 = 15, SX1 = 38, SY1 = 21;
ret(SX0, SY0, SX1, SY1, (x, y) => grid[y][x] = '_');
borda(SX0, SY0, SX1, SY1, '#');
for (let x = 29; x <= 31; x++) parede(x, SY1, '+');
ret(28, SY0 + 1, 32, SY0 + 1, (x, y) => grid[y][x] = '=');                     // estrado do trono em madeira
grid[SY0 + 1][30] = 'a';                                                         // panóplia atrás do trono
grid[SY0 + 1][27] = grid[SY0 + 1][33] = '*';                                     // braseiros
grid[SY0 + 3][29] = grid[SY0 + 3][31] = 'b';                                     // mesas de barril
parede(28, SY0 + 4, 'h'); parede(32, SY0 + 4, 'h');                              // balcões
// cozinha a oeste
ret(SX0 + 1, SY0 + 1, 25, SY1 - 1, (x, y) => grid[y][x] = '=');
for (let y = SY0 + 1; y < SY1; y++) parede(26, y, '#');
parede(26, SY0 + 3, '+');
grid[SY0 + 1][23] = '*'; grid[SY0 + 1][25] = 'c'; grid[SY1 - 1][23] = 's'; grid[SY1 - 1][24] = 'b';
// capela de vidro negro a leste
for (let y = SY0 + 1; y < SY1; y++) parede(34, y, '#');
parede(34, SY0 + 3, '+');
ret(35, SY0 + 1, 37, SY1 - 1, (x, y) => grid[y][x] = 'v');
grid[SY0 + 1][36] = '*';
// quartel a oeste do pátio
const QX0 = CX0 + 1, QY0 = 23, QX1 = 25, QY1 = 27;
ret(QX0, QY0, QX1, QY1, (x, y) => grid[y][x] = '=');
borda(QX0 - 1, QY0, QX1, QY1, '#'); parede(QX1, 25, '+');
for (let x = QX0; x < QX1; x += 2) grid[QY0 + 1][x] = 'c';
grid[QY1 - 1][QX0] = 'a'; grid[QY1 - 1][QX0 + 2] = 'a';
// pátio de treino com alvos a leste
ret(35, 24, 39, 27, (x, y) => grid[y][x] = ',');
for (const y of [24, 26]) grid[y][39] = 'o';
for (let x = 35; x <= 39; x++) parede(x, 28, 'f');
grid[27][35] = 'a';
// carga junto ao portão
ret(24, 29, 25, 31, (x, y) => grid[y][x] = rnd() < 0.5 ? 's' : '.'); grid[31][25] = 'w'; grid[29][25] = 'b'; grid[30][24] = grid[29][24] = '.';
ret(35, 29, 36, 31, (x, y) => { if (rnd() < 0.6 && y !== 30) grid[y][x] = ['c', 'b', 's'][Math.floor(rnd() * 3)]; });
// poço/fogueira central, jardim e tendas no pátio
grid[24][30] = '*'; for (const [x, y] of [[29, 23], [31, 23], [29, 25], [31, 25]]) parede(x, y, 'h');
grid[CY0 + 1][CX0 + 6] = 'T'; grid[CY0 + 1][CX1 - 6] = 'T';
for (const x of [CX0 + 7, CX0 + 8, CX1 - 8, CX1 - 7]) grid[CY0 + 1][x] = 'k';
grid[28][27] = 'n'; grid[28][33] = 'n';
// caminho de ladrilho do portão ao salão
for (let y = SY1 + 1; y < CY1 - 2; y++) for (let x = 29; x <= 31; x++) if (!'*'.includes(grid[y][x])) grid[y][x] = '_';
for (let x = 29; x <= 31; x++) for (let y = CY1 - 2; y < CY1; y++) grid[y][x] = '_';

// ---------- Mobília (objetos novos da paleta) ----------
const por = (lista, c) => { for (const [x, y] of lista) grid[y][x] = c; };
// salão do trono: trono no estrado entre estandartes, colunas, mesas de banquete no lugar dos balcões
grid[SY0 + 1][30] = 'u'; por([[28, SY0 + 1], [32, SY0 + 1]], 'F');
por([[27, 17], [33, 17], [27, 20], [33, 20]], 'I');
parede(28, SY0 + 4, ' '); parede(32, SY0 + 4, ' ');
grid[SY0 + 3][29] = grid[SY0 + 3][31] = '_';
por([[28, 19], [32, 19]], 'L'); por([[29, 19], [31, 19], [28, 20], [32, 20]], 'C');
// cozinha: prateleira, mesa com banquinho, pipas e cesto
grid[16][25] = 'R'; grid[18][23] = 'Y'; grid[18][24] = 'U'; grid[20][23] = 'q'; grid[20][24] = 'K'; grid[20][25] = 'G';
// capela: velas no altar, bancos
por([[35, 16], [37, 16]], 'V'); por([[35, 19], [37, 19]], 'U'); grid[16][36] = 'H'; grid[20][37] = 'H';
// quartel: camas, baú, armário
por([[20, 24], [22, 24], [24, 24]], 'A'); grid[26][22] = 'B'; grid[26][24] = 'Z';
// torres: lanterna no lugar do barril/armas, tesouro na torre NE
grid[CY0 + 2][CX0 + 2] = 'X'; grid[CY0 + 2][CX1 - 2] = 'O'; grid[CY1 - 2][CX0 + 2] = 'S'; grid[CY1 - 2][CX1 - 2] = 'j';
// jardim de flores ao norte do pátio e lanternas no caminho
ret(CX0 + 5, CY0 + 2, CX1 - 5, CY0 + 3, (x, y) => { if (grid[y][x] === '.' || grid[y][x] === '"') grid[y][x] = rnd() < 0.6 ? 'y' : '"'; });
por([[28, 22], [32, 22], [28, 33], [32, 33]], 'X');
// pátio de treino: barreira e escudo
grid[25][36] = 'r'; grid[27][39] = 'S';
// ruínas de vigia: entulho e um baú esquecido
por([[5, 5], [8, 5], [5, 7]], 'D'); grid[7][8] = 'O';

// ---------- Acampamento e moinho fora das muralhas ----------
for (const [x, y] of [[44, 47], [47, 48], [45, 51], [49, 51]]) grid[y][x] = 'n';
grid[49][47] = '*'; grid[47][50] = 'b'; grid[50][43] = 'c'; grid[52][47] = 'w'; grid[48][45] = 'a';
ret(42, 46, 51, 53, (x, y) => { if (grid[y][x] === 'T' || grid[y][x] === '^') grid[y][x] = '"'; });
for (let x = 42; x <= 51; x++) { parede(x, 45, 'f'); parede(x, 54, 'f'); }
parede(46, 45, ' '); parede(46, 54, ' ');
// ruínas de vigia no noroeste
borda(4, 4, 9, 8, 'h'); parede(6, 8, ' '); ret(5, 5, 8, 7, (x, y) => grid[y][x] = '.'); grid[6][7] = '*';

// ---------- Relevo: nenhuma casa pode ficar 2 níveis acima da vizinha ----------
for (let mudou = true; mudou;) {
  mudou = false;
  ret(0, 0, N - 1, N - 1, (x, y) => {
    let min = 9;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (dentro(x + dx, y + dy)) min = Math.min(min, +alt[y + dy][x + dx]);
    if (+alt[y][x] > min + 1) { alt[y][x] = String(min + 1); mudou = true; }
  });
}

const mapa = {
  nome: 'Castelo do Morro', cols: N, rows: N, luz: 'dia', lua: 'nenhuma',
  grid: grid.map(l => l.join('')), alt: alt.map(l => l.join('')), par: par.map(l => l.join('')),
};

// ---------- Conferência (as mesmas regras de mapaValidado no worker) ----------
const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
assert(mapa.grid.length === N && mapa.grid.every(l => l.length === N && [...l].every(c => TERRENOS[c])), 'grid com caractere inválido');
assert(mapa.alt.every(l => l.length === N && /^[0-4]+$/.test(l)), 'alt inválido');
assert(mapa.par.every(l => l.length === N && [...l].every(c => c === ' ' || PAREDES.includes(c))), 'par inválido');
// dá para andar da borda sul até o trono, as torres, o quartel e a cozinha
const alcance = dijkstra(mapa, new Set(), 30, N - 1, 9999);
for (const [x, y, o] of [[30, SY0 + 2, 'trono'], [CX0 + 1, CY0 + 1, 'torre NO'], [CX0 + 1, CY1 - 1, 'torre SO'], [CX1 - 3, CY0 + 1, 'torre NE'], [CX1 - 1, CY1 - 1, 'torre SE'], [QX0 + 1, 25, 'quartel'], [SX0 + 2, SY0 + 4, 'cozinha'], [SX1 - 2, SY0 + 5, 'capela'], [30, 0, 'trilha norte'], [0, 41, 'estrada oeste'], [47, 50, 'acampamento']])
  assert(alcance.has(x + ',' + y), 'sem caminho até ' + o + ` (${x},${y}, nível ${nivelEm(mapa, x, y)})`);

mkdirSync('mapas', { recursive: true });
writeFileSync('mapas/castelo-60x60.json', JSON.stringify({ mapa, npcs: [] }, null, 1));
console.log('mapas/castelo-60x60.json gerado e conferido.');
console.log(mapa.grid.map((l, y) => l.split('').map((c, x) => mapa.par[y][x] !== ' ' ? mapa.par[y][x] : c).join('')).join('\n'));
