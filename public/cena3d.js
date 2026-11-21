// Cena 3D do tabuleiro: terreno, cenário, luzes de Kael e Lyra, miniaturas, dados.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TERRENOS, nivelEm } from './regras.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { construirSolo, carregarTexturasSolo, NIVEL_H as NIVEL_SOLO, MESA_Y } from './terreno.js';
import { criarMesaDeJogo, BORDA } from './mesajogo.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { criarMiniatura, criarDado, rotulo } from './miniatura.js';
import { criarEfeitos, criarChama } from './efeitos.js';
import { carregarModelos, carregarNatureza, criarPersonagem, criarCriatura3D, CRIATURAS_3D, pecaCenario, pecaNatureza, temCenario, temNatureza, modelosProntos, TEMPO } from './modelos.js';
// celular/tablet: céus 1k e chão 512 (memória de vídeo menor)
const TELA_FINA = matchMedia('(pointer: coarse)').matches;

// ---------- configuração fácil de editar ----------
const ALTURA = { '.': .12, '_': .16, ',': .1, '"': .14, '~': .04, '=': .17, '+': .16, 'v': .12, '#': .16, m: .12, h: .12, k: .14, P: .14, Q: .12, 'T': .14, '^': .12, '*': .12, b: .12, c: .12, s: .12, n: .14, a: .16, o: .14, w: .12 };
const NIVEL_H = NIVEL_SOLO; // altura de um nível de terreno
const PAREDES = { '#': { h: 1.7, t: .4, tex: 'muro' }, m: { h: 1.6, t: .3, tex: 'tronco' }, h: { h: .8, t: .42, tex: 'muro' } };
const OBJETOS = { b: ['barril'], c: ['caixote', 'caixotes'], s: ['saco'], n: ['tenda'], a: ['suporte_armas'], o: ['alvo'], w: ['carrinho', 'balde'] };
const TEXTURA_DE = { '.': 'terra', '_': 'ladrilho', ',': 'areia', '"': 'mato', '~': 'leito', '=': 'madeira', '+': 'madeira', 'v': 'vidro', '#': 'ladrilho', m: 'terra', h: 'terra', k: 'mato', P: 'mato', Q: 'terra', 'T': 'mato', '^': 'terra', '*': 'terra', b: 'terra', c: 'terra', s: 'terra', n: 'mato', a: 'ladrilho', o: 'mato', w: 'terra' };
// Céus: fotos 360° (HDRI da Poly Haven, CC0) iluminam a cena; as luzes de Kael e Lyra dão as sombras.
const CEUS = {
  dia: { hdr: 'quarry_01_1k', env: .75, fundo: .95, exp: .9, nevoa: '#c8c4b8', dens: .012, hemi: ['#fff1d6', '#4a3a28', .25], kael: [2.6, [-.55, .75, .4]], lyra: [0], amb: 0 },
  noite: { hdr: 'moonless_golf_1k', fundoCor: '#05070e', env: .35, fundo: .5, exp: 1, nevoa: '#0a0d18', dens: .02, hemi: ['#2a3350', '#0a0a10', .18], kael: [0], lyra: [0], amb: .03, luaForte: true },
  azul: { hdr: 'moonless_golf_1k', fundoCor: '#0b1f4a', env: .45, fundo: .55, exp: 1.05, nevoa: '#0c2350', dens: .018, hemi: ['#5f8cff', '#0a1430', .6], kael: [0], lyra: [2.4, [.7, 1, -.35]], amb: .05 },
  conjuncao: { hdr: 'venice_sunset_1k', env: .55, fundo: .8, exp: .95, nevoa: '#6a4a5a', dens: .014, hemi: ['#c0a0ff', '#20141a', .25], kael: [2, [-1, .42, .25]], lyra: [1.6, [1, .45, -.2]], amb: .03 },
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
  const hdrs = {}, carregaHdr = new RGBELoader();
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  el.appendChild(renderer.domElement);
  renderer.domElement.style.touchAction = 'none';

  const cena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  cena.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  const camera = new THREE.PerspectiveCamera(40, 1, .1, 300);
  const controles = new OrbitControls(camera, renderer.domElement);
  // pós-processamento: sombra de contato (AO), brilho de fogo/magia e saída com cor de cinema
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(cena, camera));
  const passoAO = new GTAOPass(cena, camera, 2, 2); passoAO.blendIntensity = .9;
  passoAO.updateGtaoMaterial({ radius: .45, distanceExponent: 1.4, thickness: 1, scale: 1 });
  composer.addPass(passoAO);
  const passoBrilho = new UnrealBloomPass(new THREE.Vector2(2, 2), .28, .5, .92);
  composer.addPass(passoBrilho);
  composer.addPass(new OutputPass());
  controles.enableDamping = true; controles.dampingFactor = .12;
  controles.maxPolarAngle = 1.32; controles.minDistance = 3; controles.maxDistance = 70;
  controles.mouseButtons = { LEFT: -1, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE };
  controles.touches = { ONE: -1, TWO: THREE.TOUCH.DOLLY_ROTATE };
  controles.screenSpacePanning = false;

  const tex = fazerTexturas();
  const grupoTerreno = new THREE.Group(), grupoTokens = new THREE.Group(), grupoEfeitos = new THREE.Group(), grupoDados = new THREE.Group();
  cena.add(grupoTerreno, grupoTokens, grupoEfeitos, grupoDados);
  const efx = criarEfeitos(grupoEfeitos);
  const grupoRastro = new THREE.Group(); grupoEfeitos.add(grupoRastro);
  // rastro de fogo do Kalthor (mapa.fogo: 'x,y' → rodadas)
  function construirRastro() {
    for (const c of grupoRastro.children) c.userData.limpar?.();
    grupoRastro.clear(); fogosVivos = fogosVivos.filter(c => !c.userData.rastro);
    let luzes = 0;
    for (const k of Object.keys(mesa.fogo || {})) {
      const [x, y] = k.split(',').map(Number); if (!(x >= 0 && y >= 0 && x < mesa.cols && y < mesa.rows)) continue;
      const c = criarChama({ raio: .36, altura: .4, fagulhas: 7, op: .9 }); c.userData.rastro = true;
      c.position.set(x + .5, alturaEm(x, y), y + .5); c.rotation.y = Math.random() * 6;
      if (luzes++ < 4) { const pl = new THREE.PointLight('#ff7a2a', 1.6, 3.5, 1.8); pl.position.y = .4; c.add(pl); }
      grupoRastro.add(c); fogosVivos.push(c);
    }
  }
  // a sombra de contato (AO) trata planos transparentes como sólidos: esconde os efeitos só nessa etapa
  if (passoAO.overrideVisibility) { const ov = passoAO.overrideVisibility.bind(passoAO); passoAO.overrideVisibility = () => { ov(); grupoEfeitos.visible = false; }; }

  // luzes
  const hemi = new THREE.HemisphereLight('#fff', '#333', 1); cena.add(hemi);
  const amb = new THREE.AmbientLight('#ffffff', .2); cena.add(amb);
  const criarDir = cor => { const l = new THREE.DirectionalLight(cor, 1); l.castShadow = true; l.shadow.mapSize.set(2048, 2048); l.shadow.bias = -.0006; l.shadow.normalBias = .02; cena.add(l, l.target); return l; };
  const kael = criarDir('#ffd28a'), lyra = criarDir('#7aa4ff');
  const luzLua = new THREE.DirectionalLight('#ffffff', 0); cena.add(luzLua, luzLua.target);

  let mesa = null, chaveTerreno = '', agua = null, chamas = [], selecaoAnel = null, portaisAnim = [];
  let fogosVivos = [], chaveRastro = ''; // chamas em shader (fogueiras + rastro de fogo), animadas no laço
  const tokens = new Map(), dados = [], pings = [], projeteis = [], faiscas = [];
  // dados batendo na mesa fazem as miniaturas perto balançarem
  function tremer(pos, forca) {
    for (const tk of tokens.values()) {
      const d = Math.hypot(tk.g.position.x - pos.x, tk.g.position.z - pos.z);
      if (d > 3.2) continue;
      const amp = Math.min(.22, forca * .05 * (1 - d / 3.2));
      if (amp < .01) continue;
      const ang = Math.atan2(tk.g.position.z - pos.z, tk.g.position.x - pos.x);
      tk.tremor = { amp: Math.max(amp, tk.tremor?.amp || 0), dx: Math.cos(ang), dz: Math.sin(ang), t0: performance.now(), f: 15 + Math.random() * 6 };
    }
  }
  let alcanceMesh = null;

  // ----------- terreno -----------
  function limpar(grupo) {
    grupo.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.isInstancedMesh) o.dispose?.(); });
    grupo.clear();
  }
  const nivel = (x, y) => nivelEm(mesa, x, y);
  const baseNivel = n => (n + 1) * NIVEL_H;                // topo do "chão" daquele nível (antes do piso)
  let solo = null, texSolo = null;
  function texReserva() {
    const cores = [[70, 100, 40], [110, 82, 56], [200, 172, 120], [120, 114, 104], [140, 134, 124], [130, 90, 56], [30, 28, 40], [84, 66, 44]];
    const d = new Uint8Array(8 * 4), n = new Uint8Array(8 * 4);
    cores.forEach((c, i) => { d.set([...c, 255], i * 4); n.set([128, 128, 255, 255], i * 4); });
    const mk = (dados, srgb) => { const t = new THREE.DataArrayTexture(dados, 1, 1, 8); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; return t; };
    return { cor: mk(d, true), nrm: mk(n, false) };
  }
  function alturaEm(x, y) {
    if (!mesa || !solo) return .1;
    const c = (mesa.grid[y] || '')[x];
    const h = solo.alturaPonto(x + .5, y + .5);
    return c === '~' ? Math.max(h, nivel(x, y) * NIVEL_H - .16) : h;
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
    limpar(grupoTerreno); chamas = []; agua = null; alvosClique = []; fogosVivos = fogosVivos.filter(c => c.userData.rastro); chaveRastro = '';
    const C = mesa.cols, R = mesa.rows, porTipo = {};
    for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) {
      const c = TERRENOS[mesa.grid[y][x]] ? mesa.grid[y][x] : '.';
      (porTipo[c] ||= []).push([x, y]);
    }
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), cor = new THREE.Color(), up = new THREE.Vector3(0, 1, 0), um = new THREE.Vector3(1, 1, 1);
    // 1) relevo contínuo com texturas misturadas
    solo = construirSolo(mesa, texSolo || texReserva());
    grupoTerreno.add(solo.malha); alvosClique.push(solo.malha);
    grupoTerreno.add(criarMesaDeJogo(mesa));
    if (!texSolo) carregarTexturasSolo().then(t => { texSolo = t; if (solo) { solo.uniforms.uCor.value = t.cor; solo.uniforms.uNrm.value = t.nrm; } }).catch(() => {});
    // 3) água: superfície única, com ondas, espuma na margem e cor pela profundidade
    if (porTipo['~']) {
      const agu = new Set(porTipo['~'].map(([x, y]) => x + ',' + y));
      // a superfície cobre a água e um pouco além; o próprio relevo desenha a margem
      const nivelAgua = new Map();
      for (const [x, y] of porTipo['~']) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const k = (x + dx) + ',' + (y + dy), n = nivel(x, y) * NIVEL_H - .13;
        if (!nivelAgua.has(k) || (agu.has(k) && dx === 0 && dy === 0)) nivelAgua.set(k, agu.has(k) ? nivel(x + dx, y + dy) * NIVEL_H - .13 : Math.min(nivelAgua.get(k) ?? 99, n));
      }
      const S = 4, pos = [], costa = [], idx = [];
      for (const [k, yy] of nivelAgua) {
        const [x, y] = k.split(',').map(Number); if (x < -1 || y < -1 || x > mesa.cols || y > mesa.rows) continue;
        const base = pos.length / 3;
        for (let j = 0; j <= S; j++) for (let i = 0; i <= S; i++) {
          const px = x + i / S, pz = y + j / S; pos.push(px, yy, pz);
          costa.push(Math.max(0, Math.min(1, (yy - solo.alturaPonto(px, pz)) / .3)));
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
            float espuma = (1. - smoothstep(.02, .1 + ruido * .03, vCosta)) * step(.001, vCosta);
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.92, .96, .97), espuma * .85);
            diffuseColor.a = (mix(.55, .92, fundo) + espuma * .2) * smoothstep(0., .02, vCosta);`);
      };
      mat.customProgramCacheKey = () => 'agua2';
      const malha = new THREE.Mesh(geo, mat); malha.receiveShadow = true; malha.renderOrder = 2;
      grupoTerreno.add(malha); agua = mat; alvosClique.push(malha);
      if (temCenario()) porTipo['~'].forEach(([x, y]) => {
        const r0 = acaso(x, y, 60); if (r0 > .3) return;
        let perto = false; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!agu.has((x + dx) + ',' + (y + dy))) perto = true;
        const p = pecaCenario(r0 < .1 && perto ? 'planta_a' : r0 < .16 && perto ? 'planta_b' : acaso(x, y, 61) < .5 ? 'lirio_a' : 'lirio_b', .7);
        if (p) { p.position.set(x + .3 + acaso(x, y, 62) * .4, nivel(x, y) * NIVEL_H - .12, y + .3 + acaso(x, y, 63) * .4); p.rotation.y = acaso(x, y, 64) * 6.3; grupoTerreno.add(p); }
      });
    }
    const chaoDe = (x, y) => solo.alturaPonto(x + .5, y + .5);
    const chaoEm = (px, pz) => solo.alturaPonto(px, pz);
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
        const px = x + .5 + (acaso(x, y, k0 + 2) - .5) * .2, pz = y + .5 + (acaso(x, y, k0 + 3) - .5) * .2;
        p.position.set(px, chaoEm(px, pz) - .03, pz);
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
      for (const [x, y] of [...(porTipo['"'] || []), ...(porTipo['T'] || []), ...(porTipo['P'] || [])]) for (let k = 0; k < 1; k++) {
        const r0 = acaso(x, y, 100 + k); if (r0 > .32) continue;
        const nome = r0 < .3 ? 'grass_small' : r0 < .42 ? 'grass_large' : r0 < .5 ? 'flower_3_clump' : 'flower_4_clump';
        const p = pecaNatureza(nome, nome.startsWith('grass') ? .22 : .2, .5); if (!p) continue;
        const gx = x + .15 + acaso(x, y, 110 + k) * .7, gz = y + .15 + acaso(x, y, 120 + k) * .7;
        p.position.set(gx, chaoEm(gx, gz) - .02, gz); p.rotation.y = acaso(x, y, 130 + k) * 6.3; p.traverse(o => { o.castShadow = false; }); grupoTerreno.add(p);
      }
      // rochas
      for (const [x, y] of porTipo['^'] || []) for (let k = 0; k < 2; k++) {
        const p = pecaNatureza('rock_' + (1 + Math.floor(acaso(x, y, 90 + k) * 5)), k ? .3 + acaso(x, y, 92) * .2 : .55 + acaso(x, y, 93) * .35, k ? .5 : 1); if (!p) continue;
        const rx = x + .5 + (k ? (acaso(x, y, 94) - .5) * .6 : 0), rz = y + .5 + (k ? (acaso(x, y, 95) - .5) * .6 : 0);
        p.position.set(rx, chaoEm(rx, rz) - .06, rz); p.rotation.y = acaso(x, y, 96) * 6.3; grupoTerreno.add(p);
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
      const P = PAREDES[tipo], y0 = chaoDe(x, y) - .25, cx = x + .5, cz = y + .5;
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
    // portais para outros mapas: anel de pedra com um redemoinho de luz
    portaisAnim = [];
    for (const [k, pt] of Object.entries(mesa.portais || {})) {
      const [x, y] = k.split(',').map(Number); if (x >= mesa.cols || y >= mesa.rows) continue;
      const cor = new THREE.Color(pt.cor || '#7ad0ff'), g = new THREE.Group();
      g.position.set(x + .5, chaoDe(x, y), y + .5);
      g.rotation.y = Math.atan2(mesa.cols / 2 - (x + .5), mesa.rows / 2 - (y + .5));
      const pedra = new THREE.MeshStandardMaterial({ map: tex.muro, color: '#a59c8e', roughness: .85 });
      const anel = new THREE.Mesh(new THREE.TorusGeometry(.48, .085, 10, 36), pedra); anel.position.y = .62; anel.castShadow = true; g.add(anel);
      for (const sx of [-1, 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(.2, .22, .26), pedra); b.position.set(sx * .42, .1, 0); b.castShadow = true; g.add(b); }
      // runas brilhando no anel
      for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; const r = new THREE.Mesh(new THREE.BoxGeometry(.05, .05, .2), new THREE.MeshBasicMaterial({ color: cor })); r.position.set(Math.cos(a) * .48, .62 + Math.sin(a) * .48, 0); r.rotation.z = a; g.add(r); }
      const c = document.createElement('canvas'); c.width = c.height = 128; const cx = c.getContext('2d');
      const grad = cx.createRadialGradient(64, 64, 4, 64, 64, 64); grad.addColorStop(0, '#ffffff'); grad.addColorStop(.35, '#' + cor.getHexString() + 'cc'); grad.addColorStop(1, '#00000000');
      cx.fillStyle = grad; cx.fillRect(0, 0, 128, 128); cx.strokeStyle = '#ffffff88'; cx.lineWidth = 3;
      for (let b = 0; b < 4; b++) { cx.beginPath(); for (let t = 0; t < 60; t++) { const r = t, a = t * .14 + b * Math.PI / 2; const px = 64 + Math.cos(a) * r, py = 64 + Math.sin(a) * r; t ? cx.lineTo(px, py) : cx.moveTo(px, py); } cx.stroke(); }
      const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
      const vortice = new THREE.Mesh(new THREE.CircleGeometry(.42, 40), new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
      vortice.position.y = .62; g.add(vortice);
      const chaoLuz = new THREE.Mesh(new THREE.CircleGeometry(.5, 32), new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .6 }));
      chaoLuz.rotation.x = -Math.PI / 2; chaoLuz.position.y = .03; g.add(chaoLuz);
      const luz = new THREE.PointLight(cor, 2.2, 4, 1.8); luz.position.y = .7; g.add(luz);
      const nome = rotulo('⟶ ' + (pt.nome || 'Portal'), '#' + cor.getHexString(), 'rgba(10,8,6,.75)', .24); nome.position.y = 1.35; g.add(nome);
      grupoTerreno.add(g); portaisAnim.push({ vortice, chaoLuz, luz, s: x * 3 + y });
    }
    // 7) fogueiras
    let luzes = 0;
    for (const [x, y] of porTipo['*'] || []) {
      const g = new THREE.Group(); g.position.set(x + .5, chaoDe(x, y), y + .5);
      const pedraMat = new THREE.MeshStandardMaterial({ color: '#6b6560', roughness: .9, flatShading: true });
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; const p = new THREE.Mesh(new THREE.DodecahedronGeometry(.07, 0), pedraMat); p.position.set(Math.cos(a) * .28, .04, Math.sin(a) * .28); p.castShadow = true; g.add(p); }
      for (let k = 0; k < 3; k++) { const t = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, .45, 6), new THREE.MeshStandardMaterial({ color: '#3a2412', roughness: 1 })); t.rotation.z = Math.PI / 2; t.rotation.y = k * Math.PI / 3; t.position.y = .05; g.add(t); }
      const fogo = criarChama({ raio: .17, altura: .62, fagulhas: 12 }); fogo.position.y = .04; g.add(fogo); fogosVivos.push(fogo);
      if (luzes++ < 6) { const pl = new THREE.PointLight('#ff9a3a', 2.2, 6, 1.6); pl.position.y = .6; g.add(pl); chamas.push([pl, null, x + y]); }
      grupoTerreno.add(g);
    }
    for (const l of [kael, lyra]) { const s = Math.max(C, R) * .85; Object.assign(l.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: .5, far: 120 }); l.shadow.camera.updateProjectionMatrix(); }
  }

  // onde os dados caem: no meio da moldura, no lado mais perto do canto superior direito da tela; deitada = lado de cima/baixo
  const rayDados = new THREE.Raycaster(), planoMesa = new THREE.Plane(new THREE.Vector3(0, 1, 0), -MESA_Y);
  function pontoDosDados() {
    const C = mesa.cols, R = mesa.rows, m = BORDA / 2, p = new THREE.Vector3();
    rayDados.setFromCamera(new THREE.Vector2(.55, .35), camera);
    if (!rayDados.ray.intersectPlane(planoMesa, p)) p.set(C, MESA_Y, -m);
    const d = [Math.abs(p.x + m), Math.abs(C + m - p.x), Math.abs(p.z + m), Math.abs(R + m - p.z)], i = d.indexOf(Math.min(...d));
    p.x = i === 0 ? -m : i === 1 ? C + m : Math.max(-m, Math.min(C + m, p.x));
    p.z = i === 2 ? -m : i === 3 ? R + m : Math.max(-m, Math.min(R + m, p.z));
    p.y = MESA_Y; p.deitada = i >= 2; return p;
  }
  function casaVaziaPerto(k) {
    const t = ultimo?.tokens?.find(o => o.k === k); if (!t || !mesa) return null;
    const ocup = new Set();
    for (const o of ultimo.tokens) for (let dy = 0; dy < (o.tamanho || 1); dy++) for (let dx = 0; dx < (o.tamanho || 1); dx++) ocup.add((o.x + dx) + ',' + (o.y + dy));
    const livre = (x, y) => x >= 0 && y >= 0 && x < mesa.cols && y < mesa.rows && !ocup.has(x + ',' + y) && Number.isFinite(TERRENOS[(mesa.grid[y] || '')[x]]?.custo) && (mesa.grid[y] || '')[x] !== '~';
    const tam = t.tamanho || 1, cam = camera.position;
    for (let d = 1; d <= 4; d++) {
      const op = [];
      for (let y = t.y - d; y < t.y + tam + d; y++) for (let x = t.x - d; x < t.x + tam + d; x++) if (Math.max(t.x - x, x - t.x - tam + 1, t.y - y, y - t.y - tam + 1) === d && livre(x, y)) op.push([x, y]);
      if (op.length) {
        const [x, y] = op.sort((a, b) => Math.hypot(a[0] - cam.x, a[1] - cam.z) - Math.hypot(b[0] - cam.x, b[1] - cam.z))[0];
        const p = new THREE.Vector3(x + .5, alturaEm(x, y), y + .5); p.casa = true; return p;
      }
    }
    return null;
  }
  // fora do tabuleiro é tudo moldura
  const foraDoDiorama = (x, z) => !solo || x < 0 || z < 0 || x > mesa.cols || z > mesa.rows;

  let ceuAtual = '';
  cena.background = new THREE.Color('#000'); // fundo sempre preto, de noite; o céu HDRI só ilumina
  function aplicarCeu(luz, lua) {
    const c = CEUS[luz] || CEUS.dia, alvo = new THREE.Vector3(mesa.cols / 2, 0, mesa.rows / 2), d = Math.max(mesa.cols, mesa.rows) * 1.2;
    if (ceuAtual !== luz) {
      ceuAtual = luz;
      const usar = t => { if (ceuAtual !== luz) return; cena.environment = t; };
      if (hdrs[c.hdr]) usar(hdrs[c.hdr]);
      else carregaHdr.loadAsync('/ceus/' + (TELA_FINA ? c.hdr : c.hdr.replace('_1k', '_2k')) + '.hdr').then(eq => { const t = pmrem.fromEquirectangular(eq).texture; eq.dispose(); hdrs[c.hdr] = t; usar(t); }).catch(() => {});
    }
    cena.environmentIntensity = c.env; cena.backgroundIntensity = c.fundo; cena.backgroundBlurriness = .06;
    renderer.toneMappingExposure = c.exp;
    cena.fog = new THREE.FogExp2('#000', c.dens * 24 / Math.max(24, Math.max(mesa.cols, mesa.rows)));
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
    camera.position.set(cx, d * .5, cz + d * .66);
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
      let tk = tokens.get(t.k), novoTk = false;
      if (!tk || tk.chave !== chave) {
        if (tk) { grupoTokens.remove(tk.g); limpar(tk.g); if (tk.fogo) { grupoEfeitos.remove(tk.fogo); tk.fogo.userData.limpar(); } }
        novoTk = true;
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
        tk = { g, chave, mini, pers: mini.userData.personagem || null, alturaMini: mini.userData.altura, fr: null, barra: null, anim: null, x: t.x, y: t.y, vigor: t.vigor, tp: t.tp };
        if (tk.pers && t.mostrarVida && t.vigorMax && t.vigor <= 0) tk.pers.tocar('caido');
        tokens.set(t.k, tk); grupoTokens.add(g);
        tk.imb = null;
        g.position.set(t.x + tam / 2, alturaEm(t.x, t.y), t.y + tam / 2);
      }
      // Dom na arma
      const imb = t.imbuir ? t.imbuir.cor + t.imbuir.estilo : null;
      if (tk.pers?.imbuir && imb !== tk.imb) {
        // imbuiu agora (não ao carregar): passa a mão pela arma
        const varrer = !novoTk && !!imb && !tk.imb;
        tk.pers.imbuir(t.imbuir?.cor, t.imbuir?.estilo, varrer); if (varrer) tk.pers.tocar('usar');
        tk.imb = imb;
      }
      // queimando: chama em volta da miniatura
      if (t.queima && !tk.fogo) { tk.fogo = criarChama({ raio: .2 * tam, altura: tk.alturaMini * .7, fagulhas: 9, op: .7 }); grupoEfeitos.add(tk.fogo); }
      else if (!t.queima && tk.fogo) { grupoEfeitos.remove(tk.fogo); tk.fogo.userData.limpar(); tk.fogo = null; }
      // condições (ícones acima do nome)
      if ((t.cond || '') !== (tk.cond || '')) {
        if (tk.condSpr) { tk.g.remove(tk.condSpr); tk.condSpr.material.map.dispose(); tk.condSpr.material.dispose(); tk.condSpr = null; }
        if (t.cond) { tk.condSpr = rotulo(t.cond, '#ffffff', 'rgba(10,8,6,.5)', .2); tk.condSpr.position.y = tk.alturaMini + .5; tk.g.add(tk.condSpr); }
        tk.cond = t.cond || '';
      }
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
      // teleporte (habilidade): some num clarão e reaparece, sem andar
      if ((tk.x !== t.x || tk.y !== t.y) && t.tp !== tk.tp) {
        const de = tk.g.position.clone(), para = new THREE.Vector3(t.x + tam / 2, alturaEm(t.x, t.y), t.y + tam / 2);
        if (de.distanceTo(para) > .05) efx.salto(de, para, t.cristal || '#c9a0ff');
        tk.anim = null; tk.g.position.copy(para); tk.x = t.x; tk.y = t.y;
        tk.mini.rotation.y = Math.atan2(para.x - de.x, para.z - de.z);
      }
      tk.tp = t.tp;
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
    for (const [k, tk] of tokens) if (!vistos.has(k)) { grupoTokens.remove(tk.g); limpar(tk.g); if (tk.fogo) { grupoEfeitos.remove(tk.fogo); tk.fogo.userData.limpar(); } tokens.delete(k); }
    // seleção
    if (!selecaoAnel) {
      selecaoAnel = new THREE.Mesh(new THREE.TorusGeometry(.5, .025, 6, 40), new THREE.MeshBasicMaterial({ color: '#ffd76a' }));
      selecaoAnel.rotation.x = Math.PI / 2;
    }
    const sel = tokens.get(selecionado);
    if (sel) { sel.g.add(selecaoAnel); selecaoAnel.position.y = .09; } else if (selecaoAnel.parent) selecaoAnel.parent.remove(selecaoAnel);
  }

  function mostrarAlcance(alcance) {
    if (!alcance || !alcance.size) { solo?.marcarAlcance(null); return; }
    solo?.marcarAlcance(alcance);
  }

  function ping(x, y, cor) {
    const m = new THREE.Mesh(new THREE.RingGeometry(.3, .4, 32), new THREE.MeshBasicMaterial({ color: cor, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(x + .5, alturaEm(x, y) + .05, y + .5);
    grupoEfeitos.add(m); pings.push({ m, t0: performance.now() });
  }

  // ----------- dados -----------
  function rolar(ev) {
    const centro = (ev.perto || ev.k) && casaVaziaPerto(ev.perto || ev.k) || (mesa && solo ? pontoDosDados() : controles.target.clone().setY(0));
    const lista = (ev.dados || []).slice(0, 20);
    const resultado = [];
    lista.forEach((d, i) => {
      const cor = d.c === 'lyra' || d.papel === 'lyra' ? ev.lyra : d.c === 'tirith' ? '#e9edf2' : d.c === 'aranor' ? '#d23a3a' : ev.kael;
      const m = criarDado(d.f, cor, ev.material); m.scale.setScalar(.3);
      const ang = Math.random() * Math.PI * 2;
      const casa = centro.casa, raio = casa ? .5 : 1.2;
      m.position.set(centro.x + Math.cos(ang) * raio, centro.y + 3.2 + i * .25, centro.z + Math.sin(ang) * raio);
      // fileira ao longo da moldura (dentro da largura dela); numa casa do mapa, juntinhos dentro dela
      const ao = (i - (lista.length - 1) / 2) * (casa ? .3 : .85) + (Math.random() - .5) * (casa ? .08 : .3), de = (Math.random() - .5) * (casa ? .25 : .6);
      const destino = new THREE.Vector3(centro.x + (centro.deitada === false ? de : ao), 0, centro.z + (centro.deitada === false ? ao : de));
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
        const chao = (!mesa ? .62 : foraDoDiorama(d.m.position.x, d.m.position.z) ? MESA_Y : alturaEm(Math.floor(d.m.position.x), Math.floor(d.m.position.z))) + .3;
        if (d.m.position.y < chao) {
          if (Math.abs(d.vel.y) > 1.2) tremer(d.m.position, Math.abs(d.vel.y));
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
      // somem 2 s depois de parar (param em 1,35 s)
      if (idade > 3.35) {
        grupoDados.remove(d.m); d.m.material.dispose(); if (d.rot) { grupoDados.remove(d.rot); d.rot.material.map.dispose(); }
        dados.splice(i, 1);
      } else if (idade > 2.95) {
        const a = 1 - (idade - 2.95) / .4; d.m.material.transparent = true; d.m.material.opacity = Math.min(d.m.material.opacity, a); if (d.rot) d.rot.material.opacity = a;
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
  // câmera pelo teclado: WASD/setas andam, Q/E giram, Shift acelera (ignora quando digita num campo)
  const teclas = new Set(), TECLA = { w: 'f', arrowup: 'f', s: 't', arrowdown: 't', a: 'e', arrowleft: 'e', d: 'd', arrowright: 'd', q: 'gq', e: 'ge' };
  const digitando = e => e.target.closest?.('input,textarea,select,[contenteditable]') || e.ctrlKey || e.metaKey || e.altKey;
  let rapido = false;
  const aoTecla = e => {
    if (e.key === 'Shift') rapido = e.type === 'keydown';
    const t = TECLA[e.key.toLowerCase()];
    if (!t) return;
    if (e.type === 'keyup') { teclas.delete(t); return; }
    if (digitando(e) || !dom.isConnected || !dom.offsetParent) return;
    teclas.add(t); e.preventDefault();
  };
  const soltarTudo = () => { teclas.clear(); rapido = false; };
  addEventListener('keydown', aoTecla); addEventListener('keyup', aoTecla); addEventListener('blur', soltarTudo);
  function andarTeclado(dt) {
    if (!teclas.size) return;
    if (teclas.has('gq') || teclas.has('ge')) api.girar((teclas.has('gq') ? 1 : -1) * dt * 1.8);
    const frente = controles.target.clone().sub(camera.position); frente.y = 0; if (frente.lengthSq() < 1e-6) return; frente.normalize();
    const lado = new THREE.Vector3(-frente.z, 0, frente.x), mov = new THREE.Vector3();
    if (teclas.has('f')) mov.add(frente); if (teclas.has('t')) mov.sub(frente); if (teclas.has('d')) mov.add(lado); if (teclas.has('e')) mov.sub(lado);
    if (!mov.lengthSq()) return;
    const vel = (4 + camera.position.distanceTo(controles.target) * .6) * (rapido ? 2.2 : 1);
    mov.normalize().multiplyScalar(vel * dt);
    // não deixa o foco sair do mapa
    if (mesa) { const t = controles.target; mov.x = Math.max(-2 - t.x, Math.min(mesa.cols + 2 - t.x, mov.x)); mov.z = Math.max(-2 - t.z, Math.min(mesa.rows + 2 - t.z, mov.z)); }
    controles.target.add(mov); camera.position.add(mov);
  }
  let usarPos = true;
  const ro = new ResizeObserver(() => { const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return; renderer.setSize(w, h); composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); });
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
      usarPos = false;
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
    andarTeclado(dt);
    controles.update();
    TEMPO.value = t;
    for (const p of portaisAnim) { p.vortice.rotation.z = -t * 1.6; p.chaoLuz.rotation.z = t * .8; p.luz.intensity = 2 + Math.sin(t * 3 + p.s) * .5; }
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
      if (tk.tremor) {
        // balança sobre a base, como miniatura de chumbo numa mesa batida
        const tt = (agora - tk.tremor.t0) / 1000, a = tk.tremor.amp * Math.exp(-tt * 3.2) * Math.sin(tt * tk.tremor.f);
        tk.g.rotation.x = a * tk.tremor.dz; tk.g.rotation.z = -a * tk.tremor.dx;
        if (tt > 1.8) { tk.g.rotation.x = tk.g.rotation.z = 0; tk.tremor = null; }
      }
      if (tk.pers) tk.pers.atualizar ? tk.pers.atualizar(dt) : tk.pers.mixer?.update(dt);
      if (tk.fogo) { tk.fogo.position.copy(tk.g.position); tk.fogo.visible = tk.g.visible; tk.fogo.userData.atualizar(dt); }
    }
    for (const c of fogosVivos) c.userData.atualizar(dt);
    if (selecaoAnel?.parent) { selecaoAnel.rotation.z = t; selecaoAnel.scale.setScalar(1 + Math.sin(t * 4) * .04); }
    for (let i = pings.length - 1; i >= 0; i--) { const p = pings[i], a = (agora - p.t0) / 1400; p.m.scale.setScalar(1 + a * 3); p.m.material.opacity = 1 - a; if (a >= 1) { grupoEfeitos.remove(p.m); p.m.geometry.dispose(); pings.splice(i, 1); } }
    simularDados(dt, agora);
    efx.atualizar(agora, dt);
    for (let i = projeteis.length - 1; i >= 0; i--) {
      const p = projeteis[i], k = (agora - p.t0) / p.dur;
      if (k < 0) { p.m.visible = false; continue; }
      p.m.visible = true;
      const e = Math.min(1, k), pos = p.p0.clone().lerp(p.p1, e); pos.y += Math.sin(e * Math.PI) * (p.magia ? .4 : .7) * Math.min(1, p.p0.distanceTo(p.p1) / 6);
      if (!p.magia) p.m.lookAt(pos.clone().add(p.p1.clone().sub(p.p0)));
      p.m.position.copy(pos);
      if (k >= 1) {
        grupoEfeitos.remove(p.m); p.m.geometry.dispose();
        // estouro no impacto
        const s = new THREE.Mesh(new THREE.SphereGeometry(.12, 12, 8), new THREE.MeshBasicMaterial({ color: p.cor, transparent: true, opacity: .9, depthWrite: false }));
        s.position.copy(p.p1); grupoEfeitos.add(s); faiscas.push({ m: s, t0: agora });
        const alvo = tokens.get(p.para); if (alvo) { alvo.tremor = { amp: .12, dx: p.p1.x - p.p0.x, dz: p.p1.z - p.p0.z, t0: agora, f: 22 }; const n = Math.hypot(alvo.tremor.dx, alvo.tremor.dz) || 1; alvo.tremor.dx /= n; alvo.tremor.dz /= n; }
        projeteis.splice(i, 1);
      }
    }
    for (let i = faiscas.length - 1; i >= 0; i--) { const f = faiscas[i], a = (agora - f.t0) / 450; f.m.scale.setScalar(1 + a * 5); f.m.material.opacity = .9 * (1 - a); if (a >= 1) { grupoEfeitos.remove(f.m); f.m.geometry.dispose(); faiscas.splice(i, 1); } }
    if (usarPos) composer.render(dt); else renderer.render(cena, camera);
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
      const novaChave = m.id + ':' + m.cols + 'x' + m.rows + ':' + m.grid.join('') + ':' + (m.alt || []).join('') + JSON.stringify(m.portais || {});
      const tamanhoMudou = !mesa || mesa.cols !== m.cols || mesa.rows !== m.rows;
      mesa = m;
      if (novaChave !== chaveTerreno) { chaveTerreno = novaChave; construirTerreno(); }
      const rastro = m.id + JSON.stringify(m.fogo || {});
      if (rastro !== chaveRastro) { chaveRastro = rastro; construirRastro(); }
      if (tamanhoMudou) enquadrar();
      aplicarCeu(m.luz, m.lua);
      atualizarTokens(lista || [], selecionado);
      mostrarAlcance(alcance);
    },
    rolar, ping,
    impacto(para, de) {
      const b = tokens.get(para), a = tokens.get(de); if (!b) return;
      let dx = 1, dz = 0; if (a) { dx = b.g.position.x - a.g.position.x; dz = b.g.position.z - a.g.position.z; const n = Math.hypot(dx, dz) || 1; dx /= n; dz /= n; a.mini.rotation.y = Math.atan2(dx, dz); }
      b.tremor = { amp: .14, dx, dz, t0: performance.now(), f: 20 };
    },
    marcar(canal, mapa, forca) { solo?.marcar(canal, mapa, forca); },
    projetil(de, para, cor, magia) {
      const a = tokens.get(de), b = tokens.get(para); if (!a || !b) return;
      const p0 = a.g.position.clone().add(new THREE.Vector3(0, a.alturaMini * .6, 0)), p1 = b.g.position.clone().add(new THREE.Vector3(0, b.alturaMini * .55, 0));
      a.mini.rotation.y = Math.atan2(p1.x - p0.x, p1.z - p0.z);
      const corP = new THREE.Color(cor || (magia ? '#9ad0ff' : '#f2e6c8'));
      const m = magia
        ? new THREE.Mesh(new THREE.SphereGeometry(.11, 14, 10), new THREE.MeshStandardMaterial({ color: corP, emissive: corP, emissiveIntensity: 4 }))
        : new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .5, 5).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#d8c8a0', emissive: corP, emissiveIntensity: .6 }));
      const luz = magia ? new THREE.PointLight(corP, 3, 3) : null; if (luz) m.add(luz);
      grupoEfeitos.add(m);
      projeteis.push({ m, p0, p1, t0: performance.now() + 380, dur: Math.max(260, p0.distanceTo(p1) * 70), magia, cor: corP, para });
    },
    // habilidade do Dom (ver efeitos.js)
    efeito(s) {
      const a = tokens.get(s.de); if (!a) return;
      // teleporte: some e reaparece já na animação (o estado chega depois, sem andar)
      if (s.forma === 'salto' && s.centro && !s.falhou && mesa) {
        const para = new THREE.Vector3(s.centro.x + .5, alturaEm(s.centro.x, s.centro.y), s.centro.y + .5);
        efx.salto(a.g.position.clone(), para, s.cor); a.anim = null; a.g.position.copy(para); a.x = s.centro.x; a.y = s.centro.y;
      }
      const meio = tk => tk.g.position.clone().add(new THREE.Vector3(0, tk.alturaMini * .55, 0));
      const centro = s.centro && mesa ? new THREE.Vector3(s.centro.x + .5, alturaEm(s.centro.x, s.centro.y) + .02, s.centro.y + .5) : null;
      const alvos = (s.alvos || []).map(k => tokens.get(k) && { k, p: meio(tokens.get(k)), chao: tokens.get(k).g.position.clone(), acertou: (s.acertos || []).includes(k) }).filter(Boolean);
      const mira = centro || alvos[0]?.chao;
      if (mira && s.forma !== 'aura') a.mini.rotation.y = Math.atan2(mira.x - a.g.position.x, mira.z - a.g.position.z) || a.mini.rotation.y;
      const bater = (k, t) => setTimeout(() => { const b = tokens.get(k); if (!b) return; let dx = b.g.position.x - a.g.position.x, dz = b.g.position.z - a.g.position.z; const n = Math.hypot(dx, dz) || 1; b.tremor = { amp: s.suprema ? .2 : .13, dx: dx / n, dz: dz / n, t0: performance.now(), f: 22 }; }, t);
      // casas de uma parede/campo (para as colunas subirem uma a uma)
      const celulas = [];
      if (centro && s.forma === 'parede') for (let y = s.centro.y - (s.raio || 0); y <= s.centro.y + (s.raio || 0); y++) for (let x = s.centro.x - (s.raio || 0); x <= s.centro.x + (s.raio || 0); x++)
        if (x >= 0 && y >= 0 && x < mesa.cols && y < mesa.rows) celulas.push(new THREE.Vector3(x + .5, alturaEm(x, y), y + .5));
      efx.tocar(s, { p0: meio(a), chao0: a.g.position.clone(), alvos, centro, celulas }, bater, (p, f, t) => setTimeout(() => tremer(p, f), t));
    },
    pulso(k, cor, estilo) { const tk = tokens.get(k); if (tk) efx.pulso(tk.g.position.clone().add(new THREE.Vector3(0, estilo ? tk.alturaMini * .5 : 0, 0)), cor, estilo); },
    projetar(v) { const p = v.clone().project(camera), r = dom.getBoundingClientRect(); return { x: (p.x + 1) / 2 * r.width, y: (1 - p.y) / 2 * r.height }; },
    girar(ang) { const off = camera.position.clone().sub(controles.target); off.applyAxisAngle(new THREE.Vector3(0, 1, 0), ang); camera.position.copy(controles.target).add(off); },
    zoom(f) { const off = camera.position.clone().sub(controles.target).multiplyScalar(f); if (off.length() > 3 && off.length() < 70) camera.position.copy(controles.target).add(off); },
    focar(x, y) { const novo = new THREE.Vector3(x + .5, mesa ? alturaEm(x, y) : 0, y + .5), d = novo.clone().sub(controles.target); controles.target.add(d); camera.position.add(d); },
    enquadrar() { if (mesa) enquadrar(); },
    pausar(v) { pausado = !!v; if (!v) relogio.getDelta(); },
    _cam: camera, _ctl: controles, _alt: (x, z) => solo?.alturaPonto(x, z), get _solo() { return solo; },
    destruir() { removeEventListener('keydown', aoTecla); removeEventListener('keyup', aoTecla); removeEventListener('blur', soltarTudo); ativo = false; ro.disconnect(); controles.dispose(); renderer.dispose(); dom.remove(); },
  };
  return api;
}
