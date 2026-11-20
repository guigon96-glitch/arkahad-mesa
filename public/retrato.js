// Retrato do rosto do personagem para a barra do jogador.
// Desenha a cabeça do modelo 3D uma vez por aparência num renderizador pequeno e guarda a imagem.
import * as THREE from 'three';
import { carregarModelos, criarPersonagem } from './modelos.js';

const cache = new Map();
let rr = null, cena = null, cam = null;

// Devolve a imagem (data URL) ou null enquanto carrega; chama aoFicar quando ficar pronta.
export function retratoDe(ficha, aoFicar) {
  if (!ficha?.aparencia) return null;
  const chave = JSON.stringify([ficha.raca, ficha.aparencia]);
  if (cache.has(chave)) return cache.get(chave);
  cache.set(chave, null);
  carregarModelos().then(() => { cache.set(chave, desenhar(ficha)); aoFicar?.(); }).catch(() => {});
  return null;
}

function desenhar(f) {
  try {
    if (!rr) {
      rr = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      rr.setPixelRatio(1); rr.setSize(128, 128, false);
      rr.outputColorSpace = THREE.SRGBColorSpace; rr.toneMapping = THREE.ACESFilmicToneMapping;
      cena = new THREE.Scene();
      cena.add(new THREE.HemisphereLight('#fff4e0', '#3a2a1a', 1.3));
      const sol = new THREE.DirectionalLight('#ffd9a0', 2.6); sol.position.set(-1.5, 2, 2.5); cena.add(sol);
      const contra = new THREE.DirectionalLight('#7fa8ff', 1.2); contra.position.set(2, 1, -2); cena.add(contra);
      cam = new THREE.PerspectiveCamera(24, 1, .05, 10);
    }
    const mini = criarPersonagem(f.aparencia, f.raca, {});
    const p = mini.userData.personagem; p?.tocar?.('parado'); p?.atualizar?.(.4);
    cena.add(mini); mini.updateMatrixWorld(true);
    let cabeca = null;
    mini.traverse(o => { if (!cabeca && o.isBone && /head/i.test(o.name)) cabeca = o; });
    const alvo = new THREE.Vector3();
    if (cabeca) cabeca.getWorldPosition(alvo); else alvo.set(0, .9, 0);
    alvo.y += .04;
    cam.position.set(alvo.x + .1, alvo.y + .02, alvo.z + .55); cam.lookAt(alvo);
    rr.render(cena, cam);
    const url = rr.domElement.toDataURL('image/png');
    cena.remove(mini);
    return url;
  } catch { return null; }
}
