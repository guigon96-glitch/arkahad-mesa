// Personagens e cenário em alta qualidade (KayKit, por Kay Lousberg — CC0). Créditos em /creditos.html
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

export const MODELOS = {
  knight: { nome: 'Cavaleiro', roupa: [[0, 1]], capa: [[0, 1]], metal: [[3, 0], [7, 0]], capaNo: 'Knight_Cape' },
  barbarian: { nome: 'Bárbaro', roupa: [[6, 0]], capa: [[7, 0]], metal: [[3, 0]], capaNo: 'Barbarian_Cape' },
  mage: { nome: 'Mago', roupa: [[0, 1]], capa: [[2, 1]], metal: [[3, 0]], capaNo: 'Mage_Cape' },
  rogue: { nome: 'Ladino', roupa: [[0, 1]], capa: [[1, 1]], metal: [[3, 0]], capaNo: 'Rogue_Cape' },
  rogue_hooded: { nome: 'Ladino encapuzado', roupa: [[0, 1]], capa: [[1, 1]], metal: [[3, 0]], capaNo: 'Rogue_Cape' },
};
export const ARMAS_3D = {
  nenhuma: { nome: 'Nenhuma' },
  espada: { nome: 'Espada', de: 'knight', no: '1H_Sword' },
  espada_grande: { nome: 'Espada de duas mãos', de: 'knight', no: '2H_Sword', duas: true },
  machado: { nome: 'Machado', de: 'barbarian', no: '1H_Axe' },
  machado_grande: { nome: 'Machado de guerra', de: 'barbarian', no: '2H_Axe', duas: true },
  adagas: { nome: 'Adagas', de: 'rogue', no: 'Knife', extra: 'Knife_Offhand', dupla: true },
  besta: { nome: 'Besta de mão', de: 'rogue', no: '1H_Crossbow', distancia: true },
  besta_pesada: { nome: 'Besta pesada', de: 'rogue', no: '2H_Crossbow', duas: true, distancia: true },
  cajado: { nome: 'Cajado', de: 'mage', no: '2H_Staff', duas: true, magia: true },
  varinha: { nome: 'Varinha', de: 'mage', no: '1H_Wand', magia: true },
};
export const ESCUDOS_3D = {
  nenhum: { nome: 'Nenhum' },
  redondo: { nome: 'Redondo', de: 'knight', no: 'Round_Shield' },
  torre: { nome: 'Retangular', de: 'knight', no: 'Rectangle_Shield' },
  brasao: { nome: 'Brasão', de: 'knight', no: 'Badge_Shield' },
  espinhos: { nome: 'Com espinhos', de: 'knight', no: 'Spike_Shield' },
  barbaro: { nome: 'De madeira', de: 'barbarian', no: 'Barbarian_Round_Shield' },
  grimorio: { nome: 'Grimório', de: 'mage', no: 'Spellbook' },
};
export const CHAPEUS_3D = {
  nenhum: { nome: 'Nenhum' },
  elmo: { nome: 'Elmo', de: 'knight', no: 'Knight_Helmet' },
  chifres: { nome: 'Elmo de chifres', de: 'barbarian', no: 'Barbarian_Hat' },
  mago: { nome: 'Chapéu de mago', de: 'mage', no: 'Mage_Hat' },
};
// armas antigas → novas
const ARMA_ANTIGA = { martelo: 'machado', maca: 'machado', lanca: 'cajado', arco: 'besta', leques: 'adagas' };
export function modeloPadrao(vocacao) {
  return { lamina: 'barbarian', sentinela: 'knight', batedor: 'rogue', sombra: 'rogue_hooded', alquimista: 'rogue_hooded', erudito: 'mage', orador: 'knight', curandeiro: 'mage', canalizador: 'mage' }[vocacao] || 'knight';
}

const EQUIP = new Set(['1H_Sword_Offhand', 'Badge_Shield', 'Rectangle_Shield', 'Round_Shield', 'Spike_Shield', '1H_Sword', '2H_Sword', 'Knight_Helmet', '1H_Axe_Offhand', 'Barbarian_Round_Shield', '1H_Axe', '2H_Axe', 'Mug', 'Barbarian_Hat', 'Spellbook', 'Spellbook_open', '1H_Wand', '2H_Staff', 'Mage_Hat', 'Knife_Offhand', '1H_Crossbow', '2H_Crossbow', 'Knife', 'Throwable']);
const CAPAS = new Set(['Knight_Cape', 'Barbarian_Cape', 'Mage_Cape', 'Rogue_Cape']);

const carregador = new GLTFLoader();
const dados = { modelos: {}, clipes: [], cenario: {}, cabeca: {} };
let promessa = null;
export function carregarModelos(base = '/modelos/') {
  if (promessa) return promessa;
  const ler = n => carregador.loadAsync(base + n + '.glb');
  promessa = Promise.all([...Object.keys(MODELOS).map(ler), ler('animacoes'), ler('cenario')]).then(res => {
    Object.keys(MODELOS).forEach((k, i) => {
      const g = res[i]; dados.modelos[k] = g.scene;
      g.scene.updateMatrixWorld(true);
      const cab = g.scene.getObjectByProperty('isSkinnedMesh', true) && [...collect(g.scene)].find(o => o.isMesh && /_Head/.test(o.name));
      const caixa = new THREE.Box3().setFromObject(g.scene), tamanho = caixa.getSize(new THREE.Vector3());
      const cc = cab ? new THREE.Box3().setFromObject(cab) : null;
      dados.cabeca[k] = { altura: tamanho.y, centro: cc ? cc.getCenter(new THREE.Vector3()) : new THREE.Vector3(0, tamanho.y * .8, 0), raio: cc ? cc.getSize(new THREE.Vector3()).x / 2 : tamanho.y * .12 };
    });
    dados.clipes = res[Object.keys(MODELOS).length].animations;
    const cen = res[Object.keys(MODELOS).length + 1].scene;
    for (const filho of [...cen.children]) dados.cenario[filho.name] = filho;
    return dados;
  });
  return promessa;
}
export function modelosProntos() { return Object.keys(dados.modelos).length > 0; }
function* collect(o) { yield o; for (const c of o.children) yield* collect(c); }

// ---------- recoloração da textura de paleta ----------
const cacheTex = new Map();
function lum(r, g, b) { return .299 * r + .587 * g + .114 * b; }
function pintarCelula(ctx, W, H, [cx, cy], cor) {
  const w = W / 8, h = H / 4, x0 = Math.round(cx * w), y0 = Math.round(cy * h);
  const img = ctx.getImageData(x0, y0, Math.round(w), Math.round(h)), d = img.data;
  let soma = 0; for (let i = 0; i < d.length; i += 4) soma += lum(d[i], d[i + 1], d[i + 2]);
  const media = Math.max(1, soma / (d.length / 4)), alvo = new THREE.Color(cor);
  const tr = alvo.r * 255, tg = alvo.g * 255, tb = alvo.b * 255;
  for (let i = 0; i < d.length; i += 4) {
    const f = lum(d[i], d[i + 1], d[i + 2]) / media;
    d[i] = Math.min(255, tr * f); d[i + 1] = Math.min(255, tg * f); d[i + 2] = Math.min(255, tb * f);
  }
  ctx.putImageData(img, x0, y0);
}
function materialRecolorido(modelo, base, ap, olhos, brilhoOlhos) {
  const chave = modelo + JSON.stringify([ap.pele, ap.corCabelo, ap.roupa, ap.corCapa, ap.corArmadura, olhos, brilhoOlhos]);
  if (cacheTex.has(chave)) return cacheTex.get(chave);
  const img = base.map.image, W = img.width, H = img.height;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d', { willReadFrequently: true }); ctx.drawImage(img, 0, 0);
  const cfg = MODELOS[modelo];
  if (ap.pele) pintarCelula(ctx, W, H, [0, 0], ap.pele);
  if (ap.corCabelo) pintarCelula(ctx, W, H, [1, 0], ap.corCabelo);
  if (olhos) pintarCelula(ctx, W, H, [2, 0], olhos);
  if (ap.roupa) for (const cel of cfg.roupa) pintarCelula(ctx, W, H, cel, ap.roupa);
  if (ap.corCapa) for (const cel of cfg.capa) if (!cfg.roupa.some(r => r[0] === cel[0] && r[1] === cel[1])) pintarCelula(ctx, W, H, cel, ap.corCapa);
  if (ap.corArmadura) for (const cel of cfg.metal) pintarCelula(ctx, W, H, cel, ap.corArmadura);
  const tex = new THREE.CanvasTexture(c); tex.flipY = false; tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = base.map.magFilter; tex.minFilter = base.map.minFilter;
  const mat = base.clone(); mat.map = tex;
  if (brilhoOlhos) {
    const e = document.createElement('canvas'); e.width = 64; e.height = 32; const ex = e.getContext('2d');
    ex.fillStyle = '#000'; ex.fillRect(0, 0, 64, 32); ex.fillStyle = brilhoOlhos; ex.fillRect(16, 0, 8, 8);
    const et = new THREE.CanvasTexture(e); et.flipY = false; et.colorSpace = THREE.SRGBColorSpace;
    mat.emissive = new THREE.Color('#ffffff'); mat.emissiveMap = et; mat.emissiveIntensity = 2.2;
  }
  cacheTex.set(chave, mat);
  return mat;
}
const escurecer = (hex, f) => '#' + new THREE.Color(hex).multiplyScalar(f).getHexString();

// ---------- traços de raça (presos ao osso da cabeça) ----------
const PROP = { sarthani: [1, 1], zarathim: [1.04, 1.1], veloryn: [1.06, .94], draveth: [1.05, 1.08], sypheris: [1, .95], dvarith: [.8, 1.18] };
const OLHOS = { veloryn: '#bff6ff', sypheris: '#ffffff', draveth: '#ffd54a', zarathim: '#ffae3a', dvarith: '#ff6a2a' };
function tracos(raca, ap, r) {
  const g = new THREE.Group();
  const m = (cor, o = {}) => new THREE.MeshStandardMaterial({ color: cor, roughness: o.r ?? .55, metalness: o.m ?? 0, flatShading: true, emissive: o.e || '#000', emissiveIntensity: o.ei ?? 1 });
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = true; g.add(o); return o; };
  if (raca === 'draveth') {
    const chifre = m('#efe2c4');
    for (const s of [-1, 1]) {
      const c = add(new THREE.TorusGeometry(r * .55, r * .13, 6, 12, Math.PI * .85), chifre, s * r * .62, r * .75, -r * .15, 0, s * Math.PI / 2, s * .5);
      c.scale.set(1, 1.15, 1);
    }
  }
  if (raca === 'zarathim') {
    const crista = m(escurecer(ap.pele || '#7b7f86', .7), { m: .4, r: .4 });
    for (let i = 0; i < 5; i++) add(new THREE.ConeGeometry(r * .16, r * (.7 - i * .09), 5), crista, 0, r * (1.0 - i * .1), r * (.45 - i * .32), -.75);
  }
  if (raca === 'dvarith' || ap.barba) {
    const barba = add(new THREE.ConeGeometry(r * .62, r * 1.5, 8), m(ap.corCabelo || '#6a4a2a', { r: .9 }), 0, -r * .95, r * .55, Math.PI + .3);
    if (raca === 'dvarith') { add(new THREE.TorusGeometry(r * .18, r * .06, 5, 10), m('#cfd2d8', { m: .9, r: .25 }), 0, -r * 1.35, r * .78, .3); }
    barba.scale.z = .7;
  }
  if (raca === 'sypheris') {
    const brilho = m(ap.brilho || '#5fd3ff', { e: ap.brilho || '#5fd3ff', ei: 2 });
    for (const s of [-1, 1]) for (let i = 0; i < 2; i++) add(new THREE.BoxGeometry(r * .05, r * (.3 - i * .1), r * .05), brilho, s * r * (.5 + i * .12), -r * (.12 + i * .05), r * .88, 0, 0, s * .25);
    add(new THREE.BoxGeometry(r * .05, r * .28, r * .05), brilho, 0, r * .62, r * .86, -.4);
  }
  return g;
}

// ---------- montar um personagem ----------
export function criarPersonagem(ap = {}, raca = 'sarthani', opcoes = {}) {
  const modelo = MODELOS[ap.modelo] ? ap.modelo : 'knight';
  const fonte = dados.modelos[modelo];
  const raiz = new THREE.Group();
  const corpo = SkeletonUtils.clone(fonte);
  const ossos = {}; corpo.traverse(o => { if (o.isBone) ossos[o.name] = o; });
  // equipamentos: esconder tudo e mostrar o escolhido
  const remover = [];
  corpo.traverse(o => { if (EQUIP.has(o.name)) remover.push(o); if (CAPAS.has(o.name)) o.visible = !!ap.capa; });
  remover.forEach(o => o.parent.remove(o));
  const arma = ARMAS_3D[ap.arma] || ARMAS_3D[ARMA_ANTIGA[ap.arma]] || ARMAS_3D.espada;
  const colocar = (def, nomeNo) => {
    if (!def?.de) return;
    const src = dados.modelos[def.de].getObjectByName(nomeNo || def.no); if (!src) return;
    const osso = ossos[src.parent?.name]; if (!osso) return;
    const copia = src.clone(); copia.traverse(o => { o.castShadow = true; }); osso.add(copia);
  };
  colocar(arma); if (arma.extra) colocar(arma, arma.extra);
  if (!arma.duas && !arma.dupla) colocar(ESCUDOS_3D[ap.escudoTipo] || (ap.escudo ? ESCUDOS_3D.redondo : null));
  colocar(CHAPEUS_3D[ap.chapeu] || (ap.capacete ? CHAPEUS_3D.elmo : null));
  // cores
  const base = [...collect(fonte)].find(o => o.isMesh && o.material?.map)?.material;
  const olhos = OLHOS[raca] || null;
  const mat = base ? materialRecolorido(modelo, base, ap, olhos, olhos) : null;
  const corpoMalhas = new Set();
  corpo.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; if (mat && o.material?.map?.image === base.map.image) { o.material = mat; corpoMalhas.add(o); } } });
  // traços de raça
  const info = dados.cabeca[modelo];
  const cabeca = ossos.head || ossos.Head;
  if (cabeca) {
    corpo.updateMatrixWorld(true);
    const t = tracos(raca, ap, info.raio);
    const pos = cabeca.worldToLocal(info.centro.clone());
    const q = cabeca.getWorldQuaternion(new THREE.Quaternion()).invert(), esc = cabeca.getWorldScale(new THREE.Vector3());
    t.position.copy(pos); t.quaternion.copy(q); t.scale.set(1 / esc.x, 1 / esc.y, 1 / esc.z);
    cabeca.add(t);
  }
  // escala por raça e tamanho
  const [alt, larg] = PROP[raca] || PROP.sarthani;
  const tam = Math.max(1, opcoes.tamanho || 1);
  const s = (1.02 / info.altura) * tam;
  corpo.scale.set(s * larg, s * alt, s * larg);
  corpo.position.y = .075;
  raiz.add(corpo);
  // base da miniatura
  const baseMat = new THREE.MeshStandardMaterial({ color: ap.base || '#e2b04a', metalness: .6, roughness: .35 });
  const disco = new THREE.Mesh(new THREE.CylinderGeometry(.42 * tam, .44 * tam, .07, 32), baseMat); disco.position.y = .035; disco.receiveShadow = true; disco.castShadow = true; raiz.add(disco);
  const miolo = new THREE.Mesh(new THREE.CylinderGeometry(.36 * tam, .36 * tam, .075, 32), new THREE.MeshStandardMaterial({ color: '#2a2018', roughness: .9 })); miolo.position.y = .037; raiz.add(miolo);
  if (opcoes.cristal) {
    const cr = new THREE.Mesh(new THREE.OctahedronGeometry(.045 * tam), new THREE.MeshStandardMaterial({ color: opcoes.cristal, emissive: opcoes.cristal, emissiveIntensity: 2.4, roughness: .2 }));
    cr.name = 'cristal'; cr.position.set(0, .09, .38 * tam); cr.scale.y = 1.5; raiz.add(cr);
  }
  raiz.userData.altura = 1.02 * alt * tam + .1;
  // animações
  const mixer = new THREE.AnimationMixer(corpo);
  const clipe = n => dados.clipes.find(c => c.name === n);
  const parado = arma.duas ? '2H_Melee_Idle' : ap.arma === 'nenhuma' ? 'Unarmed_Idle' : 'Idle';
  const NOMES = {
    parado, andar: 'Walking_A', correr: 'Running_A',
    ataque: arma.distancia ? (arma.duas ? '2H_Ranged_Shoot' : '1H_Ranged_Shoot') : arma.dupla ? 'Dualwield_Melee_Attack_Slice' : arma.duas ? '2H_Melee_Attack_Slice' : '1H_Melee_Attack_Chop',
    magia: 'Spellcast_Shoot', dano: 'Hit_A', morte: 'Death_A', caido: 'Death_A_Pose', vitoria: 'Cheer', defesa: 'Block', usar: 'Use_Item',
  };
  const acoes = {};
  for (const [k, n] of Object.entries(NOMES)) { const c = clipe(n); if (c) acoes[k] = mixer.clipAction(c); }
  for (const k of ['ataque', 'magia', 'dano', 'morte', 'vitoria', 'defesa', 'usar']) if (acoes[k]) { acoes[k].setLoop(THREE.LoopOnce, 1); acoes[k].clampWhenFinished = true; }
  let atual = acoes.parado; atual?.play();
  let base2 = 'parado';
  function tocar(nome) {
    const prox = acoes[nome]; if (!prox) return;
    if (['parado', 'andar', 'correr', 'caido'].includes(nome)) base2 = nome;
    if (prox === atual && prox.isRunning()) return;
    prox.reset().setEffectiveWeight(1).fadeIn(.18).play();
    if (atual && atual !== prox) atual.fadeOut(.18);
    atual = prox;
  }
  mixer.addEventListener('finished', e => { if (e.action === acoes.morte) tocar('caido'); else if (e.action === atual) tocar(base2 === 'caido' ? 'caido' : base2); });
  mixer.setTime(Math.random() * 2);
  raiz.userData.personagem = { mixer, tocar, acoes, corpo };
  return raiz;
}

// ---------- peças de cenário ----------
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
