// Cena 3D do tabuleiro: terreno, cenário, luzes de Kael e Lyra, miniaturas, dados.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TERRENOS, nivelEm } from './regras.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { criarMiniatura, criarDado, rotulo } from './miniatura.js';
import { carregarModelos, carregarNatureza, criarPersonagem, criarCriatura3D, CRIATURAS_3D, pecaCenario, pecaNatureza, temCenario, temNatureza, modelosProntos, TEMPO } from './modelos.js';

// ---------- configuração fácil de editar ----------
const ALTURA = { '.': .12, '_': .16, ',': .1, '"': .14, '~': .04, '=': .17, '+': .16, 'v': .12, '#': .16, m: .12, h: .12, k: .14, P: .14, Q: .12, 'T': .14, '^': .12, '*': .12, b: .12, c: .12, s: .12, n: .14, a: .16, o: .14, w: .12 };
const NIVEL_H = .65; // altura de um nível de terreno
const PAREDES = { '#': { h: 1.45, t: .4, tex: 'muro' }, m: { h: 1.35, t: .3, tex: 'tronco' }, h: { h: .55, t: .42, tex: 'muro' } };
const OBJETOS = { b: ['barril'], c: ['caixote', 'caixotes'], s: ['saco'], n: ['tenda'], a: ['suporte_armas'], o: ['alvo'], w: ['carrinho', 'balde'] };
const TEXTURA_DE = { '.': 'terra', '_': 'ladrilho', ',': 'areia', '"': 'mato', '~': 'leito', '=': 'madeira', '+': 'madeira', 'v': 'vidro', '#': 'ladrilho', m: 'terra', h: 'terra', k: 'mato', P: 'mato', Q: 'terra', 'T': 'mato', '^': 'terra', '*': 'terra', b: 'terra', c: 'terra', s: 'terra', n: 'mato', a: 'ladrilho', o: 'mato', w: 'terra' };
const CEUS = {
  dia: { env: .45, fundo: '#b08a58', nevoa: '#c9a46c', hemi: ['#fff1d6', '#4a3a28', .55], kael: [1.9, [-.6, 1, .45]], lyra: [0], amb: .12 },
  noite: { env: .02, fundo: '#05060c', nevoa: '#05060c', hemi: ['#2a3350', '#0a0a10', .18], kael: [0], lyra: [0], amb: .05, luaForte: true },
  azul: { env: .06, fundo: '#0a1c46', nevoa: '#0f2a5c', hemi: ['#5f8cff', '#0a1430', .75], kael: [0], lyra: [2.3, [.7, 1, -.35]], amb: .1 },
  conjuncao: { env: .1, fundo: '#2b1f3d', nevoa: '#3a2a4a', hemi: ['#c0a0ff', '#20141a', .35], kael: [1.7, [-1, .42, .25]], lyra: [1.5, [1, .45, -.2]], amb: .1 },
};
const LUAS = { aranor: '#ff3a2a', nimriel: '#2fe3c4', tirith: '#eaf6ff' };

function acaso(x, y, k = 0) {
  let h = (x * 374761393 + y * 668265263 + k * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// ---------- texturas procedurais ----------
function textura(desenhar, tam = 128, repetir = true) {
  const c = document.createElement('canvas'); c.width = c.height = tam;
  const g = c.getContext('2d'); desenhar(g, tam);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  if (repetir) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}
function salpicar(g, t, n, cores, r0 = .5, r1 = 1.6) {
  for (let i = 0; i < n; i++) { g.fillStyle = cores[i % cores.length]; g.beginPath(); g.arc(Math.random() * t, Math.random() * t, r0 + Math.random() * (r1 - r0), 0, 7); g.fill(); }
}
function fazerTexturas() {
  return {
    terra: textura((g, t) => { g.fillStyle = '#6b4f34'; g.fillRect(0, 0, t, t); for (let i = 0; i < 6; i++) { const gr = g.createRadialGradient(Math.random() * t, Math.random() * t, 2, Math.random() * t, Math.random() * t, 30); gr.addColorStop(0, '#5a3f28aa'); gr.addColorStop(1, '#5a3f2800'); g.fillStyle = gr; g.fillRect(0, 0, t, t); } salpicar(g, t, 700, ['#7d5f42', '#5c432c', '#8a6c4c', '#4a3524']); salpicar(g, t, 14, ['#857b70', '#6e655c'], 1.5, 3); }),
    areia: textura((g, t) => { g.fillStyle = '#d0a865'; g.fillRect(0, 0, t, t); salpicar(g, t, 1600, ['#dcb87a', '#c39a58', '#e6c88f', '#b88f4f'], .4, 1); g.strokeStyle = '#e8cb93aa'; g.lineWidth = 2; for (let k = 0; k < 3; k++) { g.beginPath(); const y = 20 + k * 40; g.moveTo(0, y); for (let x = 0; x <= t; x += 8) g.lineTo(x, y + Math.sin(x / 14 + k) * 5); g.stroke(); } }),
    mato: textura((g, t) => { g.fillStyle = '#3d672b'; g.fillRect(0, 0, t, t); salpicar(g, t, 300, ['#355a25', '#4a7a33'], 1, 3); const cs = ['#5d9a3f', '#2f5321', '#78b04f', '#4f8737', '#8cc25e']; for (let i = 0; i < 520; i++) { g.strokeStyle = cs[i % cs.length]; g.lineWidth = 1 + Math.random(); const x = Math.random() * t, y = Math.random() * t, a = -Math.PI / 2 + (Math.random() - .5) * .9, l = 3 + Math.random() * 5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); } salpicar(g, t, 10, ['#e8d35a', '#d97ab8', '#ffffff'], 1, 1.8); }),
    ladrilho: textura((g, t) => { g.fillStyle = '#3e3a35'; g.fillRect(0, 0, t, t); const n = 2, s = t / n; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const v = 105 + Math.random() * 30; g.fillStyle = `rgb(${v},${v - 6},${v - 14})`; g.fillRect(i * s + 3, j * s + 3, s - 6, s - 6); g.fillStyle = '#ffffff18'; g.fillRect(i * s + 3, j * s + 3, s - 6, 4); } salpicar(g, t, 300, ['#00000022', '#ffffff14'], .5, 1.5); }),
    madeira: textura((g, t) => { g.fillStyle = '#6a4224'; g.fillRect(0, 0, t, t); const n = 4, s = t / n; for (let i = 0; i < n; i++) { const v = Math.random() * 20; g.fillStyle = `rgb(${110 + v},${68 + v / 2},${36})`; g.fillRect(0, i * s + 1, t, s - 2); g.strokeStyle = '#4a2c16aa'; g.lineWidth = 1; for (let k = 0; k < 4; k++) { g.beginPath(); const y = i * s + 4 + k * (s / 4); g.moveTo(0, y); for (let x = 0; x <= t; x += 6) g.lineTo(x, y + Math.sin(x / 9 + k * 2 + i) * 1.5); g.stroke(); } g.fillStyle = '#2b1a0e'; g.beginPath(); g.arc(10 + Math.random() * 100, i * s + s / 2, 2, 0, 7); g.fill(); } }),
    vidro: textura((g, t) => { const gr = g.createLinearGradient(0, 0, t, t); gr.addColorStop(0, '#16121c'); gr.addColorStop(1, '#0b090f'); g.fillStyle = gr; g.fillRect(0, 0, t, t); g.lineWidth = 2; for (let i = 0; i < 6; i++) { g.strokeStyle = i % 2 ? '#4a4458' : '#8d86a3aa'; g.beginPath(); const x = Math.random() * t; g.moveTo(x, t); g.lineTo(x + 40, 0); g.stroke(); } }),
    muroVelho: textura((g, t) => { g.fillStyle = '#2a2520'; g.fillRect(0, 0, t, t); const h = t / 6; for (let r = 0; r < 6; r++) { const off = r % 2 ? t / 6 : 0; for (let c = -1; c < 3; c++) { const v = 62 + Math.random() * 26; g.fillStyle = `rgb(${v},${v - 6},${v - 12})`; g.fillRect(off + c * t / 3 + 2, r * h + 2, t / 3 - 4, h - 4); } } salpicar(g, t, 200, ['#00000033', '#ffffff10'], .5, 1.4); }),
    muro: textura((g, t) => {
      g.fillStyle = '#3a342d'; g.fillRect(0, 0, t, t);
      const linhas = 8, h = t / linhas;
      for (let r = 0; r < linhas; r++) { const off = (r % 2) * t / 6; for (let c = -1; c < 4; c++) { const w = t / 3, x = off + c * w; const v = 92 + Math.random() * 40, tint = Math.random() * 10; g.fillStyle = `rgb(${v + tint},${v - 4},${v - 14})`; g.beginPath(); g.roundRect(x + 2, r * h + 2, w - 4, h - 4, 3); g.fill(); g.fillStyle = '#ffffff12'; g.fillRect(x + 3, r * h + 3, w - 6, 2); g.fillStyle = '#0000002a'; g.fillRect(x + 3, r * h + h - 5, w - 6, 2); } }
      salpicar(g, t, 500, ['#00000028', '#ffffff10', '#5a6a3a30'], .5, 1.6);
    }, 256),
    muroNormal: (() => {
      const t = 256, c = document.createElement('canvas'); c.width = c.height = t; const g = c.getContext('2d'), img = g.createImageData(t, t);
      const linhas = 8, hh = t / linhas, w = t / 3;
      const alt = (x, y) => { const r = Math.floor(y / hh), off = (r % 2) * t / 6, xx = ((x - off) % w + w) % w, yy = y % hh; const dx = Math.min(xx, w - xx), dy = Math.min(yy, hh - yy); return Math.min(1, Math.min(dx, dy) / 4); };
      for (let y = 0; y < t; y++) for (let x = 0; x < t; x++) { const dx = alt(x + 1, y) - alt(x - 1, y), dy = alt(x, y + 1) - alt(x, y - 1); const n = new THREE.Vector3(-dx * 1.6, dy * 1.6, 1).normalize(), i = (y * t + x) * 4; img.data[i] = (n.x * .5 + .5) * 255; img.data[i + 1] = (n.y * .5 + .5) * 255; img.data[i + 2] = (n.z * .5 + .5) * 255; img.data[i + 3] = 255; }
      g.putImageData(img, 0, 0); const tx = new THREE.CanvasTexture(c); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; return tx;
    })(),
    penhasco: textura((g, t) => {
      g.fillStyle = '#5a4a3a'; g.fillRect(0, 0, t, t);
      for (let i = 0; i < 26; i++) { const y = Math.random() * t, v = 70 + Math.random() * 50; g.fillStyle = `rgb(${v + 10},${v},${v - 12})`; g.fillRect(0, y, t, 3 + Math.random() * 10); }
      for (let i = 0; i < 40; i++) { g.strokeStyle = '#00000040'; g.lineWidth = 1 + Math.random() * 2; g.beginPath(); let x = Math.random() * t, y = Math.random() * t; g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (Math.random() - .5) * 30; y += Math.random() * 20; g.lineTo(x, y); } g.stroke(); }
      salpicar(g, t, 600, ['#00000030', '#ffffff14', '#7a6a5a'], .5, 2);
      const gr = g.createLinearGradient(0, 0, 0, 22); gr.addColorStop(0, '#3f6a2a'); gr.addColorStop(1, '#3f6a2a00'); g.fillStyle = gr; g.fillRect(0, 0, t, 22);
    }, 256),
    tronco: textura((g, t) => { g.fillStyle = '#5a3a20'; g.fillRect(0, 0, t, t); for (let i = 0; i < 60; i++) { g.strokeStyle = i % 2 ? '#3e2814' : '#6e4a2a'; g.lineWidth = 1 + Math.random() * 2; const x = Math.random() * t; g.beginPath(); g.moveTo(x, 0); for (let y = 0; y <= t; y += 8) g.lineTo(x + Math.sin(y / 11 + i) * 2, y); g.stroke(); } }),
    leito: textura((g, t) => { g.fillStyle = '#163240'; g.fillRect(0, 0, t, t); salpicar(g, t, 80, ['#1f4556', '#0f2530'], 2, 6); }),
    agua: textura((g, t) => { g.fillStyle = '#2f7fa8'; g.fillRect(0, 0, t, t); g.strokeStyle = '#8fd3f0'; g.lineWidth = 2.5; for (let k = 0; k < 4; k++) { g.beginPath(); const y = 12 + k * 32; g.moveTo(0, y); for (let x = 0; x <= t; x += 4) g.lineTo(x, y + Math.sin((x / t) * Math.PI * 4 + k) * 4); g.stroke(); } }),
    aguaNormal: (() => {
      const t = 256, c = document.createElement('canvas'); c.width = c.height = t; const g = c.getContext('2d'), img = g.createImageData(t, t);
      const h = (x, y) => Math.sin((x + y * .3) / t * Math.PI * 6) * .5 + Math.sin((x * .7 - y) / t * Math.PI * 10) * .3 + Math.sin((x * 1.3 + y * 1.1) / t * Math.PI * 16) * .2;
      for (let y = 0; y < t; y++) for (let x = 0; x < t; x++) {
        const dx = h(x + 1, y) - h(x - 1, y), dy = h(x, y + 1) - h(x, y - 1), n = new THREE.Vector3(-dx * 2.2, -dy * 2.2, 1).normalize(), i = (y * t + x) * 4;
        img.data[i] = (n.x * .5 + .5) * 255; img.data[i + 1] = (n.y * .5 + .5) * 255; img.data[i + 2] = (n.z * .5 + .5) * 255; img.data[i + 3] = 255;
      }
      g.putImageData(img, 0, 0); const tx = new THREE.CanvasTexture(c); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; return tx;
    })(),
    mesa: textura((g, t) => { g.fillStyle = '#24170e'; g.fillRect(0, 0, t, t); for (let i = 0; i < 40; i++) { g.strokeStyle = i % 3 ? '#2e1e12' : '#1a1009'; g.lineWidth = 1 + Math.random() * 2; g.beginPath(); const y = Math.random() * t; g.moveTo(0, y); for (let x = 0; x <= t; x += 8) g.lineTo(x, y + Math.sin(x / 20 + i) * 2); g.stroke(); } }, 256),
  };
}

export function criarCena(el, cb = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .95;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  el.appendChild(renderer.domElement);
  renderer.domElement.style.touchAction = 'none';

  const cena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  cena.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  const camera = new THREE.PerspectiveCamera(40, 1, .1, 300);
  const controles = new OrbitControls(camera, renderer.domElement);
  controles.enableDamping = true; controles.dampingFactor = .12;
  controles.maxPolarAngle = 1.32; controles.minDistance = 3; controles.maxDistance = 70;
  controles.mouseButtons = { LEFT: -1, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE };
  controles.touches = { ONE: -1, TWO: THREE.TOUCH.DOLLY_ROTATE };
  controles.screenSpacePanning = false;

  const tex = fazerTexturas();
  const grupoTerreno = new THREE.Group(), grupoTokens = new THREE.Group(), grupoEfeitos = new THREE.Group(), grupoDados = new THREE.Group();
  cena.add(grupoTerreno, grupoTokens, grupoEfeitos, grupoDados);

  // luzes
  const hemi = new THREE.HemisphereLight('#fff', '#333', 1); cena.add(hemi);
  const amb = new THREE.AmbientLight('#ffffff', .2); cena.add(amb);
  const criarDir = cor => { const l = new THREE.DirectionalLight(cor, 1); l.castShadow = true; l.shadow.mapSize.set(2048, 2048); l.shadow.bias = -.0006; l.shadow.normalBias = .02; cena.add(l, l.target); return l; };
  const kael = criarDir('#ffd28a'), lyra = criarDir('#7aa4ff');
  const luzLua = new THREE.DirectionalLight('#ffffff', 0); cena.add(luzLua, luzLua.target);

  let mesa = null, chaveTerreno = '', agua = null, chamas = [], selecaoAnel = null;
  const tokens = new Map(), dados = [], pings = [];
  let alcanceMesh = null;

  // ----------- terreno -----------
  function limpar(grupo) {
    grupo.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.isInstancedMesh) o.dispose?.(); });
    grupo.clear();
  }
  const nivel = (x, y) => nivelEm(mesa, x, y);
  const baseNivel = n => (n + 1) * NIVEL_H;                // topo do "chão" daquele nível (antes do piso)
  function alturaEm(x, y) {
    if (!mesa) return NIVEL_H + .12;
    const c = (mesa.grid[y] || '')[x];
    return baseNivel(nivel(x, y)) + (c === '~' ? .1 : (ALTURA[c] ?? .12));
  }
  let alvosClique = [];
  const ehParede = c => !!PAREDES[c];
  // UV proporcional ao tamanho de cada face (tijolos do mesmo tamanho em qualquer peça)
  function caixaUV(w, h, d, escala = 1) {
    const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv;
    const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] * escala, uv.getY(i) * dims[f][1] * escala); }
    return g;
  }
  function construirTerreno() {
    limpar(grupoTerreno); chamas = []; agua = null; alvosClique = [];
    const C = mesa.cols, R = mesa.rows, porTipo = {};
    for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) {
      const c = TERRENOS[mesa.grid[y][x]] ? mesa.grid[y][x] : '.';
      (porTipo[c] ||= []).push([x, y]);
    }
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), cor = new THREE.Color(), up = new THREE.Vector3(0, 1, 0), um = new THREE.Vector3(1, 1, 1);
    // 1) corpo do terreno (penhascos): uma coluna por casa, do tabuleiro até o nível dela
    const porAltura = {};
    for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) (porAltura[nivel(x, y) + 1] ||= []).push([x, y]);
    for (const [k, cels] of Object.entries(porAltura)) {
      const n = Number(k); if (!n) continue;
      const h = n * NIVEL_H, t = tex.penhasco.clone(); t.needsUpdate = true; t.repeat.set(1, n * .5);
      const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, h, 1), new THREE.MeshStandardMaterial({ map: t, roughness: .95 }), cels.length);
      cels.forEach(([x, y], i) => { m4.compose(new THREE.Vector3(x + .5, h / 2, y + .5), q.identity(), um); inst.setMatrixAt(i, m4); cor.setScalar(.85 + acaso(x, y, 7) * .25); inst.setColorAt(i, cor); });
      inst.receiveShadow = inst.castShadow = true; grupoTerreno.add(inst); alvosClique.push(inst);
    }
    // 2) piso de cada tipo de terreno, por cima do nível
    for (const [tipo, celulas] of Object.entries(porTipo)) {
      const h = ALTURA[tipo] ?? .12;
      const geo = new THREE.BoxGeometry(1, h, 1);
      const material = new THREE.MeshStandardMaterial({ map: tex[TEXTURA_DE[tipo]] || tex.terra, roughness: tipo === 'v' ? .12 : .92, metalness: tipo === 'v' ? .5 : 0 });
      const inst = new THREE.InstancedMesh(geo, material, celulas.length);
      celulas.forEach(([x, y], i) => {
        q.setFromAxisAngle(up, Math.floor(acaso(x, y) * 4) * Math.PI / 2);
        m4.compose(new THREE.Vector3(x + .5, baseNivel(nivel(x, y)) + h / 2, y + .5), q, um);
        inst.setMatrixAt(i, m4);
        cor.setScalar(.88 + acaso(x, y, 3) * .22); inst.setColorAt(i, cor);
      });
      inst.receiveShadow = true;
      grupoTerreno.add(inst); alvosClique.push(inst);
    }
    // 3) água: superfície única, com ondas, espuma na margem e cor pela profundidade
    if (porTipo['~']) {
      const agu = new Set(porTipo['~'].map(([x, y]) => x + ',' + y));
      const molhado = (x, y, n) => agu.has(x + ',' + y) && nivel(x, y) === n;
      const S = 4, pos = [], costa = [], idx = [];
      for (const [x, y] of porTipo['~']) {
        const n = nivel(x, y), yy = baseNivel(n) + .1, base = pos.length / 3;
        for (let j = 0; j <= S; j++) for (let i = 0; i <= S; i++) {
          const fx = i / S, fz = j / S; pos.push(x + fx, yy, y + fz);
          let d = 1;
          if (!molhado(x - 1, y, n)) d = Math.min(d, fx); if (!molhado(x + 1, y, n)) d = Math.min(d, 1 - fx);
          if (!molhado(x, y - 1, n)) d = Math.min(d, fz); if (!molhado(x, y + 1, n)) d = Math.min(d, 1 - fz);
          if (!molhado(x - 1, y - 1, n)) d = Math.min(d, Math.hypot(fx, fz)); if (!molhado(x + 1, y - 1, n)) d = Math.min(d, Math.hypot(1 - fx, fz));
          if (!molhado(x - 1, y + 1, n)) d = Math.min(d, Math.hypot(fx, 1 - fz)); if (!molhado(x + 1, y + 1, n)) d = Math.min(d, Math.hypot(1 - fx, 1 - fz));
          costa.push(d);
        }
        for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) { const a0 = base + j * (S + 1) + i, a1 = a0 + 1, b0 = a0 + S + 1, b1 = b0 + 1; idx.push(a0, b0, a1, a1, b0, b1); }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('aCosta', new THREE.Float32BufferAttribute(costa, 1));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(pos.flatMap((v, i) => i % 3 === 1 ? [] : [v * .5]), 2));
      geo.setIndex(idx); geo.computeVertexNormals();
      const mat = new THREE.MeshPhysicalMaterial({ color: '#2a8fb0', transparent: true, opacity: .9, roughness: .04, metalness: 0, normalMap: tex.aguaNormal, normalScale: new THREE.Vector2(.35, .35), clearcoat: 1, clearcoatRoughness: .05, ior: 1.33, specularIntensity: 1, depthWrite: false });
      mat.onBeforeCompile = sh => {
        sh.uniforms.uTempo = TEMPO;
        sh.vertexShader = 'uniform float uTempo; attribute float aCosta; varying float vCosta; varying vec3 vMundo;\n' + sh.vertexShader
          .replace('#include <begin_vertex>', `#include <begin_vertex>
            vCosta = aCosta;
            vec3 pm = (modelMatrix * vec4(transformed, 1.0)).xyz; vMundo = pm;
            transformed.y += (sin(pm.x * 2.3 + uTempo * 1.6) * .5 + sin(pm.z * 3.1 - uTempo * 1.3) * .5) * .018 * smoothstep(0.0, .25, aCosta);`);
        sh.fragmentShader = 'uniform float uTempo; varying float vCosta; varying vec3 vMundo;\n' + sh.fragmentShader
          .replace('#include <normal_fragment_maps>', `
            vec3 n1 = texture2D(normalMap, vMundo.xz * .35 + vec2(uTempo * .03, uTempo * .017)).xyz * 2. - 1.;
            vec3 n2 = texture2D(normalMap, vMundo.xz * .62 - vec2(uTempo * .021, -uTempo * .028)).xyz * 2. - 1.;
            vec3 mapN = normalize(vec3((n1.xy + n2.xy) * normalScale, n1.z * n2.z));
            normal = normalize(tbn * mapN);`)
          .replace('#include <color_fragment>', `#include <color_fragment>
            float fundo = smoothstep(0.0, .5, vCosta);
            diffuseColor.rgb = mix(vec3(.25, .62, .6), vec3(.03, .2, .32), fundo);
            float ruido = sin(vMundo.x * 21. + uTempo * 2.) * sin(vMundo.z * 17. - uTempo * 1.7);
            float espuma = (1. - smoothstep(.03, .14 + ruido * .03, vCosta));
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.92, .96, .97), espuma * .85);
            diffuseColor.a = mix(.72, .93, fundo) + espuma * .1;`);
      };
      mat.customProgramCacheKey = () => 'agua2';
      const malha = new THREE.Mesh(geo, mat); malha.receiveShadow = true; malha.renderOrder = 2;
      grupoTerreno.add(malha); agua = mat; alvosClique.push(malha);
      if (temCenario()) porTipo['~'].forEach(([x, y]) => {
        const r0 = acaso(x, y, 60); if (r0 > .3) return;
        let perto = false; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!agu.has((x + dx) + ',' + (y + dy))) perto = true;
        const p = pecaCenario(r0 < .1 && perto ? 'planta_a' : r0 < .16 && perto ? 'planta_b' : acaso(x, y, 61) < .5 ? 'lirio_a' : 'lirio_b', .7);
        if (p) { p.position.set(x + .3 + acaso(x, y, 62) * .4, baseNivel(nivel(x, y)) + .1, y + .3 + acaso(x, y, 63) * .4); p.rotation.y = acaso(x, y, 64) * 6.3; grupoTerreno.add(p); }
      });
    }
    const chaoDe = (x, y) => baseNivel(nivel(x, y)) + (ALTURA[mesa.grid[y][x]] ?? .12);
    // 4) objetos (barris, caixotes, tenda…)
    if (temCenario()) for (const [ch, nomes] of Object.entries(OBJETOS)) for (const [x, y] of porTipo[ch] || []) {
      const p = pecaCenario(nomes[Math.floor(acaso(x, y, 70) * nomes.length)], 1);
      if (p) { p.position.set(x + .5, chaoDe(x, y), y + .5); p.rotation.y = Math.floor(acaso(x, y, 71) * 4) * Math.PI / 2 + (acaso(x, y, 72) - .5) * .4; grupoTerreno.add(p); }
    }
    // 5) vegetação de alta qualidade
    const plantar = (lista, nomes, altura, k0, caber = 1.15) => {
      for (const [x, y] of lista) {
        const nome = nomes[Math.floor(acaso(x, y, k0) * nomes.length)];
        const p = temNatureza() ? pecaNatureza(nome, altura * (.85 + acaso(x, y, k0 + 1) * .35), caber) : null;
        if (!p) continue;
        p.position.set(x + .5 + (acaso(x, y, k0 + 2) - .5) * .2, chaoDe(x, y), y + .5 + (acaso(x, y, k0 + 3) - .5) * .2);
        p.rotation.y = acaso(x, y, k0 + 4) * 6.3; grupoTerreno.add(p);
      }
    };
    const temNat = temNatureza();
    if (temNat) {
      plantar(porTipo['T'] || [], ['normaltree_1', 'normaltree_2', 'normaltree_3', 'normaltree_4', 'normaltree_5', 'mapletree_1', 'birchtree_1', 'normaltree_3'], 2.3, 80, 1.5);
      plantar(porTipo['P'] || [], ['pinetree_1', 'pinetree_2', 'pinetree_3', 'pinetree_5'], 2.6, 84, 1.3);
      plantar(porTipo['Q'] || [], ['deadtree_1', 'deadtree_2', 'deadtree_3'], 2.0, 88, 1.4);
      plantar(porTipo['k'] || [], ['bush', 'bush_flowers', 'bush_large', 'bush_small'], .6, 92, 1);
      // mato: tufos de grama e flores espalhados
      for (const [x, y] of [...(porTipo['"'] || []), ...(porTipo['T'] || []), ...(porTipo['P'] || [])]) for (let k = 0; k < 2; k++) {
        const r0 = acaso(x, y, 100 + k); if (r0 > .55) continue;
        const nome = r0 < .3 ? 'grass_small' : r0 < .42 ? 'grass_large' : r0 < .5 ? 'flower_3_clump' : 'flower_4_clump';
        const p = pecaNatureza(nome, nome.startsWith('grass') ? .22 : .2, .5); if (!p) continue;
        p.position.set(x + .15 + acaso(x, y, 110 + k) * .7, chaoDe(x, y), y + .15 + acaso(x, y, 120 + k) * .7); p.rotation.y = acaso(x, y, 130 + k) * 6.3; p.traverse(o => { o.castShadow = false; }); grupoTerreno.add(p);
      }
      // rochas
      for (const [x, y] of porTipo['^'] || []) for (let k = 0; k < 2; k++) {
        const p = pecaNatureza('rock_' + (1 + Math.floor(acaso(x, y, 90 + k) * 5)), k ? .3 + acaso(x, y, 92) * .2 : .55 + acaso(x, y, 93) * .35, k ? .5 : 1); if (!p) continue;
        p.position.set(x + .5 + (k ? (acaso(x, y, 94) - .5) * .6 : 0), chaoDe(x, y), y + .5 + (k ? (acaso(x, y, 95) - .5) * .6 : 0)); p.rotation.y = acaso(x, y, 96) * 6.3; grupoTerreno.add(p);
      }
    } else {
      // reserva enquanto os modelos carregam
      const arv = [...(porTipo['T'] || []), ...(porTipo['P'] || []), ...(porTipo['Q'] || []), ...(porTipo['k'] || []), ...(porTipo['^'] || [])];
      if (arv.length) {
        const cone = new THREE.InstancedMesh(new THREE.ConeGeometry(.35, 1.1, 7), new THREE.MeshStandardMaterial({ color: '#2f6a2a', roughness: .9, flatShading: true }), arv.length);
        arv.forEach(([x, y], i) => { m4.compose(new THREE.Vector3(x + .5, chaoDe(x, y) + .55, y + .5), q.identity(), um); cone.setMatrixAt(i, m4); });
        cone.castShadow = true; grupoTerreno.add(cone);
      }
    }
    // 6) paredes: segmentos que se ligam aos vizinhos (muro, paliçada, muro baixo)
    const pedacos = { muro: [], tronco: [], topo: [] };
    const liga = (x, y) => { const c = (mesa.grid[y] || '')[x]; return ehParede(c) || c === '+'; };
    const tronco = new THREE.CylinderGeometry(.07, .08, 1, 7);
    const ponta = new THREE.ConeGeometry(.075, .16, 7);
    for (const tipo of Object.keys(PAREDES)) for (const [x, y] of porTipo[tipo] || []) {
      const P = PAREDES[tipo], y0 = chaoDe(x, y), cx = x + .5, cz = y + .5;
      const viz = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => liga(x + dx, y + dy));
      const reto = viz.length === 2 && viz[0][0] === -viz[1][0] && viz[0][1] === -viz[1][1];
      if (tipo === 'm') {
        // paliçada: troncos lado a lado com ponta
        const braços = viz.length ? viz : [[1, 0], [-1, 0]];
        const pontos = [[0, 0]];
        for (const [dx, dy] of braços) for (let i = 1; i <= 3; i++) pontos.push([dx * i * .16, dy * i * .16]);
        for (const [ox, oz] of pontos) {
          const h = P.h * (.88 + acaso(Math.round((x + ox) * 50), Math.round((y + oz) * 50), 5) * .2);
          const g1 = tronco.clone(); g1.scale(1, h, 1); g1.translate(cx + ox, y0 + h / 2, cz + oz); pedacos.tronco.push(g1);
          const g2 = ponta.clone(); g2.translate(cx + ox, y0 + h + .08, cz + oz); pedacos.tronco.push(g2);
        }
        continue;
      }
      const t = P.t, h = P.h;
      const post = !reto ? t * 1.2 : t;
      const gp = caixaUV(post, h, post, 1.6); gp.translate(cx, y0 + h / 2, cz); pedacos.muro.push(gp);
      const gt = caixaUV(post + .08, .08, post + .08, 1.6); gt.translate(cx, y0 + h + .04, cz); pedacos.topo.push(gt);
      for (const [dx, dy] of viz) {
        const l = .5, w = dx ? l : t, d = dy ? l : t;
        const ga = caixaUV(w, h, d, 1.6); ga.translate(cx + dx * l / 2, y0 + h / 2, cz + dy * l / 2); pedacos.muro.push(ga);
        const gc = caixaUV(dx ? l : t + .06, .07, dy ? l : t + .06, 1.6); gc.translate(cx + dx * l / 2, y0 + h + .035, cz + dy * l / 2); pedacos.topo.push(gc);
      }
    }
    const matMuro = new THREE.MeshStandardMaterial({ map: tex.muro, normalMap: tex.muroNormal, normalScale: new THREE.Vector2(.8, .8), roughness: .88 });
    const matTopo = new THREE.MeshStandardMaterial({ color: '#8a8378', map: tex.muro, roughness: .8 });
    const matTronco = new THREE.MeshStandardMaterial({ map: tex.tronco, roughness: .92 });
    for (const [k, mat] of [['muro', matMuro], ['topo', matTopo], ['tronco', matTronco]]) {
      if (!pedacos[k].length) continue;
      const geo = mergeGeometries(pedacos[k].map(g => g.index ? g.toNonIndexed() : g), false); pedacos[k].forEach(g => g.dispose());
      const malha = new THREE.Mesh(geo, mat); malha.castShadow = malha.receiveShadow = true; grupoTerreno.add(malha);
    }
    // portas: batentes
    for (const [x, y] of porTipo['+'] || []) {
      const y0 = chaoDe(x, y);
      const lateral = liga(x - 1, y) || liga(x + 1, y);
      const madeira = new THREE.MeshStandardMaterial({ map: tex.tronco, color: '#a07a5a', roughness: .9 });
      const add = (w, h, d, px, py, pz) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), madeira); o.position.set(px, y0 + py, pz); o.castShadow = o.receiveShadow = true; grupoTerreno.add(o); };
      if (lateral) { add(.12, 1.3, .36, x + .06, .65, y + .5); add(.12, 1.3, .36, x + .94, .65, y + .5); add(1, .14, .38, x + .5, 1.36, y + .5); }
      else { add(.36, 1.3, .12, x + .5, .65, y + .06); add(.36, 1.3, .12, x + .5, .65, y + .94); add(.38, .14, 1, x + .5, 1.36, y + .5); }
    }
    // 7) fogueiras
    let luzes = 0;
    for (const [x, y] of porTipo['*'] || []) {
      const g = new THREE.Group(); g.position.set(x + .5, chaoDe(x, y), y + .5);
      const pedraMat = new THREE.MeshStandardMaterial({ color: '#6b6560', roughness: .9, flatShading: true });
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; const p = new THREE.Mesh(new THREE.DodecahedronGeometry(.07, 0), pedraMat); p.position.set(Math.cos(a) * .28, .04, Math.sin(a) * .28); p.castShadow = true; g.add(p); }
      for (let k = 0; k < 3; k++) { const t = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, .45, 6), new THREE.MeshStandardMaterial({ color: '#3a2412', roughness: 1 })); t.rotation.z = Math.PI / 2; t.rotation.y = k * Math.PI / 3; t.position.y = .05; g.add(t); }
      const f1 = new THREE.Mesh(new THREE.ConeGeometry(.16, .5, 7), new THREE.MeshStandardMaterial({ color: '#ff7a1e', emissive: '#ff5a0a', emissiveIntensity: 2.2, transparent: true, opacity: .9 }));
      const f2 = new THREE.Mesh(new THREE.ConeGeometry(.08, .3, 6), new THREE.MeshStandardMaterial({ color: '#ffe08a', emissive: '#ffd060', emissiveIntensity: 2.5 }));
      f1.position.y = .28; f2.position.y = .2; g.add(f1, f2); chamas.push([f1, f2, x * 7 + y]);
      if (luzes++ < 6) { const pl = new THREE.PointLight('#ff9a3a', 2.2, 6, 1.6); pl.position.y = .6; g.add(pl); chamas.push([pl, null, x + y]); }
      grupoTerreno.add(g);
    }
    // 8) grade, acompanhando a altura de cada casa
    const pts = [];
    for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) {
      const c = mesa.grid[y][x]; if (ehParede(c) && c !== 'h') continue;
      const yy = chaoDe(x, y) + .006;
      pts.push(x, yy, y, x + 1, yy, y, x, yy, y, x, yy, y + 1);
      if (x === C - 1) pts.push(x + 1, yy, y, x + 1, yy, y + 1);
      if (y === R - 1) pts.push(x, yy, y + 1, x + 1, yy, y + 1);
    }
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    grupoTerreno.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: '#000000', transparent: true, opacity: .2 })));
    // 9) mesa de madeira ao redor
    const tm = tex.mesa.clone(); tm.needsUpdate = true; tm.repeat.set((C + 16) / 4, (R + 16) / 4);
    const chao = new THREE.Mesh(new THREE.PlaneGeometry(C + 16, R + 16), new THREE.MeshStandardMaterial({ map: tm, roughness: .8 }));
    chao.rotation.x = -Math.PI / 2; chao.position.set(C / 2, -.005, R / 2); chao.receiveShadow = true; grupoTerreno.add(chao);
    const moldura = new THREE.Mesh(new THREE.BoxGeometry(C + .4, .1, R + .4), new THREE.MeshStandardMaterial({ color: '#3a2412', roughness: .7 }));
    moldura.position.set(C / 2, .03, R / 2); moldura.receiveShadow = true; grupoTerreno.add(moldura);
    for (const l of [kael, lyra]) { const s = Math.max(C, R) * .75; Object.assign(l.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: .5, far: 120 }); l.shadow.camera.updateProjectionMatrix(); }
  }

  function aplicarCeu(luz, lua) {
    const c = CEUS[luz] || CEUS.dia, alvo = new THREE.Vector3(mesa.cols / 2, 0, mesa.rows / 2), d = Math.max(mesa.cols, mesa.rows) * 1.2;
    cena.background = new THREE.Color(c.fundo); cena.environmentIntensity = c.env;
    cena.fog = new THREE.Fog(c.nevoa, d * 1.6, d * 3.5);
    hemi.color.set(c.hemi[0]); hemi.groundColor.set(c.hemi[1]); hemi.intensity = c.hemi[2]; amb.intensity = c.amb;
    for (const [l, cfg] of [[kael, c.kael], [lyra, c.lyra]]) {
      l.intensity = cfg[0]; l.visible = cfg[0] > 0; l.castShadow = cfg[0] > 0;
      if (cfg[1]) { l.position.set(alvo.x + cfg[1][0] * d, cfg[1][1] * d, alvo.z + cfg[1][2] * d); l.target.position.copy(alvo); }
    }
    const corLua = lua === 'triade' ? '#d0b0ff' : LUAS[lua];
    luzLua.visible = !!corLua && luz !== 'dia';
    if (luzLua.visible) { luzLua.color.set(corLua); luzLua.intensity = c.luaForte ? .9 : .45; luzLua.position.set(alvo.x + d * .3, d, alvo.z - d * .6); luzLua.target.position.copy(alvo); }
    else if (luz === 'noite') { luzLua.visible = true; luzLua.color.set('#8090c0'); luzLua.intensity = .35; luzLua.position.set(alvo.x, d, alvo.z - d * .5); luzLua.target.position.copy(alvo); }
  }

  function enquadrar() {
    const cx = mesa.cols / 2, cz = mesa.rows / 2, d = Math.max(mesa.cols, mesa.rows);
    controles.target.set(cx, 0, cz);
    camera.position.set(cx, d * .55, cz + d * .62);
    controles.update();
  }

  // ----------- tokens -----------
  function barraVida(fr) {
    const c = document.createElement('canvas'); c.width = 64; c.height = 10; const g = c.getContext('2d');
    g.fillStyle = '#000000b0'; g.fillRect(0, 0, 64, 10);
    g.fillStyle = fr > .5 ? '#5d9a4a' : fr > 0 ? '#e0a23a' : '#c0392f'; g.fillRect(1, 1, 62 * Math.max(0, Math.min(1, fr)), 8);
    const t = new THREE.CanvasTexture(c);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false })); s.scale.set(.6, .09, 1); s.renderOrder = 11;
    return s;
  }
  function atualizarTokens(lista, selecionado) {
    const vistos = new Set();
    for (const t of lista) {
      vistos.add(t.k);
      const tam = Math.max(1, t.tamanho || 1);
      const chave = JSON.stringify([t.aparencia, t.raca, t.cristal, tam, t.nome, t.oculto]);
      let tk = tokens.get(t.k);
      if (!tk || tk.chave !== chave) {
        if (tk) { grupoTokens.remove(tk.g); limpar(tk.g); }
        const g = new THREE.Group(); g.userData.k = t.k;
        const criatura3d = t.raca === 'criatura' && CRIATURAS_3D[t.aparencia?.criatura];
        const usar3d = modelosProntos() && (t.raca !== 'criatura' || criatura3d);
        const mini = !usar3d ? criarMiniatura(t.aparencia || {}, t.raca || 'sarthani', { cristal: t.cristal, tamanho: tam })
          : criatura3d ? criarCriatura3D(t.aparencia.criatura, { tamanho: tam, base: t.aparencia.base })
          : criarPersonagem(t.aparencia || {}, t.raca || 'sarthani', { cristal: t.cristal, tamanho: tam });
        if (t.oculto) mini.traverse(o => { if (o.material) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = .4; } });
        g.add(mini);
        const nome = rotulo(t.nome || '?', t.corNome || '#ffe9b8', 'rgba(10,8,6,.75)', .27 * Math.sqrt(tam));
        nome.position.y = mini.userData.altura + .2; g.add(nome);
        g.traverse(o => { o.userData.k = t.k; });
        tk = { g, chave, mini, pers: mini.userData.personagem || null, alturaMini: mini.userData.altura, fr: null, barra: null, anim: null, x: t.x, y: t.y, vigor: t.vigor };
        if (tk.pers && t.mostrarVida && t.vigorMax && t.vigor <= 0) tk.pers.tocar('caido');
        tokens.set(t.k, tk); grupoTokens.add(g);
        tk.imb = null;
        g.position.set(t.x + tam / 2, alturaEm(t.x, t.y), t.y + tam / 2);
      }
      // Dom na arma
      const imb = t.imbuir ? t.imbuir.cor + t.imbuir.estilo : null;
      if (tk.pers?.imbuir && imb !== tk.imb) { tk.pers.imbuir(t.imbuir?.cor, t.imbuir?.estilo); tk.imb = imb; }
      // vida
      const fr = t.mostrarVida && t.vigorMax ? t.vigor / t.vigorMax : null;
      if (tk.pers && t.vigor !== tk.vigor && tk.vigor !== undefined && t.vigorMax) {
        if (t.vigor <= 0 && tk.vigor > 0) tk.pers.tocar('morte');
        else if (t.vigor < tk.vigor) tk.pers.tocar('dano');
        else if (t.vigor > 0 && tk.vigor <= 0) tk.pers.tocar('parado');
      }
      tk.vigor = t.vigor;
      if (fr !== tk.fr) {
        if (tk.barra) { tk.g.remove(tk.barra); tk.barra.material.map.dispose(); }
        tk.barra = fr === null ? null : barraVida(fr);
        if (tk.barra) { tk.barra.position.y = tk.alturaMini + .06; tk.g.add(tk.barra); }
        tk.fr = fr;
      }
      // movimento
      if (tk.x !== t.x || tk.y !== t.y) {
        const de = tk.g.position.clone(), para = new THREE.Vector3(t.x + tam / 2, alturaEm(t.x, t.y), t.y + tam / 2);
        const dist = de.distanceTo(para), correr = dist > 3.5;
        tk.anim = { de, para, t0: performance.now(), dur: tk.pers ? Math.min(4000, dist * (correr ? 260 : 520)) : Math.min(900, 220 + dist * 90) };
        if (tk.pers && (tk.vigor === undefined || tk.vigor > 0 || !t.vigorMax)) tk.pers.tocar(correr ? 'correr' : 'andar');
        tk.mini.rotation.y = Math.atan2(para.x - de.x, para.z - de.z);
        tk.x = t.x; tk.y = t.y;
      }
    }
    for (const [k, tk] of tokens) if (!vistos.has(k)) { grupoTokens.remove(tk.g); limpar(tk.g); tokens.delete(k); }
    // seleção
    if (!selecaoAnel) {
      selecaoAnel = new THREE.Mesh(new THREE.TorusGeometry(.5, .025, 6, 40), new THREE.MeshBasicMaterial({ color: '#ffd76a' }));
      selecaoAnel.rotation.x = Math.PI / 2;
    }
    const sel = tokens.get(selecionado);
    if (sel) { sel.g.add(selecaoAnel); selecaoAnel.position.y = .09; } else if (selecaoAnel.parent) selecaoAnel.parent.remove(selecaoAnel);
  }

  function mostrarAlcance(alcance) {
    if (alcanceMesh) { grupoEfeitos.remove(alcanceMesh); alcanceMesh.geometry.dispose(); alcanceMesh = null; }
    if (!alcance || !alcance.size) return;
    const celulas = [...alcance.entries()].filter(([, d]) => d > 0);
    alcanceMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(.86, .86), new THREE.MeshBasicMaterial({ color: '#ffd76a', transparent: true, opacity: .28, depthWrite: false }), celulas.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
    celulas.forEach(([key], i) => { const [x, y] = key.split(',').map(Number); m4.compose(new THREE.Vector3(x + .5, alturaEm(x, y) + .02, y + .5), q, new THREE.Vector3(1, 1, 1)); alcanceMesh.setMatrixAt(i, m4); });
    grupoEfeitos.add(alcanceMesh);
  }

  function ping(x, y, cor) {
    const m = new THREE.Mesh(new THREE.RingGeometry(.3, .4, 32), new THREE.MeshBasicMaterial({ color: cor, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(x + .5, alturaEm(x, y) + .05, y + .5);
    grupoEfeitos.add(m); pings.push({ m, t0: performance.now() });
  }

  // ----------- dados -----------
  function rolar(ev) {
    const centro = controles.target.clone(); centro.y = 0;
    const lista = (ev.dados || []).slice(0, 20);
    const resultado = [];
    lista.forEach((d, i) => {
      const cor = d.c === 'lyra' || d.papel === 'lyra' ? ev.lyra : d.c === 'tirith' ? '#e9edf2' : ev.kael;
      const m = criarDado(d.f, cor, ev.material); m.scale.setScalar(.3);
      const ang = Math.random() * Math.PI * 2;
      m.position.set(centro.x + Math.cos(ang) * 3, 3.2 + i * .25, centro.z + Math.sin(ang) * 3);
      const destino = new THREE.Vector3(centro.x + (i - (lista.length - 1) / 2) * .85 + (Math.random() - .5) * .4, 0, centro.z + (Math.random() - .5) * .8);
      const vel = destino.clone().sub(m.position).setY(0).multiplyScalar(1.4); vel.y = 1.5;
      const ang2 = new THREE.Vector3((Math.random() - .5) * 26, (Math.random() - .5) * 26, (Math.random() - .5) * 26);
      grupoDados.add(m);
      const reg = { m, vel, ang2, t0: performance.now(), parado: false, valor: d.v, fora: d.fora, rot: null };
      dados.push(reg); resultado.push(reg);
    });
    return new Promise(res => setTimeout(() => res(resultado.length ? resultado[0].m.position.clone() : centro), 1500));
  }
  function simularDados(dt, agora) {
    for (let i = dados.length - 1; i >= 0; i--) {
      const d = dados[i], idade = (agora - d.t0) / 1000;
      if (!d.parado) {
        d.vel.y -= 16 * dt;
        d.m.position.addScaledVector(d.vel, dt);
        const chao = (mesa ? alturaEm(Math.floor(d.m.position.x), Math.floor(d.m.position.z)) : .62) + .3;
        if (d.m.position.y < chao) {
          d.m.position.y = chao; d.vel.y = Math.abs(d.vel.y) * .42; d.vel.x *= .62; d.vel.z *= .62; d.ang2.multiplyScalar(.6);
          if (Math.abs(d.vel.y) < .5) d.vel.y = 0;
        }
        d.m.rotation.x += d.ang2.x * dt; d.m.rotation.y += d.ang2.y * dt; d.m.rotation.z += d.ang2.z * dt;
        if (idade > 1.35) {
          d.parado = true; d.m.position.y = chao;
          const r = rotulo(String(d.valor), '#ffffff', 'rgba(10,8,6,.85)', .42); r.position.copy(d.m.position); r.position.y += .62; grupoDados.add(r); d.rot = r;
          if (d.fora) { d.m.material.transparent = true; d.m.material.opacity = .3; r.material.opacity = .45; }
        }
      }
      if (idade > 7) {
        grupoDados.remove(d.m); d.m.material.dispose(); if (d.rot) { grupoDados.remove(d.rot); d.rot.material.map.dispose(); }
        dados.splice(i, 1);
      } else if (idade > 6.2) {
        const a = 1 - (idade - 6.2) / .8; d.m.material.transparent = true; d.m.material.opacity = Math.min(d.m.material.opacity, a); if (d.rot) d.rot.material.opacity = a;
      }
    }
  }

  // ----------- entrada -----------
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), -.15), ponto = new THREE.Vector3();
  let toques = 0;
  function info(ev) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    let k = null;
    const dono = o => { while (o && !o.userData.k) o = o.parent; return o?.userData.k; };
    const hit = ray.intersectObjects(grupoTokens.children, true).find(h => dono(h.object));
    if (hit) k = dono(hit.object);
    const chao = alvosClique.length ? ray.intersectObjects(alvosClique, false)[0] : null;
    if (chao) { ponto.copy(chao.point); if (chao.face) ponto.addScaledVector(chao.face.normal, -.01); }
    else ray.ray.intersectPlane(plano, ponto);
    return { k, x: Math.floor(ponto.x), y: Math.floor(ponto.z) };
  }
  const dom = renderer.domElement;
  dom.addEventListener('contextmenu', e => e.preventDefault());
  dom.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') toques++; if (e.button !== 0 || toques > 1) { if (toques > 1) cb.cancelar?.(); return; } cb.down?.(info(e), e); });
  dom.addEventListener('pointermove', e => { if (toques > 1) return; cb.move?.(info(e), e); });
  dom.addEventListener('pointerup', e => { if (e.pointerType === 'touch') toques = Math.max(0, toques - 1); if (e.button !== 0) return; cb.up?.(info(e), e); });
  dom.addEventListener('pointercancel', e => { if (e.pointerType === 'touch') toques = Math.max(0, toques - 1); cb.cancelar?.(); });
  dom.addEventListener('dblclick', e => cb.dbl?.(info(e), e));

  // ----------- laço -----------
  const relogio = new THREE.Clock();
  const ro = new ResizeObserver(() => { const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); });
  ro.observe(el);
  let ativo = true, pausado = false, quadros = 0, inicioMedida = performance.now(), qualidadeReduzida = false;
  function medirDesempenho(agora) {
    quadros++;
    if (qualidadeReduzida || agora - inicioMedida < 3000) return;
    const fps = quadros * 1000 / (agora - inicioMedida);
    quadros = 0; inicioMedida = agora;
    if (fps < 24) {
      // aparelho fraco: menos pixels e sombras mais leves
      qualidadeReduzida = true;
      renderer.setPixelRatio(1);
      renderer.shadowMap.type = THREE.PCFShadowMap;
      for (const l of [kael, lyra]) { l.shadow.mapSize.set(1024, 1024); l.shadow.map?.dispose(); l.shadow.map = null; }
      renderer.setSize(el.clientWidth, el.clientHeight);
    }
  }
  function laco() {
    if (!ativo) return;
    requestAnimationFrame(laco);
    if (pausado) return;
    const dt = Math.min(.05, relogio.getDelta()), agora = performance.now(), t = agora / 1000;
    medirDesempenho(agora);
    controles.update();
    TEMPO.value = t;
    for (const [a, b, s] of chamas) {
      if (a.isPointLight) a.intensity = 1.9 + Math.sin(t * 9 + s) * .3 + Math.sin(t * 23 + s) * .2;
      else { const f = 1 + Math.sin(t * 12 + s) * .08 + Math.sin(t * 27 + s) * .05; a.scale.set(1, f, 1); b.scale.set(1, 2 - f, 1); a.rotation.y = t * 2; }
    }
    for (const tk of tokens.values()) {
      if (tk.anim) {
        const p = Math.min(1, (agora - tk.anim.t0) / tk.anim.dur), e = p < .5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
        tk.g.position.lerpVectors(tk.anim.de, tk.anim.para, e);
        if (!tk.pers) tk.g.position.y += Math.sin(p * Math.PI) * .35;
        if (p >= 1) { tk.anim = null; if (tk.pers && (tk.vigor === undefined || tk.vigor > 0)) tk.pers.tocar('parado'); }
      }
      const cr = tk.mini.getObjectByName('cristal'); if (cr) cr.rotation.y = t * 2;
      if (tk.pers) tk.pers.atualizar ? tk.pers.atualizar(dt) : tk.pers.mixer?.update(dt);
    }
    if (selecaoAnel?.parent) { selecaoAnel.rotation.z = t; selecaoAnel.scale.setScalar(1 + Math.sin(t * 4) * .04); }
    for (let i = pings.length - 1; i >= 0; i--) { const p = pings[i], a = (agora - p.t0) / 1400; p.m.scale.setScalar(1 + a * 3); p.m.material.opacity = 1 - a; if (a >= 1) { grupoEfeitos.remove(p.m); p.m.geometry.dispose(); pings.splice(i, 1); } }
    simularDados(dt, agora);
    renderer.render(cena, camera);
  }
  laco();

  let ultimo = null;
  carregarNatureza().then(() => { chaveTerreno = ''; if (ultimo) api.atualizar(ultimo); }).catch(e => console.warn('Natureza 3D indisponível.', e));
  carregarModelos().then(() => {
    chaveTerreno = '';
    for (const tk of tokens.values()) tk.chave = '';
    if (ultimo) api.atualizar(ultimo);
  }).catch(e => console.warn('Modelos 3D indisponíveis, usando miniaturas simples.', e));

  const api = {
    acao(k, nome) { tokens.get(k)?.pers?.tocar(nome); },
    atualizar(estado) {
      ultimo = estado;
      const { mesa: m, tokens: lista, selecionado, alcance } = estado;
      if (!m) return;
      const novaChave = m.cols + 'x' + m.rows + ':' + m.grid.join('');
      const tamanhoMudou = !mesa || mesa.cols !== m.cols || mesa.rows !== m.rows;
      mesa = m;
      if (novaChave !== chaveTerreno) { chaveTerreno = novaChave; construirTerreno(); }
      if (tamanhoMudou) enquadrar();
      aplicarCeu(m.luz, m.lua);
      atualizarTokens(lista || [], selecionado);
      mostrarAlcance(alcance);
    },
    rolar, ping,
    projetar(v) { const p = v.clone().project(camera), r = dom.getBoundingClientRect(); return { x: (p.x + 1) / 2 * r.width, y: (1 - p.y) / 2 * r.height }; },
    girar(ang) { const off = camera.position.clone().sub(controles.target); off.applyAxisAngle(new THREE.Vector3(0, 1, 0), ang); camera.position.copy(controles.target).add(off); },
    zoom(f) { const off = camera.position.clone().sub(controles.target).multiplyScalar(f); if (off.length() > 3 && off.length() < 70) camera.position.copy(controles.target).add(off); },
    focar(x, y) { const novo = new THREE.Vector3(x + .5, 0, y + .5), d = novo.clone().sub(controles.target); controles.target.add(d); camera.position.add(d); },
    enquadrar() { if (mesa) enquadrar(); },
    pausar(v) { pausado = !!v; if (!v) relogio.getDelta(); },
    destruir() { ativo = false; ro.disconnect(); controles.dispose(); renderer.dispose(); dom.remove(); },
  };
  return api;
}
