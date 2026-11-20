// Mesa de jogo em volta da maquete: tampo de madeira com o que os jogadores deixam nela
// (fichas, lápis, dados Kael/Lyra/Aranor, livros, canecas, vela e o escudo do Mestre).
import * as THREE from 'three';
import { criarDado } from './miniatura.js';
import { MESA_Y } from './terreno.js';

const BORDA = 30; // casas de tampo além do mapa
let cache = null;
function recursos() {
  if (cache) return cache;
  const l = new THREE.TextureLoader();
  const cor = l.load('/texturas/tabuas_cor.jpg'), nrm = l.load('/texturas/tabuas_nrm.jpg');
  cor.colorSpace = THREE.SRGBColorSpace;
  for (const t of [cor, nrm]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(.22, .22); t.anisotropy = 8; }
  // ficha de personagem desenhada num canvas
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 348;
  const g = cv.getContext('2d');
  g.fillStyle = '#efe6cf'; g.fillRect(0, 0, 256, 348);
  g.fillStyle = '#5a4630'; g.font = '700 26px Cinzel, serif'; g.textAlign = 'center'; g.fillText('ARKAHAD', 128, 40);
  g.strokeStyle = '#8a7558'; g.lineWidth = 2; g.strokeRect(12, 54, 232, 70);
  g.lineWidth = 1; for (let y = 146; y < 330; y += 18) { g.beginPath(); g.moveTo(16, y); g.lineTo(240, y); g.stroke(); }
  for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(36 + i * 46, 89, 16, 0, 7); g.stroke(); }
  const ficha = new THREE.CanvasTexture(cv); ficha.colorSpace = THREE.SRGBColorSpace;
  const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .8, ...o });
  return cache = {
    madeira: M('#ffffff', { map: cor, normalMap: nrm, roughness: .55 }),
    ficha: M('#ffffff', { map: ficha, roughness: .95 }),
    lapis: M('#e8b52a', { roughness: .5 }), grafite: M('#3a2c1e'), ceramica: M('#c9c0b0', { roughness: .35 }), cafe: M('#2a1608', { roughness: .15 }),
    vela: M('#f2e6c8', { roughness: .6 }), chama: new THREE.MeshBasicMaterial({ color: '#ffcf6a' }),
    capas: ['#6a1e1e', '#1e3a5a', '#2e4a22', '#4a2a5a'].map(c => M(c, { roughness: .7 })), paginas: M('#e8dcc0'),
    escudo: M('#4a2e1a', { roughness: .6 }),
  };
}

export function criarMesaDeJogo(mesa) {
  const r = recursos(), C = mesa.cols, R = mesa.rows, g = new THREE.Group(), y0 = MESA_Y;
  // tampo com um buraco do tamanho do mapa (a maquete fica encaixada)
  const L = BORDA, f = new THREE.Shape([[-L, L], [C + L, L], [C + L, -R - L], [-L, -R - L]].map(([x, y]) => new THREE.Vector2(x, y)));
  f.holes.push(new THREE.Path([[0, 0], [0, -R], [C, -R], [C, 0]].map(([x, y]) => new THREE.Vector2(x, y))));
  const tampo = new THREE.Mesh(new THREE.ExtrudeGeometry(f, { depth: .8, bevelEnabled: false }), r.madeira);
  tampo.rotation.x = -Math.PI / 2; tampo.position.y = y0 - .8; tampo.receiveShadow = true; g.add(tampo);

  const por = (o, x, z, ry = 0, dy = 0) => { o.position.set(x, y0 + dy, z); o.rotation.y = ry; o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); g.add(o); return o; };
  const malha = (geo, mat) => new THREE.Mesh(geo, mat);
  let semente = C * 31 + R * 17;
  const acaso = () => (semente = (semente * 16807) % 2147483647) / 2147483647;

  // lugar de um jogador: ficha, lápis e os três dados do sistema
  const lugar = (x, z, ry) => {
    const s = new THREE.Group();
    const fi = malha(new THREE.PlaneGeometry(3.4, 4.6), r.ficha); fi.rotation.x = -Math.PI / 2; fi.position.y = .01; s.add(fi);
    const lp = new THREE.Group();
    const corpo = malha(new THREE.CylinderGeometry(.09, .09, 3, 6), r.lapis); corpo.rotation.z = Math.PI / 2; lp.add(corpo);
    const ponta = malha(new THREE.ConeGeometry(.09, .35, 6), r.grafite); ponta.rotation.z = -Math.PI / 2; ponta.position.x = 1.67; lp.add(ponta);
    lp.position.set(2.3, .09, .4); lp.rotation.y = 1.2 + acaso() * .4; s.add(lp);
    [['#d9a23a', 10], ['#3f78e0', 10], ['#d23a3a', 20]].forEach(([cor, faces], i) => {
      const d = criarDado(faces, cor, 'cristal'); d.scale.setScalar(.34); d.position.set(-2.5 + (i % 2) * .8, .3, -1.2 + i * .9); d.rotation.set(acaso() * 6, acaso() * 6, acaso() * 6); s.add(d);
    });
    por(s, x, z, ry + (acaso() - .5) * .3);
  };
  const livros = (x, z) => {
    const s = new THREE.Group(); let h = 0;
    for (let i = 0; i < 2 + Math.floor(acaso() * 2); i++) {
      const alto = .45 + acaso() * .25, b = new THREE.Group();
      b.add(malha(new THREE.BoxGeometry(3, alto, 4), r.capas[i % r.capas.length]));
      const pg = malha(new THREE.BoxGeometry(2.86, alto * .8, 3.9), r.paginas); pg.position.x = .1; b.add(pg);
      b.position.y = h + alto / 2; b.rotation.y = (acaso() - .5) * .6; s.add(b); h += alto;
    }
    por(s, x, z, acaso() * 6);
  };
  const caneca = (x, z) => {
    const s = new THREE.Group();
    const copo = malha(new THREE.CylinderGeometry(.8, .7, 1.7, 20), r.ceramica); copo.position.y = .85; s.add(copo);
    const cafe = malha(new THREE.CircleGeometry(.72, 20), r.cafe); cafe.rotation.x = -Math.PI / 2; cafe.position.y = 1.55; s.add(cafe);
    const alca = malha(new THREE.TorusGeometry(.42, .12, 8, 16, Math.PI), r.ceramica); alca.rotation.z = -Math.PI / 2; alca.position.set(.78, .85, 0); s.add(alca);
    por(s, x, z, acaso() * 6);
  };
  const vela = (x, z) => {
    const s = new THREE.Group();
    const c = malha(new THREE.CylinderGeometry(.3, .3, 1.4, 14), r.vela); c.position.y = .7; s.add(c);
    const fl = malha(new THREE.SphereGeometry(.12, 8, 6), r.chama); fl.scale.y = 2; fl.position.y = 1.62; s.add(fl);
    const luz = new THREE.PointLight('#ffb050', 2.5, 7, 2); luz.position.y = 1.9; s.add(luz);
    por(s, x, z);
  };
  // escudo do Mestre: três painéis em pé, abertos para o lado dele
  const escudo = (x, z) => {
    const s = new THREE.Group();
    [-1, 0, 1].forEach(i => { const p = malha(new THREE.BoxGeometry(2.6, 1.6, .08), r.escudo); p.position.set(i * 2.45, .8, Math.abs(i) * .55); p.rotation.y = -i * .45; s.add(p); });
    por(s, x, z, Math.PI);
  };

  escudo(C / 2, -4.5);
  const n = Math.max(1, Math.min(4, Math.round(C / 9)));
  for (let i = 0; i < n; i++) lugar((C * (i + .5)) / n, R + 4, 0);
  lugar(-4, R / 2, Math.PI / 2); lugar(C + 4, R / 2, -Math.PI / 2);
  livros(-4.5, -4.5); livros(C + 5, R + 5.5);
  caneca(C + 3.5, -3); caneca(-3, R + 3.5);
  vela(C + 4, -6.5);
  return g;
}
