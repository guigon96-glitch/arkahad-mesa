// Gera um mapa 60x60 com castelo num morro, fosso, rio, vila, acampamento e vegetação.
// Usa tudo da paleta atual: muralha, tijolo, reboco, tábuas, janelas, grades, porta fechada, pintura (tin),
// rampas e escadas entre níveis, giro dos objetos (rot), mobília, armadilhas e NPCs prontos.
// Uso: node scripts/gerar-mapa-castelo.js  →  mapas/castelo-60x60.json (importar pelo painel do Mestre)
import { writeFileSync, mkdirSync } from 'node:fs';
import { TERRENOS, PAREDES, TINTAS, dijkstra, nivelEm, semParedeEntre } from '../public/regras.js';

const N = 60;
let semente = 7331;
const rnd = () => ((semente = (semente * 1103515245 + 12345) % 2147483648) / 2147483648);
const camada = c => Array.from({ length: N }, () => Array(N).fill(c));
const grid = camada('"'), alt = camada('1'), par = camada(' '), tin = camada(' '), rot = camada(' ');
const dentro = (x, y) => x >= 0 && y >= 0 && x < N && y < N;
const parede = (x, y, c, t = ' ') => { if (dentro(x, y)) { par[y][x] = c; tin[y][x] = t; } };
const ret = (x0, y0, x1, y1, f) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) f(x, y); };
const borda = (x0, y0, x1, y1, c, t) => ret(x0, y0, x1, y1, (x, y) => { if (x === x0 || x === x1 || y === y0 || y === y1) parede(x, y, c, t); });
const piso = (x0, y0, x1, y1, c, n) => ret(x0, y0, x1, y1, (x, y) => { grid[y][x] = c; if (n) alt[y][x] = n; par[y][x] = ' '; tin[y][x] = ' '; });
const por = (lista, c, g) => { for (const [x, y] of lista) { grid[y][x] = c; if (g) rot[y][x] = g; } };

// ruído suave (soma de senos com fases aleatórias) para florestas e colinas
const fases = Array.from({ length: 12 }, () => rnd() * 6.28);
const ruido = (x, y, k = 0) => (Math.sin(x * 0.21 + fases[k]) + Math.sin(y * 0.17 + fases[k + 1]) + Math.sin((x + y) * 0.13 + fases[k + 2]) + Math.sin((x - y) * 0.29 + fases[k + 3])) / 4;

// ---------- Castelo: muralha 16..44 x 8..34, morro em volta ----------
const CX0 = 16, CY0 = 8, CX1 = 44, CY1 = 34;
const noMorro = (x, y, m) => x >= CX0 - m && x <= CX1 + m && y >= CY0 - m && y <= CY1 + m;

// ---------- Rio: entra pelo norte a oeste, contorna o morro pelo sul e sai a leste ----------
const rio = new Set();
for (let t = 0; t <= 1; t += 0.002) {
  let x, y;
  if (t < 0.45) { const u = t / 0.45; x = 6 + Math.sin(u * 5) * 2; y = u * 45; }
  else { const u = (t - 0.45) / 0.55; x = 6 + u * 54; y = 45 + Math.sin(u * 6) * 2 - u * 1; }
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { const rx = Math.round(x + dx * 0.9), ry = Math.round(y + dy * 0.9); if (dentro(rx, ry)) rio.add(rx + ',' + ry); }
}

// ---------- Vegetação e relevo base ----------
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
  const f = ruido(x, y, 0), g = ruido(x, y, 4), r = rnd();
  const colina = ruido(x, y, 8) + (y < 14 ? 0.35 : 0) - (y > 40 ? 0.6 : 0);
  if (colina > 0.45) alt[y][x] = '3'; else if (colina > 0.15) alt[y][x] = '2';
  let c = '"';
  if (y < 18 && f > 0.05) c = r < 0.5 ? 'P' : r < 0.6 ? 'T' : r < 0.7 ? 't' : '"';     // pinhal ao norte, samambaias
  else if (x > 46 && g > 0.1) c = r < 0.45 ? 'T' : r < 0.55 ? 'k' : r < 0.62 ? 't' : '"'; // bosque a leste
  else if (x < 12 && y > 48) c = r < 0.2 ? 'Q' : r < 0.3 ? 'k' : r < 0.45 ? '.' : '"';    // charneca seca a sudoeste
  else if (f < -0.35) c = r < 0.25 ? 'T' : r < 0.4 ? 'k' : '"';
  else if (r < 0.06) c = 'k'; else if (r < 0.1) c = 'T'; else if (r < 0.115) c = '^'; else if (r < 0.13) c = 'y';
  if (alt[y][x] === '3' && r < 0.08) c = '^';
  grid[y][x] = c;
}
for (const k of rio) { const [x, y] = k.split(',').map(Number); grid[y][x] = '~'; alt[y][x] = '0'; }
ret(0, 0, N - 1, N - 1, (x, y) => {
  if (grid[y][x] === '~') return;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (rio.has((x + dx) + ',' + (y + dy))) { grid[y][x] = rnd() < 0.7 ? ',' : '"'; alt[y][x] = '1'; return; }
});

// morro do castelo: encosta (+1) em volta, fosso d'água, platô (+2) dentro
ret(0, 0, N - 1, N - 1, (x, y) => {
  if (noMorro(x, y, 6)) { alt[y][x] = '2'; if ('PQ^~'.includes(grid[y][x])) grid[y][x] = rnd() < 0.15 ? 'k' : '"'; }
  if (noMorro(x, y, 3)) { alt[y][x] = '2'; grid[y][x] = '~'; }
  if (noMorro(x, y, 1)) { alt[y][x] = '3'; grid[y][x] = rnd() < 0.5 ? '.' : '"'; }
});
for (let i = 0; i < 25; i++) { const x = CX0 - 6 + Math.floor(rnd() * 41), y = CY0 - 6 + Math.floor(rnd() * 39); if (noMorro(x, y, 6) && !noMorro(x, y, 4)) grid[y][x] = rnd() < 0.6 ? '^' : 'k'; }

// ---------- Estradas ----------
const estrada = new Set();
const via = (x, y) => { if (!dentro(x, y)) return; if (grid[y][x] === '~') { grid[y][x] = '='; if (alt[y][x] === '0') alt[y][x] = '1'; } else { grid[y][x] = '.'; estrada.add(x + ',' + y); } };
for (let y = CY1; y < N; y++) for (let x = 29; x <= 31; x++) via(x + Math.round(Math.sin(y * 0.3) * (y > CY1 + 8 ? 1 : 0)), y);
for (let x = 0; x < N; x++) { const y = 41 + Math.round(Math.sin(x * 0.15) * 1.2); via(x, y); via(x, y + 1); }
for (let y = 0; y <= CY0; y++) via(30, y);
// pontes do fosso no nível do platô
for (let y = CY1 + 1; y <= CY1 + 4; y++) for (let x = 29; x <= 31; x++) { grid[y][x] = '='; alt[y][x] = '3'; }
for (let y = CY0 - 4; y <= CY0 - 1; y++) { grid[y][30] = '='; alt[y][30] = '3'; }

// ---------- Dentro das muralhas: pátio no nível +2 ----------
ret(CX0, CY0, CX1, CY1, (x, y) => { grid[y][x] = rnd() < 0.15 ? '"' : '.'; alt[y][x] = '3'; });
borda(CX0, CY0, CX1, CY1, 'z');                                                   // muralha grossa
for (let x = 29; x <= 31; x++) parede(x, CY1, '+');                               // portão sul
parede(30, CY0, '+');                                                             // poterna norte
// escada (casa mais alta) na porta: liga o pátio (+2) ao piso de +3
const escadaNaPorta = (x, y, porta = '+') => { parede(x, y, porta); grid[y][x] = '|'; alt[y][x] = '4'; };

// torres dos cantos 5x5, piso +3, janelas para fora
const torres = { NO: [CX0, CY0, [4, 2]], NE: [CX1 - 4, CY0, [0, 2]], SO: [CX0, CY1 - 4, [4, 2]], SE: [CX1 - 4, CY1 - 4, [0, 2]] };
for (const [tx, ty, [px, py]] of Object.values(torres)) {
  piso(tx, ty, tx + 4, ty + 4, '_', '4');
  borda(tx, ty, tx + 4, ty + 4, 'z');
  const fora = px === 4 ? tx : tx + 4;
  parede(fora, ty + 2, '!'); parede(tx + 2, ty === CY0 ? ty : ty + 4, '!');
}
escadaNaPorta(CX0 + 4, CY0 + 2);                                                  // NO: biblioteca
escadaNaPorta(CX1 - 4, CY0 + 2, 'd');                                             // NE: tesouro trancado (porta fechada)
escadaNaPorta(CX0 + 4, CY1 - 2);                                                  // SO: arsenal
escadaNaPorta(CX1 - 4, CY1 - 2);                                                  // SE: vigia
por([[17, 9], [18, 9], [19, 9]], 'E'); grid[11][18] = 'M'; grid[11][17] = 'C'; grid[11][19] = 'V';
por([[41, 9], [42, 11]], '$'); grid[9][43] = 'O'; grid[11][43] = 'B'; grid[9][42] = 'j'; grid[11][41] = 'W'; // armadilha no tesouro
por([[17, 31], [19, 33]], 'a'); grid[33][17] = 'S'; grid[31][19] = 'B';
grid[31][43] = 'e'; grid[33][43] = 'X'; grid[31][41] = 'K';

// torres do portão, seteiras para a ponte
for (const tx of [26, 32]) { piso(tx, CY1 - 3, tx + 2, CY1, '_'); borda(tx, CY1 - 3, tx + 2, CY1, 'z'); parede(tx + 1, CY1, '!'); }
parede(28, CY1 - 2, '+'); parede(32, CY1 - 2, '+');
grid[CY1 - 1][27] = 'a'; grid[CY1 - 1][33] = 'X';

// ---------- Torre de menagem (+3): cozinha | salão do trono | capela ----------
const SX0 = 22, SY0 = 12, SX1 = 38, SY1 = 22;
piso(SX0, SY0, SX1, SY1, '_', '4');
borda(SX0, SY0, SX1, SY1, '#');
for (let x = 29; x <= 31; x++) escadaNaPorta(x, SY1);
for (const x of [24, 36]) parede(x, SY0, '!');
for (const x of [25, 35]) parede(x, SY1, '!');
for (const y of [15, 19]) parede(SX1, y, '!');
// cozinha (reboco creme)
piso(23, 13, 25, 21, '=');
for (let y = 13; y <= 21; y++) parede(26, y, 'i', 'b');
parede(26, 15, '+');
grid[13][23] = '*'; grid[13][25] = 'R'; grid[16][23] = 'Y'; grid[16][24] = 'U'; grid[19][23] = 'q'; grid[21][23] = 'K'; grid[21][24] = 'G'; grid[21][25] = 's';
// capela (reboco anil, vidro negro, vitrais)
piso(35, 13, 37, 21, 'v');
for (let y = 13; y <= 21; y++) parede(34, y, 'i', 'j');
parede(34, 15, '+');
por([[35, 13], [37, 13]], 'V'); grid[13][36] = 'H'; por([[35, 17], [37, 17], [35, 19], [37, 19]], 'U', '0'); grid[21][37] = 'H';
// salão: estrado com trono, estandartes, colunas entalhadas, banquete
piso(28, 13, 32, 13, '=');
grid[13][30] = 'u'; rot[13][30] = '0';
por([[28, 13], [32, 13]], 'F'); por([[27, 13], [33, 13]], '*');
por([[28, 15], [32, 15], [28, 19], [32, 19]], 'J');
por([[29, 17], [31, 17]], 'L'); por([[29, 16], [31, 16], [29, 18], [31, 18]], 'C');
grid[21][27] = 'S'; grid[21][33] = 'S';

// ---------- Estábulo (tábuas) a oeste da torre de menagem ----------
piso(17, 14, 19, 20, ','); borda(CX0, 13, 20, 21, 'p'); for (let y = 13; y <= 21; y++) parede(CX0, y, 'z');
parede(20, 17, '+');
for (const y of [16, 19]) { parede(17, y, 'f'); parede(18, y, 'f'); }
por([[17, 14], [17, 20]], 'q'); grid[15][19] = 's'; grid[20][19] = 'w'; grid[18][17] = 'b';

// ---------- Masmorra (tijolo, afundada no nível +1) a leste ----------
piso(41, 14, 43, 20, '_', '2');
borda(40, 13, CX1, 21, 'g', 'm'); for (let y = 13; y <= 21; y++) parede(CX1, y, 'z');
escadaNaPorta(40, 20); alt[20][40] = '3';                                         // desce do pátio (+2) para +1
for (let y = 14; y <= 20; y++) parede(42, y, '%');                                // grades das celas
parede(42, 17, 'g', 'm'); parede(43, 17, 'g', 'm');
grid[14][41] = 'X'; grid[16][41] = 'N'; grid[18][41] = 'W';
grid[15][43] = 'D'; grid[19][43] = 'A';

// ---------- Quartel (tábuas, madeira escura) a sudoeste do pátio ----------
piso(17, 24, 22, 28, '=');
borda(CX0, 23, 23, 29, 'p', 'p'); for (let y = 23; y <= 29; y++) parede(CX0, y, 'z');
parede(23, 25, '+'); parede(20, 29, '!');
por([[17, 24], [19, 24], [21, 24]], 'A', '0'); por([[18, 24], [20, 24]], 'B');
grid[24][22] = 'Z'; grid[27][19] = 'M'; por([[18, 27], [20, 27]], 'C'); grid[28][22] = 'a';

// ---------- Ferraria (tijolo terracota) a sudeste do pátio ----------
piso(38, 24, 43, 28, '.');
borda(37, 23, CX1, 29, 'g', 'd'); for (let y = 23; y <= 29; y++) parede(CX1, y, 'z');
parede(37, 26, '+'); parede(40, 23, '!');
grid[24][43] = '*'; grid[25][43] = 'K'; grid[27][43] = 'a'; grid[28][42] = 'S'; grid[28][38] = 'j'; grid[26][40] = 'M'; grid[26][39] = 'U'; grid[24][38] = 'c';

// ---------- Pátio: caminho, poço, jardim, lanternas, carga, treino ----------
ret(29, 23, 31, CY1 - 1, (x, y) => grid[y][x] = '_');
grid[27][26] = '*'; for (const [x, y] of [[25, 26], [27, 26], [25, 28], [27, 28]]) parede(x, y, 'h');
grid[25][26] = 'N';                                                               // ralo do poço
ret(33, 24, 35, 28, (x, y) => grid[y][x] = rnd() < 0.6 ? 'y' : 't'); grid[26][34] = 'T';
por([[28, 23], [32, 23], [28, 30], [32, 30]], 'X');
por([[22, 33], [23, 33]], 's'); grid[31][23] = 'b'; grid[33][24] = 'w'; grid[31][22] = 'c'; grid[33][25] = 'e';
for (let x = 36; x <= 39; x++) parede(x, 30, 'f');
por([[39, 31], [39, 33]], 'o'); grid[32][36] = 'r'; grid[33][35] = 'a';
por([[25, 30], [35, 32]], 'n');
// jardim norte entre a muralha e a torre de menagem
ret(21, 9, 39, 11, (x, y) => { if (x !== 30) grid[y][x] = rnd() < 0.5 ? 'y' : rnd() < 0.5 ? '"' : 't'; });
por([[23, 10], [37, 10]], 'T'); por([[26, 9], [34, 9]], 'k'); por([[29, 11], [31, 11]], 'X');

// ---------- Vila ao sul do rio, a oeste da estrada ----------
const casa = (x0, y0, x1, y1, mat, cor, porta, janelas, chao = '=') => {
  piso(x0, y0, x1, y1, chao, '1'); borda(x0, y0, x1, y1, mat, cor);
  parede(porta[0], porta[1], '+'); for (const [x, y] of janelas) parede(x, y, '!', cor);
};
casa(13, 50, 18, 54, 'g', 'd', [16, 50], [[13, 52], [18, 52]]);                 // casa de tijolo terracota
por([[14, 51], [14, 53]], 'A', '1'); grid[53][17] = 'M'; grid[52][17] = 'C'; grid[51][17] = 'R';
casa(20, 50, 26, 55, 'i', 'a', [23, 50], [[20, 52], [26, 52], [22, 55]]);       // taverna caiada
por([[21, 52], [24, 52]], 'Y'); por([[22, 52], [25, 52], [21, 53], [24, 53]], 'U'); por([[21, 54], [22, 54]], 'G'); grid[54][25] = 'K'; grid[51][21] = 'R';
casa(13, 56, 18, 58, 'p', ' ', [16, 56], [[13, 57]], '.');                      // celeiro de tábuas
grid[57][14] = 's'; grid[57][17] = 'q';
ret(19, 56, 26, 58, (x, y) => { if (grid[y][x] === 'T' || grid[y][x] === '^' || grid[y][x] === 'Q') grid[y][x] = '"'; });
ret(20, 57, 25, 58, (x, y) => grid[y][x] = rnd() < 0.5 ? 'y' : 't');          // horta
for (let x = 19; x <= 26; x++) parede(x, 56, 'f'); parede(23, 56, ' ');
ret(13, 49, 27, 49, (x, y) => { grid[y][x] = '.'; alt[y][x] = '1'; });          // rua da vila
grid[49][19] = 'X'; ret(12, 55, 19, 55, (x, y) => grid[y][x] = '.');                 // beco entre as casas

// ---------- Acampamento mercenário a leste e ruínas de vigia a noroeste ----------
ret(42, 47, 51, 54, (x, y) => { if ('T^Pk~'.includes(grid[y][x])) grid[y][x] = '"'; alt[y][x] = '1'; });
for (const [x, y] of [[44, 48], [47, 48], [45, 52], [49, 52]]) grid[y][x] = 'n';
grid[50][47] = '*'; grid[48][50] = 'b'; grid[51][43] = 'c'; grid[53][47] = 'w'; grid[49][45] = 'a'; grid[50][49] = 'r';
for (let x = 42; x <= 51; x++) { parede(x, 46, 'm'); parede(x, 55, 'm'); } parede(46, 46, '+'); parede(46, 55, ' ');
borda(4, 4, 9, 8, 'h'); parede(6, 8, ' '); ret(5, 5, 8, 7, (x, y) => grid[y][x] = '.'); grid[6][7] = '*';
por([[5, 5], [8, 5], [5, 7]], 'D'); grid[7][8] = 'O';

// ---------- Relevo: nenhuma casa pode ficar 2 níveis acima da vizinha (escadas podem) ----------
for (let mudou = true; mudou;) {
  mudou = false;
  ret(0, 0, N - 1, N - 1, (x, y) => {
    if (grid[y][x] === '|') return;
    let min = 9;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (dentro(x + dx, y + dy) && grid[y + dy][x + dx] !== '|') min = Math.min(min, +alt[y + dy][x + dx]);
    if (+alt[y][x] > min + 1) { alt[y][x] = String(min + 1); mudou = true; }
  });
}
// rampas nas estradas norte–sul: a casa que fica 1 nível acima da casa de estrada logo ao norte ou ao sul
for (const k of estrada) {
  const [x, y] = k.split(',').map(Number);
  if (grid[y][x] === '.' && x >= 28 && x <= 32 && [[0, 1], [0, -1]].some(([dx, dy]) => estrada.has((x + dx) + ',' + (y + dy)) && +alt[y + dy][x + dx] === +alt[y][x] - 1)) grid[y][x] = '/';
}

const linhas = m => m.map(l => l.join(''));
const mapa = {
  nome: 'Castelo do Morro', cols: N, rows: N, luz: 'dia', lua: 'nenhuma',
  grid: linhas(grid), alt: linhas(alt), par: linhas(par), rot: linhas(rot), tin: linhas(tin),
};

// ---------- NPCs ----------
const npc = (nome, sigla, tipo, x, y, extra = {}) => ({ nome, sigla, tipo, x, y, cor: tipo === 'monstro' ? '#8a3b2e' : tipo === 'aliado' ? '#3b6a8a' : '#8c7a63', vigor: 10, vigorMax: 10, defesa: 12, desloc: 6, ...extra });
const npcs = [
  npc('Senhor do Castelo', 'SC', 'npc', 30, 14, { descricao: 'No trono, sobre o estrado do salão.', vigor: 14, vigorMax: 14 }),
  npc('Guarda do portão', 'G1', 'aliado', 29, 32, { vigor: 12, vigorMax: 12, defesa: 14 }),
  npc('Guarda do portão', 'G2', 'aliado', 31, 32, { vigor: 12, vigorMax: 12, defesa: 14 }),
  npc('Sentinela da torre', 'SE', 'aliado', 42, 32, { vigor: 12, vigorMax: 12, defesa: 13 }),
  npc('Ferreiro', 'FE', 'npc', 40, 25, { descricao: 'Trabalha na forja da ferraria.' }),
  npc('Cozinheira', 'CZ', 'npc', 24, 18),
  npc('Sacerdote', 'SA', 'npc', 36, 15, { descricao: 'Cuida da capela de vidro negro.' }),
  npc('Bibliotecário', 'BI', 'npc', 19, 10),
  npc('Prisioneiro', 'PR', 'npc', 43, 18, { descricao: 'Preso na cela de baixo da masmorra.' }),
  npc('Taverneiro', 'TV', 'npc', 23, 53),
  npc('Mercenário', 'M1', 'monstro', 46, 50, { vigor: 12, vigorMax: 12, defesa: 13 }),
  npc('Mercenário', 'M2', 'monstro', 48, 49, { vigor: 12, vigorMax: 12, defesa: 13 }),
];

// ---------- Conferência (as mesmas regras de mapaValidado no worker) ----------
const assert = (ok, msg) => { if (!ok && process.env.VER) console.error(msg); else if (!ok) throw new Error(msg); };
assert(mapa.grid.every(l => l.length === N && [...l].every(c => TERRENOS[c])), 'grid com caractere inválido');
assert(mapa.alt.every(l => l.length === N && /^[0-4]+$/.test(l)), 'alt inválido');
assert(mapa.par.every(l => l.length === N && [...l].every(c => c === ' ' || PAREDES.includes(c))), 'par inválido');
assert(mapa.tin.every(l => l.length === N && [...l].every(c => c === ' ' || TINTAS[c])), 'tin inválido');
assert(mapa.rot.every(l => l.length === N && /^[ 0-3]+$/.test(l)), 'rot inválido');
const alcance = dijkstra(mapa, new Set(), 30, N - 1, 9999);
const lugares = { trono: [30, 14], cozinha: [24, 14], capela: [36, 16], biblioteca: [19, 10], arsenal: [18, 32], vigia: [42, 32], estabulo: [19, 17], masmorra: [41, 19], quartel: [20, 26], ferraria: [39, 27], treino: [37, 32], jardim: [25, 10], 'torre do portão': [27, 32], 'trilha norte': [30, 0], 'estrada oeste': [0, 41], vila: [16, 52], taverna: [23, 51], celeiro: [16, 57], acampamento: [46, 50] };
for (const [o, [x, y]] of Object.entries(lugares)) assert(alcance.has(x + ',' + y), `sem caminho até ${o} (${x},${y}, nível ${nivelEm(mapa, x, y)})`);
assert(!semParedeEntre(mapa, 30, 30, 42, 10), 'o tesouro devia estar trancado');
assert(!semParedeEntre(mapa, 41, 19, 43, 18), 'a cela devia estar fechada');
for (const n of npcs) assert(TERRENOS[mapa.grid[n.y][n.x]].custo < Infinity && mapa.par[n.y][n.x] === ' ', 'NPC em casa ocupada: ' + n.nome);

mkdirSync('mapas', { recursive: true });
writeFileSync('mapas/castelo-60x60.json', JSON.stringify({ mapa, npcs }, null, 1));
console.log('mapas/castelo-60x60.json gerado e conferido.');
console.log(mapa.grid.map((l, y) => l.split('').map((c, x) => mapa.par[y][x] !== ' ' ? mapa.par[y][x] : c).join('')).join('\n'));
