// Mesa de jogo: só uma moldura de madeira em volta da maquete, do tamanho do tabuleiro. Os dados rolam nela.
import * as THREE from 'three';
import { MESA_Y } from './terreno.js';

export const BORDA = 4; // largura da moldura em casas (cabe a fileira de dados)
let madeira = null;
function material() {
  if (madeira) return madeira;
  const l = new THREE.TextureLoader();
  const cor = l.load('/texturas/tabuas_cor.jpg'), nrm = l.load('/texturas/tabuas_nrm.jpg');
  cor.colorSpace = THREE.SRGBColorSpace;
  for (const t of [cor, nrm]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(.22, .22); t.anisotropy = 8; }
  return (madeira = new THREE.MeshStandardMaterial({ color: '#ffffff', map: cor, normalMap: nrm, roughness: .55 }));
}
// retângulo (x0,z0)-(x1,z1) com um buraco, deitado; Shape usa y = −z
const quadro = (x0, z0, x1, z1, b) => {
  const f = new THREE.Shape([[x0, -z0], [x1, -z0], [x1, -z1], [x0, -z1]].map(([x, y]) => new THREE.Vector2(x, y)));
  f.holes.push(new THREE.Path([[x0 + b, -z0 - b], [x0 + b, -z1 + b], [x1 - b, -z1 + b], [x1 - b, -z0 - b]].map(([x, y]) => new THREE.Vector2(x, y))));
  return f;
};

export function criarMesaDeJogo(mesa) {
  const C = mesa.cols, R = mesa.rows, B = BORDA, g = new THREE.Group(), mat = material();
  const peca = (forma, alto, y) => {
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(forma, { depth: alto, bevelEnabled: false }), mat);
    m.rotation.x = -Math.PI / 2; m.position.y = y; m.castShadow = true; m.receiveShadow = true; g.add(m);
  };
  peca(quadro(-B, -B, C + B, R + B, B), .8, MESA_Y - .8);              // tampo da moldura
  peca(quadro(-B - .3, -B - .3, C + B + .3, R + B + .3, .3), 1.05, MESA_Y - .8); // beirada que segura os dados
  return g;
}
