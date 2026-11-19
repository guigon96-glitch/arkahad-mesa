// Cena 3D do tabuleiro: terreno, cenário, luzes de Kael e Lyra, miniaturas, dados.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TERRENOS } from './regras.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { criarMiniatura, criarDado, rotulo } from './miniatura.js';
import { carregarModelos, criarPersonagem, pecaCenario, temCenario, modelosProntos } from './modelos.js';

// ---------- configuração fácil de editar ----------
const ALTURA = { '.': .12, '_': .16, ',': .1, '"': .14, '~': .04, '=': .17, '+': .16, 'v': .12, '#': 1.35, 'T': .14, '^': .12, '*': .12, b: .12, c: .12, s: .12, n: .14, a: .16, o: .14, w: .12 };
const OBJETOS = { b: ['barril'], c: ['caixote', 'caixotes'], s: ['saco'], n: ['tenda'], a: ['suporte_armas'], o: ['alvo'], w: ['carrinho', 'balde'] };
const TEXTURA_DE = { '.': 'terra', '_': 'ladrilho', ',': 'areia', '"': 'mato', '~': 'leito', '=': 'madeira', '+': 'madeira', 'v': 'vidro', '#': 'muro', 'T': 'mato', '^': 'terra', '*': 'terra', b: 'terra', c: 'terra', s: 'terra', n: 'mato', a: 'ladrilho', o: 'mato', w: 'terra' };
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
    muro: textura((g, t) => { g.fillStyle = '#2a2520'; g.fillRect(0, 0, t, t); const h = t / 6; for (let r = 0; r < 6; r++) { const off = r % 2 ? t / 6 : 0; for (let c = -1; c < 3; c++) { const v = 62 + Math.random() * 26; g.fillStyle = `rgb(${v},${v - 6},${v - 12})`; g.fillRect(off + c * t / 3 + 2, r * h + 2, t / 3 - 4, h - 4); } } salpicar(g, t, 200, ['#00000033', '#ffffff10'], .5, 1.4); }),
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
  function alturaEm(x, y) {
    if (!mesa) return .12;
    const c = (mesa.grid[y] || '')[x];
    return c === '~' ? .1 : (ALTURA[c] ?? .12);
  }
  function construirTerreno() {
    limpar(grupoTerreno); chamas = []; agua = null;
    const C = mesa.cols, R = mesa.rows, porTipo = {};
    for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) {
      const c = TERRENOS[mesa.grid[y][x]] ? mesa.grid[y][x] : '.';
      (porTipo[c] ||= []).push([x, y]);
    }
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), cor = new THREE.Color(), up = new THREE.Vector3(0, 1, 0);
    for (const [tipo, celulas] of Object.entries(porTipo)) {
      const h = ALTURA[tipo];
      const geo = new THREE.BoxGeometry(1, h, 1);
      const material = new THREE.MeshStandardMaterial({ map: tex[TEXTURA_DE[tipo]], roughness: tipo === 'v' ? .12 : .92, metalness: tipo === 'v' ? .5 : 0 });
      const inst = new THREE.InstancedMesh(geo, material, celulas.length);
      celulas.forEach(([x, y], i) => {
        q.setFromAxisAngle(up, Math.floor(acaso(x, y) * 4) * Math.PI / 2);
        m4.compose(new THREE.Vector3(x + .5, h / 2, y + .5), q, new THREE.Vector3(1, 1, 1));
        inst.setMatrixAt(i, m4);
        cor.setScalar(.88 + acaso(x, y, 3) * .22); inst.setColorAt(i, cor);
      });
      inst.receiveShadow = true; inst.castShadow = tipo === '#';
      grupoTerreno.add(inst);
    }
    // água
    if (porTipo['~']) {
      const nm = tex.aguaNormal;
      const mat = new THREE.MeshPhysicalMaterial({ color: '#1d6f8f', transparent: true, opacity: .86, roughness: .06, metalness: .05, normalMap: nm, normalScale: new THREE.Vector2(.55, .55), clearcoat: 1, clearcoatRoughness: .08, emissive: '#06283a', emissiveIntensity: .5 });
      const inst = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), mat, porTipo['~'].length);
      porTipo['~'].forEach(([x, y], i) => { m4.compose(new THREE.Vector3(x + .5, .1, y + .5), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2), new THREE.Vector3(1, 1, 1)); inst.setMatrixAt(i, m4); });
      inst.receiveShadow = true; grupoTerreno.add(inst); agua = mat;
      if (temCenario()) porTipo['~'].forEach(([x, y]) => {
        const r0 = acaso(x, y, 60); if (r0 > .35) return;
        const p = pecaCenario(r0 < .12 ? 'planta_a' : r0 < .2 ? 'planta_b' : acaso(x, y, 61) < .5 ? 'lirio_a' : 'lirio_b', .7);
        if (p) { p.position.set(x + .3 + acaso(x, y, 62) * .4, .08, y + .3 + acaso(x, y, 63) * .4); p.rotation.y = acaso(x, y, 64) * 6.3; grupoTerreno.add(p); }
      });
    }
    // objetos (barris, caixotes, tenda…)
    if (temCenario()) for (const [ch, nomes] of Object.entries(OBJETOS)) for (const [x, y] of porTipo[ch] || []) {
      const p = pecaCenario(nomes[Math.floor(acaso(x, y, 70) * nomes.length)], 1);
      if (p) { p.position.set(x + .5, ALTURA[ch], y + .5); p.rotation.y = Math.floor(acaso(x, y, 71) * 4) * Math.PI / 2 + (acaso(x, y, 72) - .5) * .4; grupoTerreno.add(p); }
    }
    // árvores
    const arv = porTipo['T'] || [];
    if (arv.length && temCenario()) {
      for (const [x, y] of arv) {
        const nomes = ['arvore_a', 'arvore_b', 'arvore_a', 'arvore_b', 'arvores_a'];
        const p = pecaCenario(nomes[Math.floor(acaso(x, y, 80) * nomes.length)], 1.3);
        if (p) { const s = .85 + acaso(x, y, 81) * .35; p.scale.multiplyScalar(s); p.position.set(x + .5 + (acaso(x, y, 1) - .5) * .2, .14, y + .5 + (acaso(x, y, 2) - .5) * .2); p.rotation.y = acaso(x, y, 82) * 6.3; grupoTerreno.add(p); }
      }
    } else if (arv.length) {
      const tronco = new THREE.InstancedMesh(new THREE.CylinderGeometry(.06, .1, .55, 6), new THREE.MeshStandardMaterial({ color: '#5a3a1e', roughness: .95, flatShading: true }), arv.length);
      const copa = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.36, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .85, flatShading: true }), arv.length * 3);
      const verdes = ['#2f6a2a', '#3d7f32', '#2a5a2a', '#4f8a3a', '#356b30'];
      arv.forEach(([x, y], i) => {
        const jx = (acaso(x, y, 1) - .5) * .25, jz = (acaso(x, y, 2) - .5) * .25, s = .85 + acaso(x, y, 4) * .45;
        m4.compose(new THREE.Vector3(x + .5 + jx, .14 + .27 * s, y + .5 + jz), new THREE.Quaternion(), new THREE.Vector3(s, s, s)); tronco.setMatrixAt(i, m4);
        for (let k = 0; k < 3; k++) {
          const ss = s * [1.05, .85, .6][k], yy = .14 + (.62 + k * .28) * s;
          q.setFromEuler(new THREE.Euler(acaso(x, y, 10 + k) * 3, acaso(x, y, 20 + k) * 3, 0));
          m4.compose(new THREE.Vector3(x + .5 + jx + (acaso(x, y, 30 + k) - .5) * .12, yy, y + .5 + jz + (acaso(x, y, 40 + k) - .5) * .12), q, new THREE.Vector3(ss, ss * .9, ss));
          copa.setMatrixAt(i * 3 + k, m4); copa.setColorAt(i * 3 + k, cor.set(verdes[Math.floor(acaso(x, y, 50 + k) * verdes.length)]));
        }
      });
      tronco.castShadow = copa.castShadow = true; tronco.receiveShadow = copa.receiveShadow = true;
      grupoTerreno.add(tronco, copa);
    }
    // rochas
    const roc = porTipo['^'] || [];
    if (roc.length && temCenario()) {
      for (const [x, y] of roc) for (let k = 0; k < 2; k++) {
        const p = pecaCenario('rocha_' + 'abcde'[Math.floor(acaso(x, y, 90 + k) * 5)], k ? .55 : 1);
        if (!p) continue; const s = k ? .55 + acaso(x, y, 92) * .3 : 1 + acaso(x, y, 93) * .5; p.scale.multiplyScalar(s);
        p.position.set(x + .5 + (k ? (acaso(x, y, 94) - .5) * .6 : 0), .12, y + .5 + (k ? (acaso(x, y, 95) - .5) * .6 : 0)); p.rotation.y = acaso(x, y, 96) * 6.3; grupoTerreno.add(p);
      }
    } else if (roc.length) {
      const n = roc.length * 3;
      const pedra = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(.28, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .9, flatShading: true }), n);
      let i = 0;
      roc.forEach(([x, y]) => {
        for (let k = 0; k < 3; k++) {
          const s = k === 0 ? .9 + acaso(x, y, k) * .5 : .35 + acaso(x, y, k + 7) * .35;
          const px = x + .5 + (k ? (acaso(x, y, k + 3) - .5) * .7 : 0), pz = y + .5 + (k ? (acaso(x, y, k + 5) - .5) * .7 : 0);
          q.setFromEuler(new THREE.Euler(acaso(x, y, k + 9) * 3, acaso(x, y, k + 11) * 3, acaso(x, y, k + 13) * 3));
          m4.compose(new THREE.Vector3(px, .12 + .16 * s, pz), q, new THREE.Vector3(s, s * (.7 + acaso(x, y, k + 15) * .5), s));
          pedra.setMatrixAt(i, m4); const v = .38 + acaso(x, y, k + 17) * .2; pedra.setColorAt(i, cor.setRGB(v, v * .96, v * .9)); i++;
        }
      });
      pedra.castShadow = pedra.receiveShadow = true; grupoTerreno.add(pedra);
    }
    // portas: batentes
    for (const [x, y] of porTipo['+'] || []) {
      const lateral = (mesa.grid[y][x - 1] === '#' || mesa.grid[y][x + 1] === '#');
      const madeira = new THREE.MeshStandardMaterial({ color: '#4a2d16', roughness: .9, flatShading: true });
      const add = (w, h, d, px, py, pz) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), madeira); o.position.set(px, py, pz); o.castShadow = o.receiveShadow = true; grupoTerreno.add(o); };
      if (lateral) { add(.12, 1.2, .3, x + .06, .76, y + .5); add(.12, 1.2, .3, x + .94, .76, y + .5); add(1, .14, .32, x + .5, 1.3, y + .5); }
      else { add(.3, 1.2, .12, x + .5, .76, y + .06); add(.3, 1.2, .12, x + .5, .76, y + .94); add(.32, .14, 1, x + .5, 1.3, y + .5); }
    }
    // fogueiras
    let luzes = 0;
    for (const [x, y] of porTipo['*'] || []) {
      const g = new THREE.Group(); g.position.set(x + .5, .12, y + .5);
      const pedraMat = new THREE.MeshStandardMaterial({ color: '#6b6560', roughness: .9, flatShading: true });
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; const p = new THREE.Mesh(new THREE.DodecahedronGeometry(.07, 0), pedraMat); p.position.set(Math.cos(a) * .28, .04, Math.sin(a) * .28); p.castShadow = true; g.add(p); }
      for (let k = 0; k < 3; k++) { const t = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, .45, 6), new THREE.MeshStandardMaterial({ color: '#3a2412', roughness: 1 })); t.rotation.z = Math.PI / 2; t.rotation.y = k * Math.PI / 3; t.position.y = .05; g.add(t); }
      const f1 = new THREE.Mesh(new THREE.ConeGeometry(.16, .5, 7), new THREE.MeshStandardMaterial({ color: '#ff7a1e', emissive: '#ff5a0a', emissiveIntensity: 2.2, transparent: true, opacity: .9 }));
      const f2 = new THREE.Mesh(new THREE.ConeGeometry(.08, .3, 6), new THREE.MeshStandardMaterial({ color: '#ffe08a', emissive: '#ffd060', emissiveIntensity: 2.5 }));
      f1.position.y = .28; f2.position.y = .2; g.add(f1, f2); chamas.push([f1, f2, x * 7 + y]);
      if (luzes++ < 6) { const pl = new THREE.PointLight('#ff9a3a', 2.2, 6, 1.6); pl.position.y = .6; g.add(pl); chamas.push([pl, null, x + y]); }
      grupoTerreno.add(g);
    }
    // grade
    const pts = [];
    for (let x = 0; x <= C; x++) pts.push(x, .19, 0, x, .19, R);
    for (let y = 0; y <= R; y++) pts.push(0, .19, y, C, .19, y);
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    grupoTerreno.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: '#000000', transparent: true, opacity: .22 })));
    // mesa de madeira ao redor
    const tm = tex.mesa.clone(); tm.needsUpdate = true; tm.repeat.set((C + 16) / 4, (R + 16) / 4);
    const chao = new THREE.Mesh(new THREE.PlaneGeometry(C + 16, R + 16), new THREE.MeshStandardMaterial({ map: tm, roughness: .8 }));
    chao.rotation.x = -Math.PI / 2; chao.position.set(C / 2, -.005, R / 2); chao.receiveShadow = true; grupoTerreno.add(chao);
    const moldura = new THREE.Mesh(new THREE.BoxGeometry(C + .4, .1, R + .4), new THREE.MeshStandardMaterial({ color: '#3a2412', roughness: .7 }));
    moldura.position.set(C / 2, .03, R / 2); moldura.receiveShadow = true; grupoTerreno.add(moldura);
    // sombras cobrindo o tabuleiro
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
        const usar3d = modelosProntos() && t.raca !== 'criatura';
        const mini = usar3d ? criarPersonagem(t.aparencia || {}, t.raca || 'sarthani', { cristal: t.cristal, tamanho: tam }) : criarMiniatura(t.aparencia || {}, t.raca || 'sarthani', { cristal: t.cristal, tamanho: tam });
        if (t.oculto) mini.traverse(o => { if (o.material) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = .4; } });
        g.add(mini);
        const nome = rotulo(t.nome || '?', t.corNome || '#ffe9b8', 'rgba(10,8,6,.75)', .27 * Math.sqrt(tam));
        nome.position.y = mini.userData.altura + .2; g.add(nome);
        g.traverse(o => { o.userData.k = t.k; });
        tk = { g, chave, mini, pers: mini.userData.personagem || null, alturaMini: mini.userData.altura, fr: null, barra: null, anim: null, x: t.x, y: t.y, vigor: t.vigor };
        if (tk.pers && t.mostrarVida && t.vigorMax && t.vigor <= 0) tk.pers.tocar('caido');
        tokens.set(t.k, tk); grupoTokens.add(g);
        g.position.set(t.x + tam / 2, alturaEm(t.x, t.y), t.y + tam / 2);
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
        const chao = .12 + .3;
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
    const hit = ray.intersectObjects(grupoTokens.children, true).find(h => h.object.userData.k);
    if (hit) k = hit.object.userData.k;
    ray.ray.intersectPlane(plano, ponto);
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
    if (agua) { (agua.normalMap || agua.map).offset.set(t * .03, t * .018); }
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
      if (tk.pers) tk.pers.mixer.update(dt);
    }
    if (selecaoAnel?.parent) { selecaoAnel.rotation.z = t; selecaoAnel.scale.setScalar(1 + Math.sin(t * 4) * .04); }
    for (let i = pings.length - 1; i >= 0; i--) { const p = pings[i], a = (agora - p.t0) / 1400; p.m.scale.setScalar(1 + a * 3); p.m.material.opacity = 1 - a; if (a >= 1) { grupoEfeitos.remove(p.m); p.m.geometry.dispose(); pings.splice(i, 1); } }
    simularDados(dt, agora);
    renderer.render(cena, camera);
  }
  laco();

  let ultimo = null;
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
