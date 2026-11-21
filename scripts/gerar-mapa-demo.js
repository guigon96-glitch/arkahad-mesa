// Gera um mapa 60x60 de demonstração com todos os terrenos e objetos: vila com taverna, casa,
// armazém e feira; praia com píer; floresta com lago; templo em ruínas no morro; cripta afundada; fazenda.
// Uso: node scripts/gerar-mapa-demo.js  →  mapas/demo-60x60.json (Mestre: ⬆ Carregar mapa)
import { writeFileSync, mkdirSync } from 'node:fs';
import { TERRENOS, PAREDES, dijkstra, nivelEm } from '../public/regras.js';

const N = 60;
let semente = 4242;
const rnd = () => ((semente = (semente * 1103515245 + 12345) % 2147483648) / 2147483648);
const grid = Array.from({ length: N }, () => Array(N).fill('"'));
const alt = Array.from({ length: N }, () => Array(N).fill('1'));
const par = Array.from({ length: N }, () => Array(N).fill(' '));
const dentro = (x, y) => x >= 0 && y >= 0 && x < N && y < N;
const chao = (x, y, c) => { if (dentro(x, y)) grid[y][x] = c; };
const parede = (x, y, c) => { if (dentro(x, y)) par[y][x] = c; };
const ret = (x0, y0, x1, y1, f) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) f(x, y); };
const borda = (x0, y0, x1, y1, c) => ret(x0, y0, x1, y1, (x, y) => { if (x === x0 || x === x1 || y === y0 || y === y1) parede(x, y, c); });
const fases = Array.from({ length: 8 }, () => rnd() * 6.28);
const ruido = (x, y, k = 0) => (Math.sin(x * 0.23 + fases[k]) + Math.sin(y * 0.19 + fases[k + 1]) + Math.sin((x + y) * 0.11 + fases[k + 2]) + Math.sin((x - y) * 0.31 + fases[k + 3])) / 4;
const dist = (x, y, cx, cy) => Math.hypot(x - cx, y - cy);

// ---------- Campo base com vegetação espalhada ----------
ret(0, 0, N - 1, N - 1, (x, y) => {
  const r = rnd();
  grid[y][x] = r < 0.04 ? 'k' : r < 0.07 ? 'T' : r < 0.08 ? '^' : r < 0.1 ? 'y' : r < 0.13 ? '.' : '"';
});

// ---------- Floresta a noroeste (pinheiros, árvores, samambaias) com lago ----------
ret(0, 0, 27, 19, (x, y) => {
  if (x < 9) return;
  const f = ruido(x, y, 0), r = rnd();
  grid[y][x] = f > 0.1 ? (r < 0.45 ? 'P' : r < 0.6 ? 'T' : r < 0.8 ? 't' : '"') : (r < 0.15 ? 't' : r < 0.25 ? 'k' : r < 0.4 ? 'y' : '"');
});
ret(8, 7, 18, 17, (x, y) => { const d = dist(x, y, 13, 12); if (d < 3.6) { grid[y][x] = '~'; alt[y][x] = '0'; } else if (d < 4.8) grid[y][x] = rnd() < 0.5 ? ',' : 't'; });
ret(18, 3, 24, 8, (x, y) => { grid[y][x] = rnd() < 0.6 ? 'y' : '"'; });            // clareira de flores

// ---------- Praia e mar a oeste, com palmeiras e píer ----------
ret(0, 0, 8, N - 1, (x, y) => {
  const costa = 3 + Math.round(Math.sin(y * 0.2) * 1.2);
  if (x <= costa) { grid[y][x] = '~'; alt[y][x] = '0'; }
  else if (x <= costa + 4) grid[y][x] = rnd() < 0.12 ? 'l' : ',';
});
for (let x = 0; x <= 6; x++) for (const y of [31, 32]) { grid[y][x] = '='; alt[y][x] = '1'; } // píer
grid[31][0] = 'b'; grid[32][1] = 'c';

// ---------- Morro a nordeste com templo em ruínas no topo ----------
ret(36, 0, N - 1, 24, (x, y) => {
  const d = dist(x, y, 50, 10);
  alt[y][x] = d < 6 ? '4' : d < 9 ? '3' : d < 12 ? '2' : alt[y][x];
  if (d < 12 && 'TPky'.includes(grid[y][x])) grid[y][x] = rnd() < 0.3 ? '^' : '"';
});
ret(46, 6, 54, 14, (x, y) => grid[y][x] = '_');
ret(48, 8, 52, 12, (x, y) => grid[y][x] = 'v');                                     // nave de vidro negro
borda(46, 6, 54, 14, '#');
for (const [x, y] of [[46, 9], [46, 10], [54, 11], [54, 12], [47, 6], [53, 14], [49, 14], [50, 14], [51, 14]]) parede(x, y, ' '); // ruína: buracos e entrada
for (const [x, y] of [[48, 9], [52, 9], [48, 12], [52, 12]]) grid[y][x] = 'I';
grid[13][49] = 'J'; grid[13][51] = 'J';                                               // entrada entalhada
grid[7][50] = 'u'; grid[7][48] = 'F'; grid[7][52] = 'H';                              // trono e estandartes
grid[8][49] = 'O'; grid[8][51] = '$'; grid[7][47] = 'S'; grid[7][53] = 'X';
grid[10][47] = 'V'; grid[10][53] = 'V'; grid[13][47] = 'D'; grid[12][53] = 'D';
ret(48, 15, 52, 23, (x, y) => { if (!'#'.includes(par[y][x])) grid[y][x] = '.'; });  // trilha que sobe ao templo

// ---------- Estradas ----------
for (let x = 7; x < N; x++) for (const y of [31, 32]) chao(x, y, '.');
for (let y = 0; y < N; y++) for (const x of [30, 31]) chao(x, y, '.');
ret(32, 23, 48, 24, (x, y) => { if (x >= 47) return; if (y === 24) chao(x, y, '.'); });   // ramal até a trilha do morro
ret(47, 23, 48, 24, (x, y) => chao(x, y, '.'));

// ---------- Praça central ----------
ret(25, 26, 36, 37, (x, y) => grid[y][x] = '_');
grid[31][30] = '*';                                                                   // fogueira da praça
for (const [x, y] of [[25, 26], [36, 26], [25, 37], [36, 37]]) grid[y][x] = 'X';
for (const [x, y] of [[26, 27], [35, 27], [26, 36], [35, 36]]) grid[y][x] = 'y';
for (const [x, y] of [[28, 29], [33, 29], [28, 34], [33, 34]]) grid[y][x] = 'U';
grid[27][30] = 'N';                                                                   // grade de esgoto

// ---------- Taverna (noroeste da praça) ----------
ret(14, 22, 23, 29, (x, y) => grid[y][x] = '=');
borda(14, 22, 23, 29, '#'); parede(23, 26, '+'); parede(23, 25, '+');
ret(24, 25, 24, 26, (x, y) => grid[y][x] = '.');
for (let x = 15; x <= 19; x++) parede(x, 24, 'h');                                    // balcão
grid[23][15] = 'K'; grid[23][16] = 'G'; grid[23][17] = 'G'; grid[23][18] = 'R'; grid[23][19] = 'K'; grid[23][22] = 'X';
grid[26][17] = 'Y'; grid[26][16] = 'C'; grid[26][18] = 'C';
grid[26][20] = 'Y'; grid[27][20] = 'U'; grid[25][20] = 'U';
grid[28][17] = 'L'; grid[28][16] = 'U'; grid[28][18] = 'U';
grid[28][22] = 'q'; grid[23][21] = 'V';

// ---------- Casa (sudoeste da praça) ----------
ret(14, 34, 20, 39, (x, y) => grid[y][x] = '=');
borda(14, 34, 20, 39, '#'); parede(20, 36, '+'); grid[36][21] = '.';
grid[35][15] = 'A'; grid[35][16] = 'Z'; grid[35][19] = 'E';
grid[38][15] = 'R'; grid[38][16] = 'B'; grid[37][17] = 'M'; grid[37][18] = 'C'; grid[38][19] = 'V';
ret(15, 40, 20, 42, (x, y) => grid[y][x] = rnd() < 0.5 ? 'y' : '"');                 // jardim
for (let x = 14; x <= 21; x++) parede(x, 43, 'f');

// ---------- Armazém (nordeste da praça) ----------
ret(38, 26, 45, 29, (x, y) => grid[y][x] = '_');
borda(38, 26, 45, 29, 'm'); parede(38, 28, '+'); grid[28][37] = '.';
grid[27][39] = 'j'; grid[27][40] = 'j'; grid[27][42] = 'c'; grid[27][43] = 's'; grid[27][44] = 'K';
grid[28][44] = 'b'; grid[28][42] = 'q'; grid[28][41] = 'e';

// ---------- Feira (sudeste da praça) ----------
for (const [x, y] of [[39, 35], [43, 35], [47, 35]]) { grid[y][x] = 'n'; grid[y + 1][x] = 'M'; grid[y + 2][x] = 'q'; }
grid[38][41] = 'w'; grid[37][45] = 's'; grid[36][45] = 'c'; grid[38][49] = 'b'; grid[34][50] = 'o'; grid[37][50] = 'a';
ret(38, 33, 51, 39, (x, y) => { if ('Tk^'.includes(grid[y][x])) grid[y][x] = '.'; });

// ---------- Fazenda (sudoeste) ----------
ret(9, 45, 26, 56, (x, y) => grid[y][x] = (y % 2) ? '.' : (rnd() < 0.3 ? 'y' : '"'));  // canteiros
borda(9, 45, 26, 56, 'f'); parede(26, 50, ' '); parede(26, 51, ' ');
ret(27, 50, 29, 51, (x, y) => grid[y][x] = '.');
grid[50][17] = 'o'; grid[47][11] = 'Q'; grid[54][24] = 'Q'; grid[54][11] = 'w'; grid[46][24] = 's'; grid[46][23] = 'q';
// celeiro com paliçada
ret(10, 57, 16, 59, (x, y) => grid[y][x] = '=');
borda(10, 57, 16, 59, 'm'); parede(13, 57, '+'); parede(13, 56, ' ');
grid[58][11] = 'c'; grid[58][15] = 'j';
// muros baixos em ruína a oeste da estrada sul
for (const [x, y] of [[22, 44], [23, 44], [24, 44], [27, 41], [27, 42], [27, 43]]) parede(x, y, 'h');

// ---------- Cripta afundada (sudeste, nível −1) ----------
const KX0 = 40, KY0 = 42, KX1 = 57, KY1 = 57;
ret(KX0, KY0, KX1, KY1, (x, y) => { grid[y][x] = '_'; alt[y][x] = '0'; });
borda(KX0, KY0, KX1, KY1, '#');
parede(48, KY0, '+'); parede(49, KY0, '+');
ret(48, 33, 49, KY0 - 1, (x, y) => grid[y][x] = '.');                                 // caminho da feira à cripta
// corredor de entrada com armadilhas, grade e entulho
for (let y = KY0 + 1; y <= 48; y++) { parede(46, y, '#'); parede(51, y, '#'); }
for (const x of [47, 48]) grid[45][x] = 'W';
grid[44][50] = 'N'; grid[47][49] = 'D'; grid[43][47] = 'X'; grid[43][50] = 'X';
// salão das colunas
for (const [x, y] of [[43, 50], [43, 54], [47, 52], [52, 52], [55, 50], [55, 54]]) grid[y][x] = 'I';
grid[55][46] = 'r'; grid[55][47] = 'r'; grid[50][49] = 'V'; grid[54][50] = 'V'; grid[56][41] = 'e';
grid[51][41] = 'D'; grid[53][41] = 'D';
// câmara do tesouro trancada (porta fechada: o Mestre abre)
for (let x = 52; x < KX1; x++) parede(x, 47, '#');
for (let y = KY0 + 1; y < 47; y++) parede(52, y, '#');
parede(54, 47, 'd');
grid[44][55] = 'O'; grid[44][54] = '$'; grid[45][56] = '$'; grid[43][53] = 'S'; grid[43][56] = 'F'; grid[46][53] = 'V';
// salas laterais a oeste
for (let y = KY0 + 1; y <= 48; y++) parede(44, y, '#');
parede(44, 46, '+'); grid[43][41] = 'E'; grid[43][42] = 'B'; grid[45][41] = 'A'; grid[47][42] = 'H';

// ---------- Relevo: nenhuma casa fica 2 níveis acima da vizinha ----------
for (let mudou = true; mudou;) {
  mudou = false;
  ret(0, 0, N - 1, N - 1, (x, y) => {
    let min = 9;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (dentro(x + dx, y + dy)) min = Math.min(min, +alt[y + dy][x + dx]);
    if (+alt[y][x] > min + 1) { alt[y][x] = String(min + 1); mudou = true; }
  });
}

const mapa = {
  nome: 'Vale de Demonstração', cols: N, rows: N, luz: 'dia', lua: 'nenhuma',
  grid: grid.map(l => l.join('')), alt: alt.map(l => l.join('')), par: par.map(l => l.join('')),
};

// NPCs de exemplo (criaturas): lobos na floresta, esqueletos na cripta, espectro no templo
const criatura = (nome, sigla, criatura, cor, x, y, vigor, defesa, ataque, dano, desloc, xp) =>
  ({ nome, sigla, cor, tipo: 'monstro', raca: 'criatura', aparencia: { criatura, base: cor }, x, y, vigor, vigorMax: vigor, defesa, ataque, dano, desloc, xp });
const npcs = [
  criatura('Lobo cinzento', 'L1', 'lobo', '#7a7a7a', 20, 10, 12, 12, 4, '1d6', 8, 20),
  criatura('Lobo cinzento', 'L2', 'lobo', '#7a7a7a', 22, 12, 12, 12, 4, '1d6', 8, 20),
  criatura('Esqueleto guerreiro', 'E1', 'esqueleto', '#d8d0b8', 48, 51, 16, 13, 5, '1d8', 5, 30),
  criatura('Esqueleto ladino', 'E2', 'esqueleto_ladino', '#d8d0b8', 53, 54, 12, 14, 5, '1d6', 6, 30),
  criatura('Esqueleto canalizador', 'E3', 'esqueleto_mago', '#c8c0e0', 42, 52, 10, 12, 6, '1d8', 5, 40),
  criatura('Espectro do templo', 'EP', 'fantasma', '#9fc4d8', 50, 9, 20, 14, 6, '1d10', 6, 60),
];

// ---------- Conferência (as mesmas regras de mapaValidado no worker) ----------
const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
assert(mapa.grid.length === N && mapa.grid.every(l => l.length === N && [...l].every(c => TERRENOS[c])), 'grid com caractere inválido');
assert(mapa.alt.every(l => l.length === N && /^[0-4]+$/.test(l)), 'alt inválido');
assert(mapa.par.every(l => l.length === N && [...l].every(c => c === ' ' || PAREDES.includes(c))), 'par inválido');
const usados = new Set(mapa.grid.join('') + mapa.par.join(''));
const faltam = Object.keys(TERRENOS).filter(c => !usados.has(c));
assert(!faltam.length, 'terrenos fora da demonstração: ' + faltam.join(' '));
const alcance = dijkstra(mapa, new Set(), 30, N - 1, 9999);
for (const [x, y, o] of [[22, 26, 'taverna'], [19, 36, 'casa'], [39, 28, 'armazém'], [50, 8, 'trono do templo'], [48, 52, 'salão da cripta'], [42, 46, 'sala lateral da cripta'], [3, 32, 'píer'], [17, 52, 'fazenda'], [13, 58, 'celeiro'], [20, 5, 'clareira']])
  assert(alcance.has(x + ',' + y), 'sem caminho até ' + o + ` (${x},${y}, nível ${nivelEm(mapa, x, y)})`);
for (const n of npcs) assert(TERRENOS[mapa.grid[n.y][n.x]].custo < Infinity && mapa.par[n.y][n.x] === ' ', 'NPC em casa bloqueada: ' + n.nome);

mkdirSync('mapas', { recursive: true });
writeFileSync('mapas/demo-60x60.json', JSON.stringify({ mapa, npcs }, null, 1));
console.log('mapas/demo-60x60.json gerado e conferido.');
console.log(mapa.grid.map((l, y) => l.split('').map((c, x) => mapa.par[y][x] !== ' ' ? mapa.par[y][x] : c).join('')).join('\n'));
