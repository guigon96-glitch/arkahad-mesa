// Efeitos das habilidades do Dom: partículas por elemento, projéteis, feixes, explosões, colunas, ondas, auras e escudos.
// Tudo é criado sob demanda, anima por alguns décimos de segundo e é descartado.
import * as THREE from 'three';

let texP = null;
function tex() {
  if (texP) return texP;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return (texP = new THREE.CanvasTexture(c));
}
// como as partículas de cada elemento se movem (estilos de ESTILO_DOM)
const FISICA = {
  fogo: { sobe: 2.2, grav: -.5, esp: 1.1, tam: .24 },
  gelo: { sobe: 1.6, grav: 5, esp: 2.2, tam: .12 },
  raio: { sobe: .2, grav: 0, esp: 4.2, tam: .08 },
  folhas: { sobe: .9, grav: 1.4, esp: 1.5, tam: .15, giro: 4 },
  gotas: { sobe: 2.1, grav: 7, esp: 2, tam: .1 },
  fumaca: { sobe: .7, grav: -.3, esp: .8, tam: .5, normal: true },
  luz: { sobe: 1.1, grav: 0, esp: 2.4, tam: .16 },
  ondas: { sobe: 0, grav: 0, esp: 3.2, tam: .12, plano: true },
  vento: { sobe: .3, grav: 0, esp: 3.2, tam: .1, giro: 6, plano: true },
  cristal: { sobe: 2, grav: 6, esp: 2.4, tam: .11 },
  orbita: { sobe: .1, grav: 0, esp: 1.1, tam: .13, giro: 7 },
};
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const aditivo = (cor, op = 1) => new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });

export function criarEfeitos(grupo) {
  const lista = [];
  function add(objs, dur, upd, atraso = 0) {
    for (const o of objs) { o.visible = false; grupo.add(o); }
    lista.push({ objs, dur, upd, t0: performance.now() + atraso });
  }
  function atualizar(agora, dt) {
    for (let i = lista.length - 1; i >= 0; i--) {
      const e = lista[i], k = (agora - e.t0) / e.dur;
      if (k < 0) continue;
      for (const o of e.objs) o.visible = true;
      e.upd(Math.min(1, k), dt);
      if (k >= 1) {
        for (const o of e.objs) { grupo.remove(o); o.traverse(n => { n.geometry?.dispose(); n.material?.dispose(); }); }
        lista.splice(i, 1);
      }
    }
  }

  function particulas(p, cor, n, estilo, raio = .3, atraso = 0, dur = 1100) {
    const f = FISICA[estilo] || FISICA.luz;
    const pos = new Float32Array(n * 3), vel = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * raio, s = f.esp * (.4 + Math.random() * .8);
      pos.set([p.x + Math.cos(a) * r, p.y + Math.random() * .2, p.z + Math.sin(a) * r], i * 3);
      vel.set([Math.cos(a) * s, f.plano ? Math.random() * .3 : f.sobe * (.5 + Math.random()), Math.sin(a) * s], i * 3);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: cor, size: f.tam, map: tex(), transparent: true, depthWrite: false, blending: f.normal ? THREE.NormalBlending : THREE.AdditiveBlending });
    const pts = new THREE.Points(geo, mat); pts.frustumCulled = false;
    add([pts], dur, (k, dt) => {
      const giro = (f.giro || 0) * dt, c = Math.cos(giro), s = Math.sin(giro), amort = Math.max(0, 1 - 1.6 * dt);
      for (let i = 0; i < n * 3; i += 3) {
        if (giro) { const vx = vel[i], vz = vel[i + 2]; vel[i] = vx * c - vz * s; vel[i + 2] = vx * s + vz * c; }
        pos[i] += vel[i] * dt; pos[i + 1] += vel[i + 1] * dt; pos[i + 2] += vel[i + 2] * dt;
        vel[i + 1] -= f.grav * dt; vel[i] *= amort; vel[i + 2] *= amort;
      }
      geo.attributes.position.needsUpdate = true;
      mat.opacity = (1 - k) ** 1.3;
      if (f.normal) mat.size = f.tam * (1 + k * 2);
    }, atraso);
  }
  // anel no chão que abre e some
  function anel(p, cor, r0, r1, atraso = 0, dur = 700, sobe = 0) {
    const m = new THREE.Mesh(new THREE.RingGeometry(.86, 1, 48), aditivo(cor, .9));
    m.rotation.x = -Math.PI / 2; m.position.copy(p).add(V(0, .04, 0));
    add([m], dur, k => { const e = 1 - (1 - k) ** 3; m.scale.setScalar(r0 + (r1 - r0) * e); m.material.opacity = .9 * (1 - k); m.position.y = p.y + .04 + sobe * k; }, atraso);
  }
  function esfera(p, cor, r0, r1, atraso = 0, dur = 500, op = .8) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), aditivo(cor, op)); m.position.copy(p);
    add([m], dur, k => { m.scale.setScalar(r0 + (r1 - r0) * (1 - (1 - k) ** 2)); m.material.opacity = op * (1 - k); }, atraso);
  }
  function coluna(p, cor, raio, altura, atraso = 0, dur = 900) {
    const g = new THREE.Group(); g.position.copy(p);
    const cil = new THREE.Mesh(new THREE.CylinderGeometry(raio, raio, altura, 28, 1, true).translate(0, altura / 2, 0), aditivo(cor, .55));
    const nucleo = new THREE.Mesh(new THREE.CylinderGeometry(raio * .35, raio * .35, altura, 12, 1, true).translate(0, altura / 2, 0), aditivo('#ffffff', .7));
    g.add(cil, nucleo);
    add([g], dur, k => { const s = k < .2 ? k / .2 : 1 - (k - .2) / .8 * .7; g.scale.set(s, k < .2 ? k / .2 : 1, s); cil.material.opacity = .55 * Math.sin(Math.PI * k); nucleo.material.opacity = .7 * Math.sin(Math.PI * k); cil.rotation.y = k * 6; }, atraso);
  }
  // feixe entre dois pontos; zigue = raio elétrico que treme
  function feixe(p0, p1, cor, atraso = 0, dur = 450, zigue = false) {
    const d = p0.distanceTo(p1), meio = p0.clone().lerp(p1, .5);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 1, 8, 1, true).rotateX(Math.PI / 2), aditivo(cor, .9));
    m.position.copy(meio); m.lookAt(p1); m.scale.set(1, 1, d);
    const objs = [m];
    let linha = null;
    if (zigue) {
      linha = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 12 }, () => V())), new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, blending: THREE.AdditiveBlending }));
      linha.frustumCulled = false; objs.push(linha);
    }
    add(objs, dur, k => {
      const s = 1 + Math.sin(k * 40) * .35; m.scale.set(s * (1 - k * .7), s * (1 - k * .7), d); m.material.opacity = .9 * (1 - k * k);
      if (linha) {
        const a = linha.geometry.attributes.position;
        for (let i = 0; i < 12; i++) { const q = p0.clone().lerp(p1, i / 11); if (i && i < 11) q.add(V(Math.random() - .5, Math.random() - .5, Math.random() - .5).multiplyScalar(.35)); a.setXYZ(i, q.x, q.y, q.z); }
        a.needsUpdate = true; linha.material.opacity = 1 - k;
      }
    }, atraso);
  }
  // orbe que voa em arco; devolve quando chega (ms)
  function orbe(p0, p1, cor, estilo, atraso = 0, tam = .14) {
    const dur = Math.max(260, p0.distanceTo(p1) * 75);
    const m = new THREE.Mesh(new THREE.SphereGeometry(tam, 14, 10), new THREE.MeshStandardMaterial({ color: cor, emissive: cor, emissiveIntensity: 5 }));
    const halo = new THREE.Mesh(new THREE.SphereGeometry(tam * 2.2, 12, 8), aditivo(cor, .35)); m.add(halo);
    let rastro = 0;
    add([m], dur, (k, dt) => {
      const pos = p0.clone().lerp(p1, k); pos.y += Math.sin(k * Math.PI) * .45 * Math.min(1, p0.distanceTo(p1) / 6);
      m.position.copy(pos); halo.scale.setScalar(1 + Math.sin(k * 30) * .15);
      rastro += dt; if (rastro > .05) { rastro = 0; particulas(pos, cor, 3, estilo === 'fumaca' ? 'fumaca' : 'luz', .05, 0, 450); }
    }, atraso);
    return atraso + dur;
  }
  // escudo: bolha + casca facetada girando
  function escudo(p, cor, raio, atraso = 0, dur = 1600) {
    const g = new THREE.Group(); g.position.copy(p);
    const bolha = new THREE.Mesh(new THREE.SphereGeometry(raio, 24, 16), aditivo(cor, .18));
    const casca = new THREE.Mesh(new THREE.IcosahedronGeometry(raio * 1.02, 1), new THREE.MeshBasicMaterial({ color: cor, wireframe: true, transparent: true, opacity: .6, depthWrite: false, blending: THREE.AdditiveBlending }));
    g.add(bolha, casca);
    add([g], dur, k => { const s = k < .15 ? (k / .15) ** .5 : 1; g.scale.setScalar(s); casca.rotation.y = k * 3; casca.rotation.x = k * 1.3; const op = k > .7 ? 1 - (k - .7) / .3 : 1; bolha.material.opacity = .18 * op; casca.material.opacity = .6 * op; }, atraso);
  }
  // arco de corte (golpe corpo a corpo)
  function corte(p, cor, ang, atraso = 0) {
    const m = new THREE.Mesh(new THREE.TorusGeometry(.42, .035, 6, 24, Math.PI * .9), aditivo(cor, .95));
    m.position.copy(p); m.rotation.set(Math.PI / 2 - .5, 0, ang);
    add([m], 350, k => { m.rotation.z = ang + k * 2.4; m.material.opacity = .95 * (1 - k); m.scale.setScalar(.8 + k * .5); }, atraso);
  }

  // coreografia de uma habilidade: s = { forma, cor, estilo, raio, suprema, apoio }; pos = { p0, chao0, alvos: [{k, p, chao, acertou}], centro }
  // bater(k, atraso) sacode a miniatura atingida; tremer(p, forca, atraso) sacode tudo em volta
  function tocar(s, pos, bater, tremer) {
    const { p0, chao0, alvos, centro } = pos, cor = new THREE.Color(s.cor || '#9ad0ff'), e = s.estilo, m = s.suprema ? 1.8 : 1;
    const branco = cor.clone().lerp(new THREE.Color('#ffffff'), .6);
    // concentração: anel e brilho subindo em quem usa
    anel(chao0, cor, .2, .9, 0, 450);
    particulas(chao0, cor, Math.round(14 * m), s.apoio ? 'luz' : e, .35, 0, 600);
    if (s.suprema) { coluna(chao0, cor, .45, 2.2, 0, 700); esfera(p0, branco, .1, .9, 150, 400, .6); }
    const acertos = alvos.filter(a => a.acertou);
    const impacto = (p, t, n = 28) => { esfera(p, branco, .08, .55 * m, t, 380); particulas(p, cor, Math.round(n * m), e, .2, t, 1000); };
    const desvio = (a, t) => particulas(a.p.clone().add(V(Math.random() - .5, .2, Math.random() - .5)), cor, 8, e, .1, t, 600);
    const area = s.raio && centro;
    switch (s.forma) {
      case 'projetil': for (const a of alvos) { const t = orbe(p0, a.acertou ? a.p : a.p.clone().add(V(.7, .3, .4)), cor, e, 250, .12 * m); if (a.acertou) { impacto(a.p, t); bater(a.k, t); } else desvio(a, t); } break;
      case 'raio': for (const a of alvos) { feixe(p0, a.acertou ? a.p : a.p.clone().add(V(.6, .4, 0)), cor, 250, 480 * m, e === 'raio' || e === 'luz'); if (a.acertou) { impacto(a.p, 320); bater(a.k, 320); } else desvio(a, 320); } break;
      case 'golpe': for (const a of alvos) { corte(a.p, cor, Math.atan2(a.p.x - p0.x, a.p.z - p0.z), 300); if (a.acertou) { impacto(a.p, 330, 20); bater(a.k, 330); } else desvio(a, 330); } break;
      case 'explosao': {
        const alvo = area ? centro.clone().add(V(0, .45, 0)) : alvos[0]?.p; if (!alvo) break;
        const t = orbe(p0, alvo, cor, e, 250, .16 * m), r = (s.raio || .4) + .6;
        esfera(alvo, cor, .2, r * m, t, 650, .55); esfera(alvo, branco, .1, r * .5, t, 300, .9);
        anel(area ? centro : alvo.clone().setY(alvo.y - .4), cor, .3, r + .5, t, 800);
        particulas(alvo, cor, Math.round((40 + (s.raio || 0) * 35) * m), e, r * .4, t, 1400);
        tremer(alvo, 1.6 * m, t);
        for (const a of acertos) bater(a.k, t + 60);
        break;
      }
      case 'coluna': {
        const pts = area ? [{ p: centro, r: s.raio + .4 }] : alvos.map(a => ({ p: a.chao, r: .45, a }));
        for (const { p, r, a } of pts) {
          if (a && !a.acertou) { desvio(a, 400); continue; }
          anel(p, cor, .2, r + .3, 150, 500);
          coluna(p, cor, r, 4 * m, 300, 900);
          particulas(p, cor, Math.round((30 + r * 25) * m), e, r * .8, 400, 1300);
          esfera(p, branco, .1, r, 350, 350, .7);
        }
        tremer(area ? centro : (alvos[0]?.chao || p0), 1.2 * m, 450);
        for (const a of acertos) bater(a.k, 450);
        break;
      }
      case 'onda': {
        const longe = Math.max(1.5, ...alvos.map(a => a.chao.distanceTo(chao0)), area ? chao0.distanceTo(centro) + s.raio : 0) + .6;
        anel(chao0, cor, .3, longe, 150, 750); anel(chao0, branco, .3, longe * .8, 300, 750);
        particulas(chao0.clone().add(V(0, .3, 0)), cor, Math.round(36 * m), 'ondas', .4, 150, 900);
        for (const a of acertos) { const t = 150 + a.chao.distanceTo(chao0) / longe * 600; impacto(a.p, t, 14); bater(a.k, t); }
        if (s.suprema) tremer(chao0, 1.5, 300);
        break;
      }
      case 'aura': for (const a of acertos) {
        for (let i = 0; i < 3; i++) anel(a.chao, cor, .55, .45, 200 + i * 220, 900, a.p.y - a.chao.y + .5);
        particulas(a.chao, cor, Math.round(30 * m), s.apoio ? 'luz' : e, .4, 200, 1500);
        esfera(a.p, cor, .3, .7, 250, 900, .25);
      } break;
      case 'escudo': for (const a of acertos) { escudo(a.chao.clone().add(V(0, .5, 0)), cor, .62, 250, 1700); particulas(a.chao, cor, 20, e, .5, 250, 1100); } break;
    }
    if (s.apoio && !acertos.length) particulas(p0, '#888888', 12, 'fumaca', .2, 200, 800); // falhou: o Dom se apaga
  }
  // pulso de condição no começo do turno (queimar, veneno, regenerar)
  function pulso(p, cor) { anel(p, cor, .2, .8, 0, 600); particulas(p, cor, 16, 'luz', .3, 0, 800); }
  return { atualizar, tocar, pulso };
}
