// Personagens 3D modulares (Quaternius — Universal Base Characters, Modular Character Outfits,
// Universal Animation Library, armas e criaturas; KayKit — armas e cenário). Tudo CC0. Créditos em /creditos.html
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

// ---------------- catálogo (usado pelo criador) ----------------
export const SEXOS = { m: 'Masculino', f: 'Feminino' };
export const CABELOS_3D = {
  careca: { nome: 'Careca' }, Hair_Buzzed: { nome: 'Raspado' }, Hair_BuzzedFemale: { nome: 'Curtinho' },
  Hair_SimpleParted: { nome: 'Repartido' }, Hair_Long: { nome: 'Longo' }, Hair_Buns: { nome: 'Coques' },
};
export const ROUPAS = {
  torso: { campones: 'Camisa e colete (camponês)', patrulheiro: 'Gibão de couro (patrulheiro)' },
  pernas: { campones: 'Calça de pano', patrulheiro: 'Calça de patrulheiro' },
  botas: { campones: 'Sapatos simples', patrulheiro: 'Botas altas' },
};
export const ACESSORIOS = { capuz: 'Capuz', ombreira: 'Ombreira', bracadeira: 'Braçadeiras', cinto: 'Cintos', aljava: 'Aljava nas costas' };
// mão: d = direita, e = esquerda. comp = comprimento em metros.
export const ARMAS_3D = {
  nenhuma: { nome: 'Punhos', tipo: 'briga' },
  espada: { nome: 'Espada', no: 'kk_sword_1handed', comp: .95, tipo: 'lamina' },
  sabre: { nome: 'Sabre curvo', no: 'dagger', comp: .85, tipo: 'lamina' },
  espada_longa: { nome: 'Espada longa', no: 'kk_sword_2handed', comp: 1.25, tipo: 'peso', duas: true },
  montante: { nome: 'Montante', no: 'claymore', comp: 1.55, tipo: 'peso', duas: true },
  adaga: { nome: 'Adaga', no: 'kk_dagger', comp: .42, tipo: 'lamina' },
  adaga_serrilhada: { nome: 'Adaga serrilhada', no: 'dagger_2', comp: .45, tipo: 'lamina' },
  machado: { nome: 'Machado', no: 'kk_axe_1handed', comp: .75, tipo: 'peso' },
  machadinha: { nome: 'Machadinha', no: 'axe_small', comp: .7, tipo: 'peso' },
  machado_guerra: { nome: 'Machado de guerra', no: 'axe', comp: 1.3, tipo: 'peso', duas: true },
  machado_duplo: { nome: 'Machado duplo', no: 'axe_double', comp: 1.4, tipo: 'peso', duas: true },
  martelo: { nome: 'Martelo', no: 'hammer_small', comp: .85, tipo: 'peso' },
  martelo_guerra: { nome: 'Martelo de guerra', no: 'hammer_double', comp: 1.3, tipo: 'peso', duas: true },
  foice: { nome: 'Foice de guerra', no: 'scythe', comp: 1.6, tipo: 'peso', duas: true },
  arco: { nome: 'Arco de madeira', no: 'bow_wooden', comp: 1.25, tipo: 'distancia', arco: true, duas: true },
  arco_recurvo: { nome: 'Arco recurvo', no: 'bow_wooden2', comp: 1.25, tipo: 'distancia', arco: true, duas: true },
  arco_dourado: { nome: 'Arco dourado', no: 'bow_golden', comp: 1.3, tipo: 'distancia', arco: true, duas: true },
  arco_sombrio: { nome: 'Arco sombrio', no: 'bow_evil', comp: 1.3, tipo: 'distancia', arco: true, duas: true },
  besta: { nome: 'Besta de mão', no: 'kk_crossbow_1handed', comp: .55, tipo: 'distancia', besta: true },
  besta_pesada: { nome: 'Besta pesada', no: 'kk_crossbow_2handed', comp: .8, tipo: 'distancia', besta: true, duas: true },
};
export const SECUNDARIAS = {
  nenhuma: { nome: 'Nada' },
  escudo_redondo: { nome: 'Escudo redondo', no: 'kk_shield_round', comp: .62, escudo: 2 },
  escudo_madeira: { nome: 'Escudo de madeira', no: 'shield_round', comp: .62, escudo: 2 },
  escudo_quadrado: { nome: 'Escudo de torre', no: 'kk_shield_square', comp: .8, escudo: 2 },
  escudo_brasao: { nome: 'Escudo de brasão', no: 'kk_shield_badge_color', comp: .7, escudo: 2 },
  escudo_espinhos: { nome: 'Escudo de espinhos', no: 'kk_shield_spikes_color', comp: .7, escudo: 2 },
  escudo_heraldico: { nome: 'Escudo heráldico', no: 'shield_heater', comp: .72, escudo: 2 },
  escudo_celta: { nome: 'Escudo celta dourado', no: 'shield_celtic_golden', comp: .85, escudo: 2 },
  adaga: { nome: 'Adaga (duas armas)', no: 'kk_dagger', comp: .42, arma: true },
  espada: { nome: 'Espada curta (duas armas)', no: 'kk_sword_1handed', comp: .8, arma: true },
  machadinha: { nome: 'Machadinha (duas armas)', no: 'axe_small', comp: .65, arma: true },
  bomba: { nome: 'Bomba alquímica', no: 'kk_smokebomb', comp: .16 },
  frasco: { nome: 'Caneca/frasco', no: 'kk_mug_full', comp: .16 },
};
// criaturas (NPCs do Mestre)
export const CRIATURAS_3D = {
  orc: { nome: 'Orc', arq: 'orc', alt: 1.9 }, tribal: { nome: 'Guerreiro tribal', arq: 'tribal', alt: 1.7 },
  esqueleto: { nome: 'Esqueleto guerreiro', arq: 'skeleton_warrior', alt: 1.75 }, esqueleto_mago: { nome: 'Esqueleto canalizador', arq: 'skeleton_mage', alt: 1.75 },
  esqueleto_ladino: { nome: 'Esqueleto ladino', arq: 'skeleton_rogue', alt: 1.75 }, esqueleto_menor: { nome: 'Esqueleto menor', arq: 'skeleton_minion', alt: 1.5 },
  lobo: { nome: 'Lobo', arq: 'wolf', alt: 1.0, quad: true }, raposa: { nome: 'Raposa', arq: 'fox', alt: .6, quad: true }, cervo: { nome: 'Cervo', arq: 'deer', alt: 1.5, quad: true },
  touro: { nome: 'Touro', arq: 'bull', alt: 1.6, quad: true }, gosma: { nome: 'Gosma', arq: 'yeti', alt: 1.2 },
  demonio: { nome: 'Demônio', arq: 'demon', alt: 1.9 }, demonio_azul: { nome: 'Demônio azul', arq: 'blue_demon', alt: 1.9 },
  dragao: { nome: 'Dragão jovem', arq: 'dragon_evolved', alt: 2.4, grande: true }, fantasma: { nome: 'Espectro', arq: 'ghost', alt: 1.4 },
  sapo: { nome: 'Sapo do pântano', arq: 'frog', alt: .8 }, golem: { nome: 'Golem menor', arq: 'goleling', alt: 1.3 }, cogumelo: { nome: 'Rei-cogumelo', arq: 'mushroom_king', alt: 1.5 },
};

export function armaPadrao(vocacao) {
  return { lamina: 'sabre', sentinela: 'espada', batedor: 'arco', sombra: 'adaga', alquimista: 'besta', erudito: 'adaga', orador: 'espada', curandeiro: 'martelo', canalizador: 'espada' }[vocacao] || 'espada';
}
export function secundariaPadrao(vocacao) {
  return { sentinela: 'escudo_brasao', sombra: 'adaga', alquimista: 'bomba', curandeiro: 'escudo_madeira' }[vocacao] || 'nenhuma';
}
// nomes antigos (KayKit) → novos
const ARMA_ANTIGA = { espada_grande: 'espada_longa', machado_grande: 'machado_guerra', adagas: 'adaga', cajado: 'espada', varinha: 'adaga', lanca: 'foice', maca: 'martelo', leques: 'adaga' };
const ESCUDO_ANTIGO = { redondo: 'escudo_redondo', torre: 'escudo_quadrado', brasao: 'escudo_brasao', espinhos: 'escudo_espinhos', barbaro: 'escudo_madeira', grimorio: 'nenhuma', nenhum: 'nenhuma' };
export function normalizarArma(a) { return ARMAS_3D[a] ? a : ARMA_ANTIGA[a] || 'espada'; }

// ---------------- carregamento ----------------
const carregador = new GLTFLoader();
const dados = { corpo: {}, pecas: { m: {}, f: {} }, cabelos: {}, clipes: [], armas: {}, cenario: {}, criaturas: {}, pronto: false };
let promessa = null;
let BASE = '/modelos/';
const SKIN_REF = [0.655, 0.454, 0.316];
const MASCARAS = { MI_Peasant: { arq: 'mask_peasant', l1: .2647, l2: .0182 }, MI_Ranger: { arq: 'mask_ranger', l1: .0426, l2: .0588 } };
const texLoader = new THREE.TextureLoader();

function chavePeca(nome) {
  const n = nome.toLowerCase();
  const tipo = n.includes('peasant') ? 'campones' : 'patrulheiro';
  const parte = /hood/.test(n) ? 'capuz' : /pauldron/.test(n) ? 'ombreira' : /bracer/.test(n) ? 'bracadeira' : /belt/.test(n) ? 'cinto' : /arms/.test(n) ? 'bracos' : /body/.test(n) ? 'torso' : /legs/.test(n) ? 'pernas' : /feet/.test(n) ? 'botas' : null;
  return parte ? parte + ':' + tipo : null;
}

export function carregarModelos(base = '/modelos/') {
  if (promessa) return promessa;
  BASE = base;
  const ler = n => carregador.loadAsync(base + 'q/' + n + '.glb');
  const tex = n => texLoader.loadAsync(base + 'q/' + n + '.png').then(t => { t.flipY = false; t.colorSpace = THREE.NoColorSpace; return t; });
  promessa = Promise.all([ler('corpo_m'), ler('corpo_f'), ler('roupas_m'), ler('roupas_f'), ler('cabelos'), ler('anims'), ler('armas'),
    carregador.loadAsync(base + 'cenario.glb'), tex('mask_peasant'), tex('mask_ranger')]).then(([cm, cf, rm, rf, cab, an, ar, cen, mp, mr]) => {
    MASCARAS.MI_Peasant.tex = mp; MASCARAS.MI_Ranger.tex = mr;
    dados.corpo.m = cm.scene; dados.corpo.f = cf.scene;
    for (const [s, g] of [['m', rm], ['f', rf]]) {
      g.scene.traverse(o => {
        if (!o.isSkinnedMesh) return;
        let p = o, k = null; while (p && !(k = chavePeca(p.name))) p = p.parent;
        if (!k) return;
        (dados.pecas[s][k] ||= []).push(o);
      });
    }
    cab.scene.traverse(o => { if (o.isSkinnedMesh) { let p = o; while (p && !/^Hair_/.test(p.name)) p = p.parent; if (p) (dados.cabelos[p.name] ||= []).push(o); } });
    dados.clipes = an.animations;
    for (const filho of [...ar.scene.children]) dados.armas[filho.name] = filho;
    for (const filho of [...cen.scene.children]) dados.cenario[filho.name] = filho;
    for (const s of ['m', 'f']) prepararCorpo(s);
    dados.pronto = true;
    return dados;
  });
  return promessa;
}
export function modelosProntos() { return dados.pronto; }

// ---------------- esconder o corpo sob a roupa ----------------
// Cada triângulo do corpo é ligado ao osso de maior peso. Uma peça de roupa esconde os ossos que ela cobre.
const MANTER = /^(Head|neck_01)$/;
const OSSO_GEO = new Map();
function ossoDominante(geo, skel) {
  const si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight, n = si.count, out = new Array(n);
  for (let i = 0; i < n; i++) {
    let m = 0, b = 0;
    for (let j = 0; j < 4; j++) { const w = sw.getComponent(i, j); if (w > m) { m = w; b = si.getComponent(i, j); } }
    out[i] = skel.bones[b]?.name || '';
  }
  return out;
}
const NOMES_OSSOS = new Set();
function canon(n) { while (!NOMES_OSSOS.has(n) && /_\d+$/.test(n)) n = n.replace(/_\d+$/, ''); return n; }
function prepararCorpo(s) {
  const raiz = dados.corpo[s];
  raiz.traverse(o => { if (o.isBone) NOMES_OSSOS.add(o.name); });
  raiz.traverse(o => {
    if (!o.isSkinnedMesh) return;
    OSSO_GEO.set(o.geometry, ossoDominante(o.geometry, o.skeleton));
  });
  for (const lista of Object.values(dados.pecas[s])) for (const m of lista) {
    const dom = ossoDominante(m.geometry, m.skeleton), cont = {};
    for (const b0 of dom) { const b = canon(b0); cont[b] = (cont[b] || 0) + 1; }
    // osso coberto se a peça tem uma quantidade razoável de vértices nele
    m.userData.cobre = new Set(Object.entries(cont).filter(([b, c]) => c > 25 && !MANTER.test(b)).map(([b]) => b));
  }
}
const cacheIndice = new Map();
function geometriaFiltrada(malha, esconder, chave) {
  const k = malha.geometry.uuid + chave;
  if (cacheIndice.has(k)) return cacheIndice.get(k);
  const g = malha.geometry, idx = g.index.array, osso = OSSO_GEO.get(g), novo = [];
  if (!osso) return g;
  for (let i = 0; i < idx.length; i += 3) {
    const a = idx[i], b = idx[i + 1], c = idx[i + 2];
    if (esconder.has(osso[a]) && esconder.has(osso[b]) && esconder.has(osso[c])) continue;
    novo.push(a, b, c);
  }
  const ng = new THREE.BufferGeometry();
  for (const [n, at] of Object.entries(g.attributes)) ng.setAttribute(n, at);
  ng.setIndex(novo); ng.boundingSphere = g.boundingSphere; ng.boundingBox = g.boundingBox;
  cacheIndice.set(k, ng);
  return ng;
}

// ---------------- materiais ----------------
const cacheMat = new Map();
function lin(hex) { return new THREE.Color(hex); }
function matPele(base, ap, raca) {
  const k = 'pele' + base.uuid + ap.pele + raca + (ap.tatuagem ? ap.corTatuagem : '');
  if (cacheMat.has(k)) return cacheMat.get(k);
  const m = base.clone();
  const c = new THREE.Color(ap.pele || '#c58c5c'), ref = new THREE.Color().setRGB(...SKIN_REF, THREE.SRGBColorSpace);
  m.color.setRGB(c.r / ref.r, c.g / ref.g, c.b / ref.b);
  m.roughness = .62; m.metalness = 0;
  if (raca === 'zarathim') { m.metalness = .55; m.roughness = .38; }
  if (raca === 'sypheris') { m.roughness = .3; m.metalness = .15; }
  if (raca === 'veloryn') { m.roughness = .4; }
  const padrao = raca === 'draveth' ? 1 : (raca === 'sypheris' || ap.tatuagem) ? 2 : 0;
  if (padrao) {
    const brilho = new THREE.Color(ap.corTatuagem || ap.brilho || '#5fd3ff');
    const forca = raca === 'sypheris' ? 2.2 : 0;
    m.onBeforeCompile = sh => {
      sh.uniforms.uPad = { value: padrao }; sh.uniforms.uBrilho = { value: brilho }; sh.uniforms.uForca = { value: forca };
      sh.fragmentShader = 'uniform float uPad; uniform vec3 uBrilho; uniform float uForca;\n' + sh.fragmentShader
        .replace('#include <map_fragment>', `#include <map_fragment>
          vec2 uvp = vMapUv;
          float desenho = 0.0;
          if (uPad < 1.5) {
            vec2 e = vec2(uvp.x * 90.0, uvp.y * 90.0 + mod(floor(uvp.x * 90.0), 2.0) * .5);
            vec2 f = fract(e) - .5; float d = length(f * vec2(1.0, 1.6));
            diffuseColor.rgb *= mix(.62, 1.05, smoothstep(.2, .5, d));
          } else {
            float a = sin(uvp.x * 70.0 + sin(uvp.y * 31.0) * 2.4) * sin(uvp.y * 47.0 + sin(uvp.x * 23.0) * 1.8);
            float faixa = smoothstep(.93, .985, abs(a)) * step(.55, fract(sin(dot(floor(uvp * 6.0), vec2(12.9898, 78.233))) * 43758.5453));
            desenho = faixa;
            diffuseColor.rgb = mix(diffuseColor.rgb, uForca > 0.0 ? uBrilho : diffuseColor.rgb * .35 + uBrilho * .15, faixa * .85);
          }`)
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += uBrilho * desenho * uForca;');
    };
    m.customProgramCacheKey = () => 'pele' + padrao;
  }
  cacheMat.set(k, m);
  return m;
}
function matRoupa(base, ap) {
  const cfg = MASCARAS[base.name];
  const k = 'roupa' + base.uuid + ap.corRoupa + ap.corCouro;
  if (cacheMat.has(k)) return cacheMat.get(k);
  const m = base.clone(); m.roughness = .85; m.metalness = 0;
  if (cfg?.tex) {
    const c1 = new THREE.Color(ap.corRoupa || '#6b3a2a'), c2 = new THREE.Color(ap.corCouro || '#5a3b22');
    // luminosidades médias das regiões, já em espaço linear
    const L1 = cfg.l1, L2 = cfg.l2;
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, { uMask: { value: cfg.tex }, uC1: { value: c1 }, uC2: { value: c2 }, uL1: { value: L1 }, uL2: { value: L2 } });
      sh.fragmentShader = 'uniform sampler2D uMask; uniform vec3 uC1; uniform vec3 uC2; uniform float uL1; uniform float uL2;\n' + sh.fragmentShader
        .replace('#include <map_fragment>', `#include <map_fragment>
          vec3 mk = texture2D(uMask, vMapUv).rgb;
          float lu = dot(diffuseColor.rgb, vec3(.2126, .7152, .0722));
          diffuseColor.rgb = mix(diffuseColor.rgb, clamp(uC1 * (lu / uL1), 0.0, 1.0), mk.r);
          diffuseColor.rgb = mix(diffuseColor.rgb, clamp(uC2 * (lu / uL2), 0.0, 1.0), mk.g);`);
    };
    m.customProgramCacheKey = () => 'roupa';
  }
  cacheMat.set(k, m);
  return m;
}
function matCabelo(ap) {
  const k = 'cab' + ap.corCabelo;
  if (cacheMat.has(k)) return cacheMat.get(k);
  const m = new THREE.MeshStandardMaterial({ color: ap.corCabelo || '#2b1d14', roughness: .72, metalness: .05, side: THREE.DoubleSide });
  cacheMat.set(k, m); return m;
}
function matSobrancelha(base, ap) {
  const k = 'sob' + base.uuid + ap.corCabelo;
  if (cacheMat.has(k)) return cacheMat.get(k);
  const m = base.clone(); const c = new THREE.Color(ap.corCabelo || '#2b1d14'); const r = .26;
  m.color.setRGB(c.r / r, c.g / r, c.b / r);
  cacheMat.set(k, m); return m;
}
function matOlhos(base, cor, brilha) {
  const k = 'olho' + base.uuid + cor + brilha;
  if (cacheMat.has(k)) return cacheMat.get(k);
  const m = base.clone(); const c = new THREE.Color(cor || '#5a3a1e');
  m.onBeforeCompile = sh => {
    sh.uniforms.uIris = { value: c }; sh.uniforms.uGlow = { value: brilha ? 2.5 : 0 };
    sh.fragmentShader = 'uniform vec3 uIris; uniform float uGlow; float irisM;\n' + sh.fragmentShader
      .replace('#include <map_fragment>', `#include <map_fragment>
        { vec3 cc = diffuseColor.rgb; float mx = max(cc.r, max(cc.g, cc.b)), mn = min(cc.r, min(cc.g, cc.b));
          float sat = (mx - mn) / max(mx, 1e-4); float lu = dot(cc, vec3(.2126, .7152, .0722));
          irisM = smoothstep(.3, .5, sat) * (1.0 - smoothstep(.12, .3, lu)) * step(.004, lu);
          diffuseColor.rgb = mix(cc, uIris * (.35 + lu * 4.0), irisM); }`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += uIris * irisM * uGlow;');
  };
  m.customProgramCacheKey = () => 'olhos';
  cacheMat.set(k, m); return m;
}

// ---------------- traços de raça (presos ao osso da cabeça; medidas em metros) ----------------
const PROP = { sarthani: [1, 1], zarathim: [1.05, 1.08], veloryn: [1.05, .95], draveth: [1.04, 1.06], sypheris: [1, .96], dvarith: [.8, 1.16] };
export const OLHOS_RACA = { sarthani: '#4a3020', veloryn: '#bff6ff', sypheris: '#ffffff', draveth: '#ffd54a', zarathim: '#ffae3a', dvarith: '#ff6a2a' };
const OLHO_BRILHA = new Set(['veloryn', 'sypheris', 'dvarith', 'draveth', 'zarathim']);
function tracos(raca, ap) {
  const g = new THREE.Group();
  const m = (cor, o = {}) => new THREE.MeshStandardMaterial({ color: cor, roughness: o.r ?? .5, metalness: o.m ?? 0, emissive: o.e || '#000', emissiveIntensity: o.ei ?? 1 });
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = true; g.add(o); return o; };
  // origem = centro da cabeça; +y para cima, +z para frente
  if (raca === 'draveth') {
    const chifre = m('#e9dcc0', { r: .45 });
    for (const s of [-1, 1]) {
      const curva = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(s * .04, .06, -.04), new THREE.Vector3(s * .05, .1, -.12), new THREE.Vector3(s * .03, .07, -.19)]);
      const tubo = new THREE.TubeGeometry(curva, 14, .022, 8);
      const pos = tubo.attributes.position; // afina na ponta
      for (let i = 0; i < pos.count; i++) { const t = Math.floor(i / 9) / 14; const k = 1 - t * .85; const p = curva.getPoint(Math.min(1, t)); pos.setXYZ(i, p.x + (pos.getX(i) - p.x) * k, p.y + (pos.getY(i) - p.y) * k, p.z + (pos.getZ(i) - p.z) * k); }
      tubo.computeVertexNormals();
      add(tubo, chifre, s * .055, .08, .02);
    }
  }
  if (raca === 'zarathim') {
    const crista = m('#5d6268', { m: .7, r: .3 });
    for (let i = 0; i < 7; i++) {
      const th = -.2 + i * .3, R = .118;                 // arco do topo da testa até a nuca
      add(new THREE.ConeGeometry(.02, .085 - i * .007, 5), crista, 0, Math.cos(th) * R - .005, -Math.sin(th) * R, -th);
    }
  }
  if (raca === 'dvarith') {
    const ferro = m('#c9ccd2', { m: .9, r: .25 });
    add(new THREE.TorusGeometry(.016, .006, 6, 12), ferro, 0, -.135, .085, 1.2);
    add(new THREE.TorusGeometry(.012, .005, 6, 12), ferro, -.03, -.12, .08, 1.2);
    add(new THREE.TorusGeometry(.012, .005, 6, 12), ferro, .03, -.12, .08, 1.2);
  }
  if (raca === 'veloryn') {
    const luz = m(ap.brilho || '#bff6ff', { e: ap.brilho || '#bff6ff', ei: 1.4 });
    for (let i = 0; i < 5; i++) add(new THREE.SphereGeometry(.004, 6, 4), luz, -.06 + i * .03, .065 - Math.abs(i - 2) * .006, .085);
  }
  return g;
}

// ---------------- efeito de Dom na arma (imbuir) ----------------
export const ESTILO_DOM = {
  kalthor: 'fogo', chama_abismo: 'fogo', cryon: 'gelo', voltri: 'raio', verdis: 'folhas', toxys: 'gotas', umbra: 'fumaca', lumora: 'luz', sonara: 'ondas',
  zephyr: 'vento', aquilon: 'gotas', cristalis: 'cristal', gravitio: 'orbita', chronos: 'orbita', nebulon: 'fumaca', somnis: 'orbita', psyka: 'ondas',
  aether: 'luz', spectra: 'fumaca', specula: 'cristal', geo: 'cristal', ferrar: 'raio', entropia: 'raio', dissolucao: 'fumaca', veu_caos: 'fumaca',
};
function texParticula() {
  if (texParticula.t) return texParticula.t;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return (texParticula.t = new THREE.CanvasTexture(c));
}
function criarAura(armaObj, cor, estilo, comp) {
  const g = new THREE.Group(); g.name = 'aura';
  const c = new THREE.Color(cor);
  const N = estilo === 'raio' ? 18 : 26;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3), sem = new Float32Array(N);
  for (let i = 0; i < N; i++) sem[i] = Math.random();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const tam = estilo === 'fumaca' ? .16 : estilo === 'luz' ? .12 : estilo === 'raio' ? .05 : .07;
  const mat = new THREE.PointsMaterial({ color: c, size: tam, map: texParticula(), transparent: true, depthWrite: false, blending: estilo === 'fumaca' ? THREE.NormalBlending : THREE.AdditiveBlending, opacity: estilo === 'fumaca' ? .55 : .95 });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; g.add(pts);
  // raio: linhas quebradas que piscam
  let linhas = null;
  if (estilo === 'raio') {
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(24 * 3), 3));
    linhas = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: c.clone().lerp(new THREE.Color('#fff'), .4), transparent: true, blending: THREE.AdditiveBlending }));
    linhas.frustumCulled = false; g.add(linhas);
  }
  const luz = new THREE.PointLight(c, 1.2, 2.2, 2); luz.position.y = comp * .55; g.add(luz);
  // brilho na própria arma
  const mats = [];
  armaObj.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.emissive = c.clone(); o.material.emissiveIntensity = .35; mats.push(o.material); } });
  let t = 0;
  g.userData.atualizar = dt => {
    t += dt;
    for (let i = 0; i < N; i++) {
      const s = sem[i], v = ((t * (estilo === 'fumaca' ? .35 : .8) + s) % 1);
      const y = (.18 + s * .82) * comp;
      let x = 0, z = 0, yy = y;
      if (estilo === 'fogo') { yy = y + v * .25; x = Math.sin(s * 40 + t * 6) * .03 * (1 - v); z = Math.cos(s * 30 + t * 5) * .03; }
      else if (estilo === 'fumaca') { yy = y + v * .3; x = Math.sin(s * 20 + t) * .07 * v; z = Math.cos(s * 17 + t) * .07 * v; }
      else if (estilo === 'gotas') { yy = y - v * .35; x = (s - .5) * .04; }
      else if (estilo === 'folhas' || estilo === 'orbita' || estilo === 'vento') { const a = t * (estilo === 'vento' ? 6 : 2.5) + s * 12; const r = estilo === 'vento' ? .09 : .06; x = Math.cos(a) * r; z = Math.sin(a) * r; }
      else if (estilo === 'ondas') { const a = s * 6.28, r = .03 + v * .12; x = Math.cos(a) * r; z = Math.sin(a) * r; yy = comp * (.3 + (i % 4) * .18); }
      else if (estilo === 'raio') { x = (Math.random() - .5) * .05; z = (Math.random() - .5) * .05; }
      else { x = Math.sin(s * 50) * .025; z = Math.cos(s * 50) * .025; } // luz, cristal
      pos[i * 3] = x; pos[i * 3 + 1] = yy; pos[i * 3 + 2] = z;
    }
    geo.attributes.position.needsUpdate = true;
    const pisca = estilo === 'raio' ? (Math.random() > .35 ? 1 : .2) : .85 + Math.sin(t * 9) * .15;
    mat.opacity = (estilo === 'fumaca' ? .55 : .95) * (estilo === 'gotas' ? 1 : pisca);
    luz.intensity = 1.2 * pisca;
    mats.forEach(m => m.emissiveIntensity = .25 + .35 * pisca);
    if (linhas) {
      const p = linhas.geometry.attributes.position.array; let y = comp * .2;
      for (let i = 0; i < 12; i++) {
        const y2 = y + comp * .07;
        p.set([(Math.random() - .5) * .07, y, (Math.random() - .5) * .07, (Math.random() - .5) * .07, y2, (Math.random() - .5) * .07], i * 6);
        y = y2;
      }
      linhas.geometry.attributes.position.needsUpdate = true;
      linhas.material.opacity = Math.random() > .3 ? 1 : 0;
    }
  };
  g.userData.limpar = () => { armaObj.traverse(o => { if (o.isMesh && o.userData.matOriginal) o.material = o.userData.matOriginal; }); };
  return g;
}

// ---------------- montar um personagem ----------------
// Monta o referencial da mão a partir da pose de descanso: X = direção dos dedos, Y = eixo da empunhadura
// (para o lado do polegar), Z = normal da palma. As armas têm a lâmina em +Y e a empunhadura na origem.
const LAMINA = new THREE.Euler(Math.PI / 2, 0, 0), BESTA = new THREE.Euler(Math.PI / 2, Math.PI / 2, 0), ESCUDO = new THREE.Euler(0, 0, 0);
function referencialMao(ossos, lado) {
  const mao = ossos['hand_' + lado], dedo = ossos['middle_01_' + lado], pol = ossos['thumb_01_' + lado];
  if (!mao || !dedo || !pol) return null;
  const P = o => o.getWorldPosition(new THREE.Vector3());
  const pm = P(mao), f = P(dedo).sub(pm), t = P(pol).sub(pm);
  const comp = f.length(); f.normalize();
  const g = t.clone().sub(f.clone().multiplyScalar(t.dot(f))).normalize();
  const z = new THREE.Vector3().crossVectors(f, g).normalize();
  const m = new THREE.Matrix4().makeBasis(f, g, z);
  const qMundo = new THREE.Quaternion().setFromRotationMatrix(m);
  const qMao = mao.getWorldQuaternion(new THREE.Quaternion());
  const q = qMao.clone().invert().multiply(qMundo);
  // ponto de pegada: no meio da palma, um pouco para dentro
  const pega = pm.clone().addScaledVector(f, comp * .55).addScaledVector(z, (lado === 'r' ? 1 : -1) * comp * .12);
  return { q, pos: mao.worldToLocal(pega), f, g, z };
}
function prenderArma(def, ossos, lado) {
  const src = dados.armas[def.no]; if (!src) return null;
  const osso = ossos['hand_' + lado];
  const ref = referencialMao(ossos, lado); if (!ref) return null;
  const obj = src.clone(true);
  obj.traverse(o => { if (o.isMesh) { o.castShadow = true; o.userData.matOriginal = o.material; } });
  const caixa = new THREE.Box3().setFromObject(src), t = caixa.getSize(new THREE.Vector3());
  const s = (def.comp || 1) / Math.max(t.x, t.y, t.z);
  const ajuste = new THREE.Group(); ajuste.add(obj); ajuste.scale.setScalar(s);
  const rot = def.besta ? BESTA : def.escudo ? ESCUDO : LAMINA;
  ajuste.rotation.copy(rot);
  const esc = osso.getWorldScale(new THREE.Vector3());
  const raiz = new THREE.Group();
  raiz.position.copy(ref.pos); raiz.quaternion.copy(ref.q); raiz.scale.set(1 / esc.x, 1 / esc.y, 1 / esc.z);
  raiz.add(ajuste);
  osso.add(raiz);
  return { raiz, obj: ajuste, comp: def.escudo ? 0 : (def.comp || 1) };
}

function acharOsso(ossos, nome) {
  let n = nome;
  while (!ossos[n] && /_\d+$/.test(n)) n = n.replace(/_\d+$/, '');
  return ossos[n] || ossos.root;
}

export function aparenciaCompleta(ap = {}, raca = 'sarthani') {
  const o = { ...ap };
  o.sexo = o.sexo === 'f' ? 'f' : 'm';
  if (!CABELOS_3D[o.cabelo]) o.cabelo = raca === 'zarathim' ? 'careca' : o.sexo === 'f' ? 'Hair_Long' : 'Hair_SimpleParted';
  o.torso = ROUPAS.torso[o.torso] ? o.torso : 'patrulheiro';
  o.pernas = ROUPAS.pernas[o.pernas] ? o.pernas : o.torso;
  o.botas = ROUPAS.botas[o.botas] ? o.botas : 'patrulheiro';
  o.arma = normalizarArma(o.arma);
  if (!SECUNDARIAS[o.secundaria]) o.secundaria = ESCUDO_ANTIGO[o.escudoTipo] || 'nenhuma';
  o.altura = Number(o.altura) || 1; o.porte = Number(o.porte) || 1;
  o.corRoupa ||= o.roupa || '#5a6b3a'; o.corCouro ||= o.calca || '#5b3a22';
  o.olhos ||= OLHOS_RACA[raca] || '#4a3020';
  o.pele ||= { sarthani: '#c58c5c', zarathim: '#8d9399', veloryn: '#7fb6e8', draveth: '#b8392c', sypheris: '#2e2a36', dvarith: '#9a948c' }[raca] || '#c58c5c';
  return o;
}

export function criarPersonagem(apIn = {}, raca = 'sarthani', opcoes = {}) {
  const ap = aparenciaCompleta(apIn, raca);
  const raiz = new THREE.Group();
  const corpo = SkeletonUtils.clone(dados.corpo[ap.sexo]);
  const ossos = {}; corpo.traverse(o => { if (o.isBone) ossos[o.name] = o; });
  let armature = null;
  const malhasCorpo = [];
  corpo.traverse(o => { if (o.isSkinnedMesh) { malhasCorpo.push(o); armature ||= o.parent; } });
  // peças de roupa
  const pecas = dados.pecas[ap.sexo];
  const usar = [`torso:${ap.torso}`, `bracos:${ap.torso}`, `pernas:${ap.pernas}`, `botas:${ap.botas}`];
  if (ap.capuz) usar.push('capuz:patrulheiro');
  if (ap.ombreira) usar.push('ombreira:patrulheiro');
  if (ap.bracadeira) usar.push('bracadeira:patrulheiro');
  if (ap.cinto) usar.push('cinto:patrulheiro');
  const esconder = new Set();
  const adicionar = (src, mat) => {
    const m = new THREE.SkinnedMesh(src.geometry, mat);
    m.name = src.name;
    m.bind(new THREE.Skeleton(src.skeleton.bones.map(b => acharOsso(ossos, b.name)), src.skeleton.boneInverses), src.bindMatrix);
    m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
    armature.add(m);
    return m;
  };
  for (const k of usar) for (const src of pecas[k] || []) {
    const ehPele = /Regular|Superhero/.test(src.material.name);
    adicionar(src, ehPele ? matPele(src.material, ap, raca) : matRoupa(src.material, ap));
    if (!/capuz|ombreira|cinto|bracadeira/.test(k)) for (const b of src.userData.cobre || []) esconder.add(b);
  }
  // cabelo e barba
  const cabelos = [];
  if (ap.cabelo !== 'careca' && !ap.capuz) cabelos.push(ap.cabelo);
  if (ap.barba || (raca === 'dvarith' && ap.barba !== false && ap.sexo === 'm')) cabelos.push('Hair_Beard');
  for (const c of cabelos) for (const src of dados.cabelos[c] || []) adicionar(src, matCabelo(ap));
  // corpo base: pele, olhos, sobrancelhas
  const chave = [...esconder].sort().join(',');
  for (const m of malhasCorpo) {
    const nomeMat = m.material.name;
    if (/Eyes/.test(nomeMat)) m.material = matOlhos(m.material, ap.olhos, OLHO_BRILHA.has(raca));
    else if (/Hair/.test(nomeMat)) { m.material = matSobrancelha(m.material, ap); if (raca === 'zarathim') m.visible = false; }
    else { m.material = matPele(m.material, ap, raca); if (esconder.size) m.geometry = geometriaFiltrada(m, esconder, chave); }
    m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
  }
  // traços de raça
  const cabeca = ossos.Head;
  if (cabeca) {
    corpo.updateMatrixWorld(true);
    const t = tracos(raca, ap);
    const q = cabeca.getWorldQuaternion(new THREE.Quaternion()).invert(), esc = cabeca.getWorldScale(new THREE.Vector3());
    t.quaternion.copy(q); t.scale.set(1 / esc.x, 1 / esc.y, 1 / esc.z);
    t.position.copy(cabeca.worldToLocal(cabeca.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, .09, .01))));
    cabeca.add(t);
  }
  // armas
  corpo.updateMatrixWorld(true);
  const arma = ARMAS_3D[ap.arma] || ARMAS_3D.espada;
  const sec = (arma.duas || arma.besta) ? SECUNDARIAS.nenhuma : (SECUNDARIAS[ap.secundaria] || SECUNDARIAS.nenhuma);
  const presas = [];
  if (arma.no) presas.push(prenderArma(arma, ossos, (arma.arco || arma.besta) ? 'l' : 'r'));
  if (sec.no) presas.push(prenderArma(sec, ossos, 'l'));
  if ((ap.aljava || arma.arco) && dados.armas.kk_quiver && ossos.spine_03) {
    const osso = ossos.spine_03, esc = osso.getWorldScale(new THREE.Vector3());
    const al = dados.armas.kk_quiver.clone(true); al.traverse(o => { if (o.isMesh) o.castShadow = true; });
    const g = new THREE.Group(); g.add(al);
    const qInv = osso.getWorldQuaternion(new THREE.Quaternion()).invert();
    g.quaternion.copy(qInv).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, .45)));
    g.scale.set(.55 / esc.x, .55 / esc.y, .55 / esc.z);
    g.position.copy(osso.worldToLocal(osso.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(.06, -.05, -.17))));
    osso.add(g);
  }
  // escala: altura real ~1.8 m → miniatura de 1.02 casa
  const [alt, larg] = PROP[raca] || PROP.sarthani;
  const tam = Math.max(1, opcoes.tamanho || 1);
  const s = (1.02 / 1.85) * tam;
  corpo.scale.set(s * larg * ap.porte, s * alt * ap.altura, s * larg * ap.porte);
  corpo.position.y = .075;
  raiz.add(corpo);
  // base da miniatura
  const baseMat = new THREE.MeshStandardMaterial({ color: ap.base || '#e2b04a', metalness: .6, roughness: .35 });
  const disco = new THREE.Mesh(new THREE.CylinderGeometry(.42 * tam, .44 * tam, .07, 40), baseMat); disco.position.y = .035; disco.receiveShadow = true; disco.castShadow = true; raiz.add(disco);
  const miolo = new THREE.Mesh(new THREE.CylinderGeometry(.36 * tam, .36 * tam, .075, 40), new THREE.MeshStandardMaterial({ color: '#2a2018', roughness: .9 })); miolo.position.y = .037; raiz.add(miolo);
  if (opcoes.cristal) {
    const cr = new THREE.Mesh(new THREE.OctahedronGeometry(.045 * tam), new THREE.MeshStandardMaterial({ color: opcoes.cristal, emissive: opcoes.cristal, emissiveIntensity: 2.4, roughness: .2 }));
    cr.name = 'cristal'; cr.position.set(0, .09, .38 * tam); cr.scale.y = 1.5; raiz.add(cr);
  }
  raiz.userData.altura = 1.02 * alt * ap.altura * tam + .1;
  // animações
  const mixer = new THREE.AnimationMixer(corpo);
  const clipe = n => dados.clipes.find(c => c.name === n);
  const duas = arma.duas && !arma.arco;
  const NOMES = {
    parado: sec.escudo ? 'escudo' : arma.tipo === 'briga' ? 'parado' : arma.besta || arma.arco ? 'parado' : 'guarda',
    andar: 'andar', correr: 'correr',
    ataque: arma.tipo === 'briga' ? 'soco' : (arma.arco || arma.besta) ? 'magia' : duas ? 'golpe' : sec.arma ? 'golpe3' : 'golpe2',
    magia: 'magia', dano: 'dano', morte: 'morte', vitoria: 'vitoria', defesa: sec.escudo ? 'bloqueio' : 'bloqueio', usar: 'usar', beber: 'beber', arremesso: 'arremesso',
  };
  const acoes = {};
  for (const [k, n] of Object.entries(NOMES)) { const c = clipe(n); if (c) acoes[k] = mixer.clipAction(c); }
  for (const k of ['ataque', 'magia', 'dano', 'morte', 'vitoria', 'defesa', 'usar', 'beber', 'arremesso']) if (acoes[k]) { acoes[k].setLoop(THREE.LoopOnce, 1); acoes[k].clampWhenFinished = true; }
  let atual = acoes.parado; atual?.play();
  let base2 = 'parado';
  function tocar(nome) {
    if (nome === 'caido') { base2 = 'caido'; return; }
    const prox = acoes[nome]; if (!prox) return;
    if (['parado', 'andar', 'correr'].includes(nome)) base2 = nome;
    if (prox === atual && prox.isRunning()) return;
    prox.reset().setEffectiveWeight(1).fadeIn(.18).play();
    if (atual && atual !== prox) atual.fadeOut(.18);
    atual = prox;
  }
  mixer.addEventListener('finished', e => {
    if (e.action === acoes.morte) { base2 = 'caido'; return; }
    if (e.action === atual && base2 !== 'caido') tocar(base2);
  });
  if (base2 === 'parado') mixer.setTime(Math.random() * 2);
  // imbuir arma com o Dom
  let auras = [];
  function imbuir(cor, estilo) {
    auras.forEach(a => { a.userData.limpar(); a.parent?.parent?.remove(a.parent); }); auras = [];
    if (!cor) return;
    for (const p of presas) if (p && p.comp) {
      const a = criarAura(p.obj, cor, estilo || 'luz', p.comp);
      const sup = new THREE.Group(); sup.scale.setScalar(1 / p.obj.scale.x); sup.add(a); p.obj.add(sup); auras.push(a);
    }
    if (!auras.length) { // punhos: aura nas duas mãos
      for (const h of [ossos.hand_r, ossos.hand_l]) {
        const esc = h.getWorldScale(new THREE.Vector3()); const sup = new THREE.Group(); sup.scale.set(1 / esc.x, 1 / esc.y, 1 / esc.z);
        const vazio = new THREE.Group(); const a = criarAura(vazio, cor, estilo || 'luz', .25); a.position.y = -.1; sup.add(a); h.add(sup); auras.push(a);
      }
    }
  }
  function atualizar(dt) { mixer.update(dt); for (const a of auras) a.userData.atualizar(dt); }
  raiz.userData.personagem = { mixer, tocar, acoes, corpo, imbuir, atualizar, arma };
  if (opcoes.imbuir) imbuir(opcoes.imbuir.cor, opcoes.imbuir.estilo);
  return raiz;
}

// ---------------- criaturas ----------------
const cacheCriatura = {};
function carregarCriatura(tipo) {
  const def = CRIATURAS_3D[tipo]; if (!def) return Promise.resolve(null);
  return (cacheCriatura[tipo] ||= carregador.loadAsync(BASE + 'q/criaturas/' + def.arq + '.glb'));
}
export function criarCriatura3D(tipo, opcoes = {}) {
  const def = CRIATURAS_3D[tipo];
  const raiz = new THREE.Group();
  const tam = Math.max(1, opcoes.tamanho || (def?.grande ? 2 : 1));
  const disco = new THREE.Mesh(new THREE.CylinderGeometry(.42 * tam, .44 * tam, .07, 40), new THREE.MeshStandardMaterial({ color: opcoes.base || '#7a2a2a', metalness: .5, roughness: .4 }));
  disco.position.y = .035; disco.castShadow = disco.receiveShadow = true; raiz.add(disco);
  raiz.userData.altura = (def?.alt || 1.5) / 1.85 * 1.02 * tam + .1;
  const estado = { mixer: null, acoes: {}, base: 'parado' };
  const tocar = nome => {
    if (nome === 'caido') { estado.base = 'caido'; return; }
    const a = estado.acoes[nome]; if (!a) return;
    if (['parado', 'andar', 'correr'].includes(nome)) estado.base = nome;
    if (a === estado.atual && a.isRunning()) return;
    a.reset().fadeIn(.15).play(); if (estado.atual && estado.atual !== a) estado.atual.fadeOut(.15); estado.atual = a;
  };
  raiz.userData.personagem = { tocar, atualizar: dt => estado.mixer?.update(dt), imbuir() {}, acoes: estado.acoes };
  carregarCriatura(tipo).then(g => {
    if (!g) return;
    if (!g.userData.caixa) { g.scene.updateMatrixWorld(true); g.userData.caixa = new THREE.Box3().setFromObject(g.scene); }
    const m = SkeletonUtils.clone(g.scene);
    m.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
    const caixa = g.userData.caixa, t = caixa.getSize(new THREE.Vector3());
    const alvo = (def.alt / 1.85) * 1.02 * tam;
    const s = Math.min(alvo / Math.max(t.y, .001), (def.quad ? 1.15 : .95) * tam / Math.max(t.x, t.z, .001));
    m.scale.setScalar(s); m.position.y = .075 - caixa.min.y * s;
    raiz.add(m);
    estado.mixer = new THREE.AnimationMixer(m);
    const achar = re => g.animations.find(a => re.test(a.name.replace(/^.*\|/, '')));
    const mapa = {
      parado: /^(Idle|Flying_Idle|Idle_Combat)$/, andar: /^(Walk|Walking_A|Fast_Flying)$/, correr: /^(Run|Running_A|Gallop|Fast_Flying)$/,
      ataque: /^(Attack|Punch|Bite_Front|Headbutt|Weapon|1H_Melee_Attack_Chop|Sword)$/, magia: /^(Spellcast_Shoot|Weapon|Punch|Attack)$/,
      dano: /^(HitReact|HitRecieve|Hit_A|Idle_HitReact_Left)$/, morte: /^(Death|Death_A)$/, vitoria: /^(Taunt|Jump|Idle_2)$/, usar: /^(Interact|Weapon|Punch)$/, defesa: /^(HitReact|Hit_B)$/,
    };
    for (const [k, re] of Object.entries(mapa)) {
      const c = achar(re) || (k === 'andar' || k === 'correr' ? achar(/Walk|Run|Fly/) : null) || (k === 'parado' ? g.animations[0] : null);
      if (!c) continue;
      const a = estado.mixer.clipAction(c);
      if (!['parado', 'andar', 'correr'].includes(k)) { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; }
      estado.acoes[k] = a;
    }
    estado.mixer.addEventListener('finished', e => { if (e.action === estado.acoes.morte) { estado.base = 'caido'; return; } if (e.action === estado.atual && estado.base !== 'caido') tocar(estado.base); });
    const b = estado.base; estado.base = 'parado';
    if (b === 'caido' && estado.acoes.morte) { tocar('morte'); estado.mixer.update(5); estado.base = 'caido'; } else tocar(b === 'caido' ? 'parado' : b);
    estado.mixer.setTime(Math.random() * 2);
    raiz.dispatchEvent?.({ type: 'carregou' });
  }).catch(e => console.error('criatura', tipo, e));
  return raiz;
}

// ---------------- peças de cenário ----------------
const ALTURA_PECA = { arvore: 1.7, arvores: 1.3, rocha: .45, lirio: .06, planta: .35, barril: .55, caixote: .6, caixotes: .5, saco: .4, tenda: 1.1, suporte_armas: .8, alvo: .9, carrinho: .55, balde: .35 };
export function pecaCenario(nome, caber = 1) {
  const src = dados.cenario[nome]; if (!src) return null;
  const o = src.clone(true);
  const caixa = new THREE.Box3().setFromObject(o), t = caixa.getSize(new THREE.Vector3()), c = caixa.getCenter(new THREE.Vector3());
  const tipo = Object.keys(ALTURA_PECA).find(k => nome.startsWith(k)) || 'rocha';
  const s = Math.min(ALTURA_PECA[tipo] / Math.max(t.y, .001), caber * .95 / Math.max(t.x, t.z, .001));
  const g = new THREE.Group(); o.position.set(-c.x, -caixa.min.y, -c.z); g.add(o); g.scale.setScalar(s);
  g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return g;
}
export function temCenario() { return Object.keys(dados.cenario).length > 0; }
