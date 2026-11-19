// Miniaturas 3D (estilo peça de tabuleiro pintada) e dados 3D.
import * as THREE from 'three';

const cacheMat = new Map();
function mat(cor, o = {}) {
  const k = cor + JSON.stringify(o);
  if (!cacheMat.has(k)) {
    cacheMat.set(k, new THREE.MeshStandardMaterial({
      color: cor, roughness: o.r ?? .7, metalness: o.m ?? 0, flatShading: o.flat ?? true,
      emissive: o.e || '#000000', emissiveIntensity: o.ei ?? 1, transparent: !!o.op, opacity: o.op ?? 1,
    }));
  }
  return cacheMat.get(k);
}
function malha(geo, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  return m;
}
const escurecer = (hex, f) => '#' + new THREE.Color(hex).multiplyScalar(f).getHexString();

const PROP = {
  sarthani: [1, 1], zarathim: [1.02, 1.15], veloryn: [1.08, .9], draveth: [1.06, 1.12], sypheris: [.98, .92], dvarith: [.74, 1.25],
};

// a = aparência; raca = id da raça; opcoes = { cristal: cor | null, tamanho }
export function criarMiniatura(a = {}, raca = 'sarthani', opcoes = {}) {
  if (raca === 'criatura') return criarCriatura(a, opcoes);
  const g = new THREE.Group();
  const [alt, larg] = PROP[raca] || PROP.sarthani;
  const pele = a.pele || '#d9a982';
  const peleMat = raca === 'veloryn' ? mat(pele, { op: .88, e: escurecer(pele, .35), r: .35 })
    : raca === 'zarathim' ? mat(pele, { m: .55, r: .35 })
      : raca === 'sypheris' ? mat(pele, { r: .25, m: .2 })
        : raca === 'draveth' ? mat(pele, { r: .45, m: .15 }) : mat(pele, { r: .65 });
  const roupaMat = mat(a.roupa || '#7a3b2e');
  const calcaMat = mat(a.calca || '#3b2a1f');
  const metal = mat(a.corArmadura || '#8d8f93', { m: .8, r: .35 });
  const brilho = a.brilho || '#ffb347';
  const brilhoMat = mat(brilho, { e: brilho, ei: 1.6, r: .3 });

  // base de miniatura
  const base = malha(new THREE.CylinderGeometry(.42, .44, .07, 28), mat(a.base || '#e2b04a', { m: .6, r: .35, flat: false }), 0, .035, 0);
  g.add(base);
  g.add(malha(new THREE.CylinderGeometry(.36, .36, .075, 28), mat('#2a2018', { r: .9, flat: false }), 0, .037, 0));
  const y0 = .075;

  // pernas e botas
  const hp = .3 * alt;
  for (const s of [-1, 1]) {
    g.add(malha(new THREE.CylinderGeometry(.055 * larg, .05 * larg, hp, 7), calcaMat, s * .07 * larg, y0 + hp / 2 + .04, 0));
    g.add(malha(new THREE.BoxGeometry(.1 * larg, .07, .15), mat('#2a1b12'), s * .07 * larg, y0 + .035, .02));
  }
  // tronco
  const ht = .32 * alt, yT = y0 + hp + .04 + ht / 2;
  const pesada = a.armadura === 'pesada', media = a.armadura === 'media';
  const tronco = malha(new THREE.CylinderGeometry((pesada ? .155 : .135) * larg, .11 * larg, ht, 8), pesada ? metal : roupaMat, 0, yT, 0);
  g.add(tronco);
  g.add(malha(new THREE.CylinderGeometry(.118 * larg, .118 * larg, .045, 8), mat('#3a2616'), 0, yT - ht / 2 + .03, 0)); // cinto
  g.add(malha(new THREE.BoxGeometry(.05, .04, .02), mat('#d9b04a', { m: .8, r: .3 }), 0, yT - ht / 2 + .03, .12 * larg));
  if (media || pesada) for (const s of [-1, 1]) {
    const om = malha(new THREE.SphereGeometry(.075 * larg, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), metal, s * .15 * larg, yT + ht / 2 - .02, 0);
    g.add(om);
  }
  if (media) g.add(malha(new THREE.CylinderGeometry(.14 * larg, .125 * larg, ht * .55, 8), metal, 0, yT + ht * .12, 0));

  // braços
  const yOmbro = yT + ht / 2 - .04;
  for (const s of [-1, 1]) {
    const braco = malha(new THREE.CylinderGeometry(.042 * larg, .036 * larg, .27 * alt, 6), a.armadura === 'pesada' ? metal : roupaMat, s * .175 * larg, yOmbro - .13 * alt, .02);
    braco.rotation.z = s * .12; braco.rotation.x = -.25;
    g.add(braco);
    g.add(malha(new THREE.SphereGeometry(.04 * larg, 6, 5), peleMat, s * .19 * larg, yOmbro - .27 * alt, .07));
  }

  // cabeça
  const rc = raca === 'dvarith' ? .108 : .098;
  const yC = yT + ht / 2 + rc * 1.05;
  g.add(malha(new THREE.CylinderGeometry(.045, .05, .05, 6), peleMat, 0, yT + ht / 2 + .01, 0));
  const cabeca = malha(new THREE.SphereGeometry(rc, 12, 10), peleMat, 0, yC, 0);
  cabeca.scale.set(1, 1.08, 1); g.add(cabeca);
  // olhos
  const olhoCor = raca === 'veloryn' || raca === 'sypheris' ? brilho : raca === 'draveth' ? '#ffd54a' : raca === 'zarathim' ? '#ffb347' : raca === 'dvarith' ? '#ff6a2a' : '#1a1410';
  const olhoMat = ['veloryn', 'sypheris', 'draveth', 'zarathim', 'dvarith'].includes(raca) ? mat(olhoCor, { e: olhoCor, ei: 2 }) : mat(olhoCor);
  for (const s of [-1, 1]) g.add(malha(new THREE.SphereGeometry(.017, 6, 5), olhoMat, s * .038, yC + .012, rc * .9));

  // cabelo
  const cabMat = mat(a.corCabelo || '#2b1d14', { r: .8 });
  const estilo = a.capacete ? 'careca' : a.cabelo || 'curto';
  if (estilo !== 'careca') {
    const topo = malha(new THREE.SphereGeometry(rc * 1.08, 12, 8, 0, Math.PI * 2, 0, Math.PI * .46), cabMat, 0, yC + .004, -.012);
    topo.rotation.x = -.5; g.add(topo);
  }
  if (estilo === 'longo') g.add(malha(new THREE.BoxGeometry(rc * 1.9, rc * 2.2, rc * .6), cabMat, 0, yC - rc * .7, -rc * .65));
  if (estilo === 'tranca') { const t = malha(new THREE.CylinderGeometry(.025, .015, .3, 6), cabMat, 0, yC - .16, -rc * 1.05); t.rotation.x = .25; g.add(t); }
  if (estilo === 'coque') g.add(malha(new THREE.SphereGeometry(rc * .45, 8, 6), cabMat, 0, yC + rc * .7, -rc * .75));
  if (estilo === 'moicano') g.add(malha(new THREE.BoxGeometry(.035, rc * .7, rc * 2.1), cabMat, 0, yC + rc * .85, -.01));
  if (a.capacete) {
    const elmo = malha(new THREE.SphereGeometry(rc * 1.15, 12, 8, 0, Math.PI * 2, 0, Math.PI * .55), metal, 0, yC, 0);
    g.add(elmo);
    g.add(malha(new THREE.BoxGeometry(.03, rc * .9, .03), metal, 0, yC - rc * .1, rc * 1.08));
  }

  // traços de raça
  if (raca === 'draveth') {
    const chifreMat = mat('#e9dcc0', { r: .5 });
    for (const s of [-1, 1]) {
      const c = malha(new THREE.TorusGeometry(.075, .02, 6, 10, Math.PI * .9), chifreMat, s * rc * .75, yC + rc * .55, -.02);
      c.rotation.set(0, s * Math.PI / 2, s * .4); g.add(c);
    }
  }
  if (raca === 'zarathim') {
    const crista = mat(escurecer(pele, .75), { m: .5, r: .4 });
    for (let i = 0; i < 4; i++) {
      const c = malha(new THREE.ConeGeometry(.026, .09 - i * .012, 5), crista, 0, yC + rc * .95 - i * .02, .05 - i * .05);
      c.rotation.x = -.5; g.add(c);
    }
  }
  if (raca === 'dvarith' || a.barba) {
    const barba = malha(new THREE.ConeGeometry(rc * .75, rc * 1.6, 7), cabMat, 0, yC - rc * 1.05, rc * .45);
    barba.rotation.x = Math.PI + .25; g.add(barba);
    if (raca === 'dvarith') g.add(malha(new THREE.TorusGeometry(.025, .008, 5, 10), mat('#c9c9cf', { m: .9, r: .3 }), 0, yC - rc * 1.55, rc * .62));
  }
  if (raca === 'sypheris' || raca === 'sarthani') {
    // tatuagens luminosas (Sypheris) ou pintadas (Sarthani)
    const tat = raca === 'sypheris' ? brilhoMat : mat(escurecer(a.brilho || '#3a6bff', .9), { r: .6 });
    for (const s of [-1, 1]) {
      const anel = malha(new THREE.TorusGeometry(.043 * larg, .008, 5, 12), tat, s * .178 * larg, yOmbro - .1, .02);
      anel.rotation.x = Math.PI / 2; g.add(anel);
    }
    if (raca === 'sypheris') { const faixa = malha(new THREE.TorusGeometry(.136 * larg, .008, 5, 16), tat, 0, yT + .05, 0); faixa.rotation.x = Math.PI / 2; g.add(faixa); }
  }

  // capa
  if (a.capa) {
    const capa = malha(new THREE.CylinderGeometry(.15 * larg, .25 * larg, ht + hp + .02, 12, 1, true, Math.PI * .55, Math.PI * .9), mat(a.corCapa || '#2f3f6a', { r: .85 }), 0, y0 + (ht + hp) / 2 + .05, -.02);
    capa.material.side = THREE.DoubleSide; g.add(capa);
  }

  // arma e escudo
  const mao = new THREE.Vector3(.19 * larg, yOmbro - .27 * alt, .09);
  const arma = criarArma(a.arma, brilho);
  if (arma) { arma.position.copy(mao); g.add(arma); }
  if (a.arma === 'adagas' || a.arma === 'leques') { const outra = criarArma(a.arma, brilho); outra.position.set(-mao.x, mao.y, mao.z); outra.scale.x = -1; g.add(outra); }
  if (a.escudo) {
    const esc = malha(new THREE.CylinderGeometry(.15, .15, .03, 14), mat(escurecer(a.corCapa || '#2f3f6a', 1.2), { r: .6 }), -.25 * larg, yT - .02, .06);
    esc.rotation.z = Math.PI / 2; esc.rotation.y = .3; g.add(esc);
    g.add(malha(new THREE.SphereGeometry(.035, 8, 6), metal, -.27 * larg, yT - .02, .07));
  }

  // cristal regulador no peito (Aurethians)
  if (opcoes.cristal) {
    const cristal = malha(new THREE.OctahedronGeometry(.035), mat(opcoes.cristal, { e: opcoes.cristal, ei: 2.2, r: .2 }), 0, yT + .06, .13 * larg);
    cristal.scale.y = 1.5; cristal.name = 'cristal'; g.add(cristal);
  }

  const tam = Math.max(1, opcoes.tamanho || 1);
  g.scale.setScalar(tam);
  g.userData.altura = (yC + rc * 1.3) * tam;
  return g;
}

function criarArma(tipo, brilho) {
  const aco = mat('#c9ced6', { m: .85, r: .25 }), madeira = mat('#6b4423'), g = new THREE.Group();
  const add = (geo, m, x, y, z, rx = 0, rz = 0) => { const o = malha(geo, m, x, y, z); o.rotation.x = rx; o.rotation.z = rz; g.add(o); return o; };
  switch (tipo) {
    case 'espada': add(new THREE.BoxGeometry(.03, .34, .012), aco, 0, .2, 0); add(new THREE.BoxGeometry(.11, .02, .03), mat('#c9a24a', { m: .8 }), 0, .03, 0); add(new THREE.CylinderGeometry(.013, .013, .07, 5), madeira, 0, -.01, 0); break;
    case 'machado': add(new THREE.CylinderGeometry(.013, .013, .42, 5), madeira, 0, .12, 0); add(new THREE.BoxGeometry(.03, .12, .11), aco, 0, .3, .05); break;
    case 'martelo': add(new THREE.CylinderGeometry(.014, .014, .42, 5), madeira, 0, .12, 0); add(new THREE.BoxGeometry(.14, .08, .08), mat('#7d8288', { m: .8, r: .4 }), 0, .32, 0); break;
    case 'lanca': add(new THREE.CylinderGeometry(.012, .012, .8, 5), madeira, 0, .25, 0); add(new THREE.ConeGeometry(.03, .12, 5), aco, 0, .7, 0); break;
    case 'arco': { const a = add(new THREE.TorusGeometry(.2, .012, 5, 14, Math.PI), madeira, 0, .05, 0); a.rotation.z = -Math.PI / 2; add(new THREE.CylinderGeometry(.003, .003, .4, 3), mat('#e8e0c8'), -.0, .05, 0); break; }
    case 'besta': add(new THREE.BoxGeometry(.04, .04, .26), madeira, 0, .02, .08); add(new THREE.BoxGeometry(.26, .02, .03), madeira, 0, .02, .17); break;
    case 'adagas': add(new THREE.BoxGeometry(.025, .16, .01), aco, 0, .1, 0); add(new THREE.BoxGeometry(.07, .015, .02), mat('#c9a24a', { m: .8 }), 0, .02, 0); break;
    case 'leques': { const l = add(new THREE.CircleGeometry(.14, 10, 0, Math.PI), mat('#141018', { r: .3 }), 0, .1, 0); l.material.side = THREE.DoubleSide; l.rotation.y = .4; add(new THREE.CylinderGeometry(.01, .01, .14, 4), mat('#b87333', { m: .8 }), 0, .03, 0); break; }
    case 'cajado': add(new THREE.CylinderGeometry(.015, .018, .75, 6), madeira, 0, .22, 0); add(new THREE.SphereGeometry(.045, 8, 6), mat(brilho, { e: brilho, ei: 2 }), 0, .62, 0); break;
    case 'maca': add(new THREE.CylinderGeometry(.014, .014, .3, 5), madeira, 0, .08, 0); add(new THREE.DodecahedronGeometry(.055), mat('#7d8288', { m: .8, r: .4 }), 0, .25, 0); break;
    default: return null;
  }
  return g;
}

function criarCriatura(a, opcoes) {
  const g = new THREE.Group();
  const corpoCor = a.roupa || '#6b3a2a', m = mat(corpoCor, { r: .6 });
  g.add(malha(new THREE.CylinderGeometry(.42, .44, .07, 28), mat(a.base || '#c0392f', { m: .6, r: .35, flat: false }), 0, .035, 0));
  g.add(malha(new THREE.CylinderGeometry(.36, .36, .075, 28), mat('#2a2018', { r: .9 }), 0, .037, 0));
  const corpo = malha(new THREE.SphereGeometry(.2, 10, 8), m, 0, .3, 0); corpo.scale.set(1, .75, 1.5); g.add(corpo);
  for (const [x, z] of [[-.13, .17], [.13, .17], [-.13, -.17], [.13, -.17]]) {
    const p = malha(new THREE.CylinderGeometry(.035, .028, .24, 5), mat(escurecer(corpoCor, .7)), x, .17, z); p.rotation.z = x > 0 ? -.2 : .2; g.add(p);
  }
  const cab = malha(new THREE.SphereGeometry(.12, 9, 7), m, 0, .38, .3); cab.scale.set(1, .85, 1.2); g.add(cab);
  const olho = mat('#ff3a2a', { e: '#ff3a2a', ei: 2.5 });
  for (const s of [-1, 1]) g.add(malha(new THREE.SphereGeometry(.022, 6, 5), olho, s * .055, .42, .42));
  for (const s of [-1, 1]) { const c = malha(new THREE.ConeGeometry(.03, .12, 5), mat('#e9dcc0'), s * .07, .5, .26); c.rotation.x = -.6; g.add(c); }
  const cauda = malha(new THREE.ConeGeometry(.05, .35, 6), m, 0, .4, -.38); cauda.rotation.x = -1.0; g.add(cauda);
  const tam = Math.max(1, opcoes.tamanho || 1);
  g.scale.setScalar(tam);
  g.userData.altura = .6 * tam;
  return g;
}

// ---------------- Dados 3D ----------------
function geometriaD10() {
  const h = 1, a = .105, topo = [0, h, 0], fundo = [0, -h, 0];
  const U = i => { const t = i * Math.PI * 2 / 5; return [Math.cos(t), a, Math.sin(t)]; };
  const L = i => { const t = (i + .5) * Math.PI * 2 / 5; return [Math.cos(t), -a, Math.sin(t)]; };
  // 10 faces em forma de pipa (trapezoedro pentagonal)
  const geo = new THREE.BufferGeometry();
  const v2 = [];
  for (let i = 0; i < 5; i++) {
    tri2(v2, topo, U(i + 1), L(i)); tri2(v2, topo, L(i), U(i));
    tri2(v2, fundo, L(i), U(i + 1)); tri2(v2, fundo, U(i + 1), L(i + 1));
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(v2, 3));
  geo.computeVertexNormals();
  return geo;
}
function tri2(arr, p, q, r) { arr.push(...p, ...q, ...r); }

const GEO_DADO = {};
function geoDado(f) {
  if (!GEO_DADO[f]) {
    GEO_DADO[f] = f === 4 ? new THREE.TetrahedronGeometry(.95) : f === 6 ? new THREE.BoxGeometry(1.15, 1.15, 1.15)
      : f === 8 ? new THREE.OctahedronGeometry(.95) : f === 12 ? new THREE.DodecahedronGeometry(.9)
        : f === 20 ? new THREE.IcosahedronGeometry(.92) : geometriaD10();
  }
  return GEO_DADO[f];
}
export function criarDado(f, cor, material) {
  let m;
  if (material === 'osso') m = new THREE.MeshStandardMaterial({ color: '#efe4cc', roughness: .55, flatShading: true });
  else if (material === 'ferro') m = new THREE.MeshStandardMaterial({ color: cor, metalness: .85, roughness: .28, flatShading: true });
  else if (material === 'brasa') m = new THREE.MeshStandardMaterial({ color: cor, emissive: cor, emissiveIntensity: 1.1, roughness: .5, flatShading: true });
  else m = new THREE.MeshStandardMaterial({ color: cor, roughness: .12, metalness: .1, transparent: true, opacity: .82, emissive: cor, emissiveIntensity: .35, flatShading: true });
  const d = new THREE.Mesh(geoDado(f), m);
  d.castShadow = true;
  const bordas = new THREE.LineSegments(new THREE.EdgesGeometry(geoDado(f), 1), new THREE.LineBasicMaterial({ color: material === 'osso' ? cor : '#ffffff', transparent: true, opacity: material === 'osso' ? .9 : .45 }));
  d.add(bordas);
  return d;
}

export function rotulo(texto, cor = '#ffffff', fundo = 'rgba(10,8,6,.82)', escala = .5) {
  const c = document.createElement('canvas'); const ctx = c.getContext('2d');
  const fs = 44; ctx.font = `700 ${fs}px Cinzel, serif`;
  const w = Math.ceil(ctx.measureText(texto).width) + 36; c.width = w; c.height = fs + 26;
  ctx.font = `700 ${fs}px Cinzel, serif`;
  ctx.fillStyle = fundo; const r = 16;
  ctx.beginPath(); ctx.roundRect(0, 0, w, c.height, r); ctx.fill();
  ctx.fillStyle = cor; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(texto, w / 2, c.height / 2 + 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
  s.scale.set(escala * w / c.height, escala, 1); s.renderOrder = 10;
  return s;
}
