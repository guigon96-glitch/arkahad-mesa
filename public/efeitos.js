// Efeitos das habilidades do Dom: partículas por elemento, projéteis, feixes, explosões, colunas, ondas, auras e escudos.
// Visual em shader (fogo que sobe, gelo cristalino, raio que treme, fumaça, energia), círculo mágico no chão,
// onda de choque e escudo com borda brilhante. Texturas de partícula desenhadas em canvas (sem arquivos).
// Tudo é criado sob demanda, anima por alguns décimos de segundo e é descartado.
import * as THREE from 'three';

// ---------------- texturas de partícula por elemento ----------------
const TEX = {};
function desenhar(tipo) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const brilho = (r, a = 1) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, r); g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(.4, `rgba(255,255,255,${a * .45})`); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); };
  x.fillStyle = '#fff'; x.strokeStyle = '#fff'; x.lineCap = 'round';
  if (tipo === 'fogo') { // labareda em gota
    const g = x.createRadialGradient(32, 40, 0, 32, 36, 28); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.5, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.beginPath(); x.moveTo(32, 4); x.bezierCurveTo(50, 26, 56, 46, 32, 60); x.bezierCurveTo(8, 46, 14, 26, 32, 4); x.fill();
  } else if (tipo === 'gelo') { // floco de 6 pontas
    brilho(14, .7); x.lineWidth = 3;
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3, cx = Math.cos(a), sy = Math.sin(a); x.beginPath(); x.moveTo(32, 32); x.lineTo(32 + cx * 28, 32 + sy * 28); x.stroke();
      for (const d of [14, 21]) { x.beginPath(); x.moveTo(32 + cx * d, 32 + sy * d); x.lineTo(32 + Math.cos(a + .5) * (d + 6), 32 + Math.sin(a + .5) * (d + 6)); x.moveTo(32 + cx * d, 32 + sy * d); x.lineTo(32 + Math.cos(a - .5) * (d + 6), 32 + Math.sin(a - .5) * (d + 6)); x.stroke(); } }
  } else if (tipo === 'raio' || tipo === 'luz') { // estrela de 4 pontas
    brilho(tipo === 'raio' ? 10 : 18);
    const g = x.createLinearGradient(0, 32, 64, 32); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, '#fff'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 30, 64, 4); x.save(); x.translate(32, 32); x.rotate(Math.PI / 2); x.translate(-32, -32); x.fillRect(0, 30, 64, 4); x.restore();
  } else if (tipo === 'folhas') { // folha com nervura
    x.globalAlpha = .9; x.beginPath(); x.moveTo(10, 54); x.quadraticCurveTo(12, 10, 54, 10); x.quadraticCurveTo(52, 50, 10, 54); x.fill();
    x.globalCompositeOperation = 'destination-out'; x.lineWidth = 2; x.beginPath(); x.moveTo(12, 52); x.lineTo(50, 14); x.stroke();
  } else if (tipo === 'gotas') { // gota
    const g = x.createRadialGradient(28, 40, 2, 32, 40, 20); g.addColorStop(0, '#fff'); g.addColorStop(1, 'rgba(255,255,255,.2)');
    x.fillStyle = g; x.beginPath(); x.moveTo(32, 6); x.bezierCurveTo(46, 30, 52, 42, 32, 58); x.bezierCurveTo(12, 42, 18, 30, 32, 6); x.fill();
  } else if (tipo === 'fumaca') { // nuvem irregular
    for (let i = 0; i < 9; i++) { const px = 18 + Math.random() * 28, py = 18 + Math.random() * 28, r = 8 + Math.random() * 12; const g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); }
  } else if (tipo === 'ondas') { // anel
    x.lineWidth = 5; x.globalAlpha = .9; x.beginPath(); x.arc(32, 32, 22, 0, Math.PI * 2); x.stroke(); brilho(12, .4);
  } else if (tipo === 'vento') { // risco curvo
    x.lineWidth = 4; for (const [r, a] of [[22, 1], [15, .6]]) { x.globalAlpha = a; x.beginPath(); x.arc(32, 32, r, -.3, 2.2); x.stroke(); }
  } else if (tipo === 'cristal') { // losango facetado
    x.globalAlpha = .95; x.beginPath(); x.moveTo(32, 2); x.lineTo(48, 32); x.lineTo(32, 62); x.lineTo(16, 32); x.closePath(); x.fill();
    x.globalCompositeOperation = 'destination-out'; x.globalAlpha = .5; x.beginPath(); x.moveTo(32, 2); x.lineTo(32, 62); x.lineTo(16, 32); x.closePath(); x.fill();
  } else if (tipo === 'orbita') { // runa: círculo com traço
    brilho(10, .8); x.lineWidth = 3; x.beginPath(); x.arc(32, 32, 20, 0, Math.PI * 2); x.stroke(); x.beginPath(); x.moveTo(32, 14); x.lineTo(32, 50); x.moveTo(22, 26); x.lineTo(42, 38); x.stroke();
  } else brilho(32);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const tex = tipo => (TEX[tipo] ||= desenhar(tipo));

// como as partículas de cada elemento se movem (estilos de ESTILO_DOM)
const FISICA = {
  fogo: { sobe: 2.2, grav: -.5, esp: 1.1, tam: .26 },
  gelo: { sobe: 1.6, grav: 5, esp: 2.2, tam: .17 },
  raio: { sobe: .2, grav: 0, esp: 4.2, tam: .16 },
  folhas: { sobe: .9, grav: 1.4, esp: 1.5, tam: .17, giro: 4 },
  gotas: { sobe: 2.1, grav: 7, esp: 2, tam: .12 },
  fumaca: { sobe: .7, grav: -.3, esp: .8, tam: .6, normal: true },
  luz: { sobe: 1.1, grav: 0, esp: 2.4, tam: .2 },
  ondas: { sobe: 0, grav: 0, esp: 3.2, tam: .18, plano: true },
  vento: { sobe: .3, grav: 0, esp: 3.2, tam: .2, giro: 6, plano: true },
  cristal: { sobe: 2, grav: 6, esp: 2.4, tam: .15 },
  orbita: { sobe: .1, grav: 0, esp: 1.1, tam: .2, giro: 7 },
};
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const aditivo = (cor, op = 1) => new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });

// ---------------- shaders ----------------
const RUIDO = `
float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h2(i), h2(i + vec2(1., 0.)), f.x), mix(h2(i + vec2(0., 1.)), h2(i + vec2(1., 1.)), f.x), f.y); }
float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 4; i++) { s += a * vn(p); p *= 2.03; a *= .5; } return s; }`;
const VERT_FRES = `varying vec2 vUv; varying float vFres;
void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.); vec3 n = normalize(normalMatrix * normal);
  vFres = pow(1. - abs(dot(n, normalize(-mv.xyz))), 1.5); gl_Position = projectionMatrix * mv; }`;
const VERT_PLANO = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
// 0 fogo · 1 gelo/cristal · 2 raio · 3 fumaça · 4 energia (luz, plantas, água, som…)
const MODO = { fogo: 0, gelo: 1, cristal: 1, raio: 2, fumaca: 3 };
const FRAG_ENERGIA = `uniform vec3 uCor; uniform float uT, uOp, uModo; uniform sampler2D uTex; varying vec2 vUv; varying float vFres;${RUIDO}
void main(){
  vec2 p = vUv * vec2(6., 3.); float n;
  if (uModo < .5) { n = fbm(p + vec2(0., -uT * 2.6)); n = pow(clamp(n * 1.5 * (1.15 - vUv.y), 0., 1.), 1.6); }
  else if (uModo < 1.5) { vec2 g = p * 1.6; float v = fbm(g); n = 1. - smoothstep(0., .1, abs(fract(v * 5. + uT * .15) - .5)); n = n * .8 + fbm(g * 2.5) * .35; }
  else if (uModo < 2.5) { n = step(.6, vn(p * 3. + floor(uT * 30.))) * .9 + fbm(p * 4. + uT * 9.) * .45; }
  else if (uModo < 3.5) { n = fbm(p * .8 + vec2(uT * .3, -uT * .7)); }
  else { n = fbm(p + vec2(uT * 1.1, -uT * 1.6)) * .85 + .25; }
  // textura pintada (Gemini) correndo por cima do ruído: dá forma de chama, veio, raio ou fumaça
  float tx = texture2D(uTex, vUv * vec2(2., 1.) + vec2(uT * .04, uModo < .5 ? -uT * .35 : -uT * .12)).r;
  n = clamp(n * .55 + tx * (.35 + n * .6), 0., 1.);
  float a = n * uOp * (.35 + vFres);
  vec3 c = uModo > 2.5 && uModo < 3.5 ? mix(uCor * .3, vec3(.12), .5) : mix(uCor, vec3(1.), pow(n, 3.) * .85) * 1.7;
  gl_FragColor = vec4(c, a);
}`;
// círculo mágico: anéis, hexagrama girando e runas
const FRAG_CIRCULO = `uniform vec3 uCor; uniform float uT, uOp; varying vec2 vUv;
void main(){
  vec2 p = vUv * 2. - 1.; float r = length(p), ang = atan(p.y, p.x);
  float m = smoothstep(.025, 0., abs(r - .94)) + smoothstep(.018, 0., abs(r - .8)) * .8 + smoothstep(.014, 0., abs(r - .46)) * .6;
  float a2 = ang + uT * .7;
  m += step(.8, r) * step(r, .93) * step(.55, fract(a2 * 3.8197)) * (.45 + .45 * sin(a2 * 40.));
  for (int i = 0; i < 2; i++) { float o = float(i) * 1.0472 - uT * .45; float d = .5 / cos(mod(ang + o, 2.0944) - 1.0472); m += smoothstep(.016, 0., abs(r - d * .8)) * .75; }
  m *= step(r, 1.) * (.75 + .25 * sin(uT * 6.));
  gl_FragColor = vec4(mix(uCor, vec3(1.), .3) * 1.8, m * uOp);
}`;
// onda de choque: faixa com borda viva e rastro para dentro
const FRAG_ONDA = `uniform vec3 uCor; uniform float uR, uOp, uT; varying vec2 vUv;${RUIDO}
void main(){
  vec2 p = vUv * 2. - 1.; float r = length(p);
  float borda = smoothstep(.06, 0., abs(r - uR)), rastro = smoothstep(uR, uR - .35, r) * step(r, uR) * .35;
  float n = .7 + .3 * vn(vec2(atan(p.y, p.x) * 6., uT * 3.));
  gl_FragColor = vec4(mix(uCor, vec3(1.), borda * .5) * 1.8, (borda + rastro) * n * uOp);
}`;
// escudo: borda brilhante (fresnel), colmeia e cintilação
const FRAG_ESCUDO = `uniform vec3 uCor; uniform float uT, uOp; varying vec2 vUv; varying float vFres;${RUIDO}
void main(){
  vec2 g = vUv * vec2(18., 9.); g.x += mod(floor(g.y), 2.) * .5;
  vec2 f = abs(fract(g) - .5); float hex = smoothstep(.42, .5, max(f.x * 1.15 + f.y * .6, f.y * 1.2));
  float onda = .5 + .5 * sin(vUv.y * 20. - uT * 6.);
  float a = (vFres * 1.3 + hex * .35 * onda + .06) * uOp * (.85 + .15 * vn(g + uT * 4.));
  gl_FragColor = vec4(mix(uCor, vec3(1.), vFres * .5) * 1.6, a);
}`;
function matShader(frag, vert, cor, extra = {}, normal = false) {
  return new THREE.ShaderMaterial({
    uniforms: { uCor: { value: new THREE.Color(cor) }, uT: { value: Math.random() * 10 }, uOp: { value: 1 }, ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, { value: v }])) },
    vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: normal ? THREE.NormalBlending : THREE.AdditiveBlending,
  });
}
// texturas de efeito em tons de cinza (geradas no Gemini) em public/texturas/fx/
const TEX_FX = {}, ARQ_FX = { fogo: 'fogo', gelo: 'gelo', cristal: 'gelo', raio: 'raio', fumaca: 'fumaca' };
function texFx(estilo) {
  const n = ARQ_FX[estilo] || 'energia';
  return (TEX_FX[n] ||= new THREE.TextureLoader().load(`/texturas/fx/${n}.jpg`, t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; }));
}
const matEnergia = (cor, estilo) => matShader(FRAG_ENERGIA, VERT_FRES, cor, { uModo: MODO[estilo] ?? 4, uTex: texFx(estilo) }, estilo === 'fumaca');

let TEX_BRILHO = null;
function texBrilho() {
  if (TEX_BRILHO) return TEX_BRILHO;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); return (TEX_BRILHO = new THREE.CanvasTexture(c));
}
// chama contínua (fogueira, rastro de fogo, quem está queimando): duas camadas de fogo em shader, brilho no chão e fagulhas que sobem.
// Quem cria chama g.userData.atualizar(dt) a cada quadro e g.userData.limpar() ao remover.
export function criarChama({ raio = .3, altura = .5, cor = '#ff5a12', fagulhas = 10, op = 1 } = {}) {
  const g = new THREE.Group(), mats = [];
  const camada = (r, h, c, o) => {
    const m = matEnergia(c, 'fogo'); m.uniforms.uOp.value = o; mats.push(m);
    const malha = new THREE.Mesh(new THREE.CylinderGeometry(r * .2, r, h, 16, 1, true).translate(0, h / 2, 0), m);
    malha.renderOrder = 5; g.add(malha); return malha;
  };
  const fora = camada(raio, altura, cor, op), dentro = camada(raio * .55, altura * .7, '#ffc65a', op);
  const brilho = new THREE.Mesh(new THREE.CircleGeometry(raio * 1.6, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: cor, map: texBrilho(), transparent: true, opacity: .6 * op, depthWrite: false, blending: THREE.AdditiveBlending }));
  brilho.position.y = .02; g.add(brilho);
  const pos = new Float32Array(fagulhas * 3), sem = Array.from({ length: fagulhas }, () => [Math.random(), Math.random() * 6.28, .5 + Math.random() * .7]);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#ffb050', size: .07, map: texBrilho(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: op }));
  pts.frustumCulled = false; g.add(pts);
  let t = Math.random() * 10;
  g.userData.atualizar = dt => {
    t += dt;
    for (const m of mats) m.uniforms.uT.value = t;
    const f = 1 + Math.sin(t * 11) * .07 + Math.sin(t * 23) * .04;
    fora.scale.set(1, f, 1); dentro.scale.set(1, 2 - f, 1); fora.rotation.y = t * .7; dentro.rotation.y = -t * 1.1;
    brilho.material.opacity = (.5 + Math.sin(t * 17) * .1) * op;
    for (let i = 0; i < fagulhas; i++) {
      const [s0, a, v] = sem[i], k = (t * v * .55 + s0) % 1, r = raio * (1 - k * .6) * .8, w = a + t * 1.5 * v;
      pos[i * 3] = Math.cos(w) * r; pos[i * 3 + 1] = k * altura * 1.9; pos[i * 3 + 2] = Math.sin(w) * r;
    }
    geo.attributes.position.needsUpdate = true;
  };
  g.userData.limpar = () => g.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); });
  return g;
}
// céu estrelado de fundo: estrelas com brilho em lei de potência (muitas fracas, poucas fortes), cor pela temperatura
// (azuladas a alaranjadas), cintilação leve, e a Via Láctea: faixa de estrelas densas + brilho difuso com poeira escura.
// Fica centrado na câmera (quem cria copia a posição a cada quadro).
export function criarEstrelas(n = 7000, raio = 240) {
  const g = new THREE.Group(), galaxia = new THREE.Vector3(.35, .78, .52).normalize();
  const u = new THREE.Vector3(1, 0, 0).cross(galaxia).normalize(), w = galaxia.clone().cross(u);
  const gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(6.2832 * Math.random());
  const PALETA = [[.66, .75, 1], [.82, .88, 1], [1, 1, 1], [1, .96, .86], [1, .86, .66], [1, .74, .52]], PESO = [.04, .14, .3, .26, .16, .1];
  const pos = new Float32Array(n * 3), cor = new Float32Array(n * 3), tam = new Float32Array(n), fase = new Float32Array(n), d = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const naFaixa = i < n * .45;
    if (naFaixa) { const a = Math.random() * 6.2832; d.copy(u).multiplyScalar(Math.cos(a)).addScaledVector(w, Math.sin(a)).addScaledVector(galaxia, gauss() * .1).normalize(); }
    else { const z = Math.random() * 2 - 1, f = Math.random() * 6.2832, r = Math.sqrt(1 - z * z); d.set(r * Math.cos(f), z, r * Math.sin(f)); }
    pos.set([d.x * raio, d.y * raio, d.z * raio], i * 3);
    const m = Math.random() ** 7, b = (.22 + m * .78) * (naFaixa ? .7 : 1);
    let k = 0, s = Math.random(); while (k < PESO.length - 1 && (s -= PESO[k]) > 0) k++;
    const c = PALETA[k], branco = 1 - m; // as fracas parecem brancas
    cor.set([(c[0] + (1 - c[0]) * branco * .6) * b, (c[1] + (1 - c[1]) * branco * .6) * b, (c[2] + (1 - c[2]) * branco * .6) * b], i * 3);
    tam[i] = 1.1 + m * 3.6; fase[i] = Math.random() * 100;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aCor', new THREE.BufferAttribute(cor, 3));
  geo.setAttribute('aTam', new THREE.BufferAttribute(tam, 1)); geo.setAttribute('aFase', new THREE.BufferAttribute(fase, 1));
  const uT = { value: 0 }, dpr = Math.min(2, window.devicePixelRatio || 1);
  const pts = new THREE.Points(geo, new THREE.ShaderMaterial({
    uniforms: { uT, uDpr: { value: dpr } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec3 aCor; attribute float aTam, aFase; uniform float uT, uDpr; varying vec3 vCor;
      void main(){ float tw = .82 + .18 * sin(uT * (1.5 + fract(aFase) * 3.) + aFase); vCor = aCor * tw;
        gl_PointSize = aTam * uDpr; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `varying vec3 vCor; void main(){ float r = length(gl_PointCoord - .5) * 2.; float a = exp(-r * r * 5.) + exp(-r * r * 40.) * .6;
      if (a < .01) discard; gl_FragColor = vec4(vCor * a, a); }`,
  }));
  pts.frustumCulled = false; pts.renderOrder = -10;
  const via = new THREE.Mesh(new THREE.SphereGeometry(raio * 1.05, 48, 24), new THREE.ShaderMaterial({
    uniforms: { uG: { value: galaxia }, uU: { value: u }, uW: { value: w } }, side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `uniform vec3 uG, uU, uW; varying vec3 vDir;${RUIDO}
      void main(){ vec3 d = normalize(vDir); float lat = dot(d, uG), lon = atan(dot(d, uW), dot(d, uU));
        float faixa = exp(-lat * lat / .012) + exp(-lat * lat / .05) * .35;
        vec2 p = vec2(lon * 4., lat * 22.); float nuvem = fbm(p) * .7 + fbm(p * 3.1) * .3;
        float poeira = smoothstep(.45, .7, fbm(p * 1.7 + 7.)) * exp(-lat * lat / .004); // fenda escura no meio
        float b = faixa * (.35 + nuvem) * (1. - poeira * .8) * (.75 + .25 * sin(lon + 1.));
        gl_FragColor = vec4(mix(vec3(.32, .36, .5), vec3(.62, .55, .46), nuvem) * b * .13, 1.); }`,
  }));
  via.frustumCulled = false; via.renderOrder = -11;
  g.add(via, pts);
  g.userData.atualizar = dt => { uT.value += dt; };
  return g;
}
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
      for (const o of e.objs) { o.visible = true; o.traverse(n => { if (n.material?.uniforms?.uT) n.material.uniforms.uT.value += dt; }); }
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
    const mat = new THREE.PointsMaterial({ color: estilo === 'fumaca' ? new THREE.Color(cor).multiplyScalar(.35).addScalar(.12) : cor, size: f.tam, map: tex(FISICA[estilo] ? estilo : 'luz'), transparent: true, depthWrite: false, blending: f.normal ? THREE.NormalBlending : THREE.AdditiveBlending });
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
      else if (estilo === 'fogo') mat.size = f.tam * (1 - k * .6);
    }, atraso);
  }
  // onda de choque no chão (shader): abre de r0 até r1
  function anel(p, cor, r0, r1, atraso = 0, dur = 700, sobe = 0) {
    const mat = matShader(FRAG_ONDA, VERT_PLANO, cor, { uR: 0 });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    m.rotation.x = -Math.PI / 2; m.position.copy(p).add(V(0, .05, 0)); m.scale.setScalar(Math.max(r0, r1)); m.renderOrder = 2;
    add([m], dur, k => { const e = 1 - (1 - k) ** 3; mat.uniforms.uR.value = (r0 + (r1 - r0) * e) / Math.max(r0, r1); mat.uniforms.uOp.value = 1 - k; m.position.y = p.y + .05 + sobe * k; }, atraso);
  }
  // círculo mágico no chão: aparece girando, brilha e some; com runa do Dom no centro (fundo preto some no modo aditivo)
  const runas = {}, carregador = new THREE.TextureLoader();
  const texRuna = url => (runas[url] ||= carregador.load(url, t => { t.colorSpace = THREE.SRGBColorSpace; }));
  function circulo(p, cor, raio, atraso = 0, dur = 1000, runa = null) {
    const mat = matShader(FRAG_CIRCULO, VERT_PLANO, cor);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    m.rotation.x = -Math.PI / 2; m.position.copy(p).add(V(0, .06, 0)); m.renderOrder = 2;
    let r = null;
    if (runa) { r = new THREE.Mesh(new THREE.PlaneGeometry(.9, .9), new THREE.MeshBasicMaterial({ map: texRuna(runa), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); r.position.z = .01; r.renderOrder = 3; m.add(r); }
    add([m], dur, k => { const e = k < .25 ? 1 - (1 - k / .25) ** 3 : 1, op = k < .25 ? k / .25 : k > .7 ? (1 - k) / .3 : 1; m.scale.setScalar(raio * (.6 + .4 * e)); mat.uniforms.uOp.value = op; if (r) { r.material.opacity = op; r.rotation.z = -k * 2; } }, atraso);
  }
  // bola de energia que cresce e some (explosão, impacto)
  function esfera(p, cor, r0, r1, atraso = 0, dur = 500, op = .8, estilo = 'luz') {
    const mat = matEnergia(cor, estilo), m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), mat); m.position.copy(p);
    add([m], dur, k => { m.scale.setScalar(r0 + (r1 - r0) * (1 - (1 - k) ** 2)); mat.uniforms.uOp.value = op * (1 - k) * 1.4; m.rotation.y = k * 2; }, atraso);
  }
  // coluna de energia (do chão para o céu) com núcleo branco
  function coluna(p, cor, raio, altura, atraso = 0, dur = 900, estilo = 'luz') {
    const g = new THREE.Group(); g.position.copy(p);
    const mat = matEnergia(cor, estilo);
    const cil = new THREE.Mesh(new THREE.CylinderGeometry(raio * .8, raio, altura, 32, 1, true).translate(0, altura / 2, 0), mat);
    const nucleo = new THREE.Mesh(new THREE.CylinderGeometry(raio * .25, raio * .35, altura, 12, 1, true).translate(0, altura / 2, 0), aditivo('#ffffff', .7));
    g.add(cil, nucleo);
    add([g], dur, k => { const s = k < .2 ? k / .2 : 1 - (k - .2) / .8 * .7; g.scale.set(s, k < .2 ? k / .2 : 1, s); mat.uniforms.uOp.value = 1.3 * Math.sin(Math.PI * k); nucleo.material.opacity = .7 * Math.sin(Math.PI * k); cil.rotation.y = k * 4; }, atraso);
  }
  // linha quebrada que muda de forma a cada quadro (raio elétrico)
  function zigue(p0, p1, amp, n = 12) {
    const linha = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: n }, () => V())), new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    linha.frustumCulled = false;
    linha.userData.mexer = () => { const a = linha.geometry.attributes.position; for (let i = 0; i < n; i++) { const q = p0.clone().lerp(p1, i / (n - 1)); if (i && i < n - 1) q.add(V(Math.random() - .5, Math.random() - .5, Math.random() - .5).multiplyScalar(amp)); a.setXYZ(i, q.x, q.y, q.z); } a.needsUpdate = true; };
    return linha;
  }
  // feixe entre dois pontos; eletrico = raio com galhos que tremem
  function feixe(p0, p1, cor, atraso = 0, dur = 450, eletrico = false, estilo = 'luz') {
    const d = p0.distanceTo(p1), meio = p0.clone().lerp(p1, .5);
    const mat = matEnergia(cor, eletrico ? 'raio' : estilo);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, 1, 10, 1, true).rotateX(Math.PI / 2), mat);
    const nucleo = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, 1, 6, 1, true).rotateX(Math.PI / 2), aditivo('#ffffff', .9));
    for (const o of [m, nucleo]) { o.position.copy(meio); o.lookAt(p1); o.scale.set(1, 1, d); }
    const objs = [m, nucleo];
    const linhas = [];
    if (eletrico) {
      linhas.push(zigue(p0, p1, .35), zigue(p0, p1, .5));
      // galhos que escapam do raio principal
      for (let i = 0; i < 3; i++) { const o = p0.clone().lerp(p1, .25 + Math.random() * .5); linhas.push(zigue(o, o.clone().add(V(Math.random() - .5, Math.random() * .6, Math.random() - .5).multiplyScalar(1.4)), .2, 5)); }
      objs.push(...linhas);
    }
    add(objs, dur, k => {
      const s = 1 + Math.sin(k * 40) * .35; m.scale.set(s * (1 - k * .7), s * (1 - k * .7), d); nucleo.scale.set(1 - k, 1 - k, d);
      mat.uniforms.uOp.value = 1.4 * (1 - k * k); nucleo.material.opacity = .9 * (1 - k);
      for (const l of linhas) { l.userData.mexer(); l.material.opacity = (1 - k) * (Math.random() > .2 ? 1 : .3); }
    }, atraso);
  }
  // orbe que voa em arco deixando rastro; devolve quando chega (ms)
  function orbe(p0, p1, cor, estilo, atraso = 0, tam = .14) {
    const dur = Math.max(260, p0.distanceTo(p1) * 75);
    const g = new THREE.Group();
    const nucleo = new THREE.Mesh(new THREE.SphereGeometry(tam * .6, 12, 8), aditivo('#ffffff', 1));
    const mat = matEnergia(cor, estilo), casca = new THREE.Mesh(new THREE.SphereGeometry(tam * 1.6, 16, 12), mat);
    g.add(nucleo, casca);
    let rastro = 0;
    add([g], dur, (k, dt) => {
      const pos = p0.clone().lerp(p1, k); pos.y += Math.sin(k * Math.PI) * .45 * Math.min(1, p0.distanceTo(p1) / 6);
      g.position.copy(pos); casca.scale.setScalar(1 + Math.sin(k * 30) * .15); casca.rotation.y += dt * 8; mat.uniforms.uOp.value = 1.5;
      rastro += dt; if (rastro > .03) { rastro = 0; particulas(pos, cor, 3, FISICA[estilo] ? estilo : 'luz', .05, 0, 420); }
    }, atraso);
    return atraso + dur;
  }
  // escudo: bolha com borda brilhante e colmeia (shader)
  function escudo(p, cor, raio, atraso = 0, dur = 1600) {
    const mat = matShader(FRAG_ESCUDO, VERT_FRES, cor), m = new THREE.Mesh(new THREE.SphereGeometry(raio, 32, 20), mat); m.position.copy(p);
    add([m], dur, k => { m.scale.setScalar(k < .15 ? (k / .15) ** .5 * (1 + Math.sin(k / .15 * Math.PI) * .12) : 1); mat.uniforms.uOp.value = k > .7 ? 1 - (k - .7) / .3 : 1; m.rotation.y = k * 1.5; }, atraso);
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
    const { p0, chao0, alvos, centro, celulas = [] } = pos, cor = new THREE.Color(s.cor || '#9ad0ff'), e = s.estilo, m = s.suprema ? 1.8 : 1;
    const branco = cor.clone().lerp(new THREE.Color('#ffffff'), .6);
    // concentração: círculo mágico e brilho subindo em quem usa
    circulo(chao0, cor, .75 * m, 0, 900, s.runa);
    particulas(chao0, cor, Math.round(14 * m), s.apoio ? 'luz' : e, .35, 0, 600);
    if (s.suprema) { coluna(chao0, cor, .45, 2.2, 0, 700, e); esfera(p0, branco, .1, .9, 150, 400, .6); }
    const acertos = alvos.filter(a => a.acertou);
    const impacto = (p, t, n = 28) => {
      esfera(p, cor, .08, .6 * m, t, 420, .9, e); esfera(p, branco, .05, .3 * m, t, 220, 1);
      particulas(p, cor, Math.round(n * m), e, .2, t, 1000); particulas(p, branco, Math.round(8 * m), 'raio', .1, t, 400);
    };
    const desvio = (a, t) => particulas(a.p.clone().add(V(Math.random() - .5, .2, Math.random() - .5)), cor, 8, e, .1, t, 600);
    const area = s.raio && centro;
    // aviso da área: círculo mágico onde vai cair
    if (area && ['explosao', 'coluna', 'parede'].includes(s.forma)) circulo(centro, cor, s.raio + .6, 120, 1300, s.runa);
    switch (s.forma) {
      case 'projetil': for (const a of alvos) { const t = orbe(p0, a.acertou ? a.p : a.p.clone().add(V(.7, .3, .4)), cor, e, 250, .12 * m); if (a.acertou) { impacto(a.p, t); bater(a.k, t); } else desvio(a, t); } break;
      case 'raio': {
        // em cadeia, o feixe salta de um alvo para o próximo
        let de = p0, t = 250;
        for (const a of alvos) {
          feixe(de, a.acertou ? a.p : a.p.clone().add(V(.6, .4, 0)), cor, t, 480 * m, e === 'raio' || s.cadeia, e);
          if (a.acertou) { impacto(a.p, t + 70); bater(a.k, t + 70); } else desvio(a, t + 70);
          if (s.cadeia) { de = a.p; t += 180; }
        }
        break;
      }
      case 'salto': break; // o salto em si é feito pela cena (efeito)
      case 'parede': celulas.forEach((p, i) => {
        const t = 250 + i * 60;
        coluna(p, cor, .42, 1.3 * m, t, 700, e); particulas(p, cor, 10, e === 'gotas' ? 'gotas' : e === 'folhas' ? 'folhas' : 'cristal', .3, t + 100, 900);
        esfera(p.clone().add(V(0, .3, 0)), branco, .1, .5, t + 80, 300, .5);
      }); if (celulas.length) tremer(celulas[Math.floor(celulas.length / 2)], 1, 300); break;
      case 'golpe': for (const a of alvos) { corte(a.p, cor, Math.atan2(a.p.x - p0.x, a.p.z - p0.z), 300); if (a.acertou) { impacto(a.p, 330, 20); bater(a.k, 330); } else desvio(a, 330); } break;
      case 'explosao': {
        const alvo = area ? centro.clone().add(V(0, .45, 0)) : alvos[0]?.p; if (!alvo) break;
        const t = orbe(p0, alvo, cor, e, 250, .16 * m), r = (s.raio || .4) + .6;
        esfera(alvo, cor, .2, r * m, t, 700, .9, e); esfera(alvo, branco, .1, r * .5, t, 300, 1);
        anel(area ? centro : alvo.clone().setY(alvo.y - .4), cor, .3, r + .7, t, 800);
        particulas(alvo, cor, Math.round((40 + (s.raio || 0) * 35) * m), e, r * .4, t, 1400);
        particulas(alvo, cor, Math.round(12 * m), 'fumaca', r * .3, t + 150, 1600);
        tremer(alvo, 1.6 * m, t);
        for (const a of acertos) bater(a.k, t + 60);
        break;
      }
      case 'coluna': {
        const pts = area ? [{ p: centro, r: s.raio + .4 }] : alvos.map(a => ({ p: a.chao, r: .45, a }));
        for (const { p, r, a } of pts) {
          if (a && !a.acertou) { desvio(a, 400); continue; }
          if (!area) circulo(p, cor, r + .4, 100, 1000);
          anel(p, cor, .2, r + .5, 300, 600);
          coluna(p, cor, r, 4 * m, 300, 900, e);
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
        circulo(a.chao, cor, .7, 150, 1300);
        for (let i = 0; i < 3; i++) anel(a.chao, cor, .55, .45, 200 + i * 220, 900, a.p.y - a.chao.y + .5);
        particulas(a.chao, cor, Math.round(30 * m), s.apoio ? 'luz' : e, .4, 200, 1500);
        coluna(a.chao, cor, .38, 1.4, 250, 1000, s.apoio ? 'luz' : e);
      } break;
      case 'escudo': for (const a of acertos) { escudo(a.chao.clone().add(V(0, .5, 0)), cor, .62, 250, 1700); particulas(a.chao, cor, 20, e, .5, 250, 1100); } break;
    }
    if ((s.apoio || s.falhou) && !acertos.length) particulas(p0, '#888888', 12, 'fumaca', .2, 200, 800); // falhou: o Dom se apaga
  }
  // teleporte: coluna e clarão na saída e na chegada
  function salto(de, para, cor, atraso = 0) {
    const c = new THREE.Color(cor);
    circulo(de, c, .8, atraso, 600); coluna(de, c, .4, 2.2, atraso, 500); particulas(de.clone().add(V(0, .4, 0)), c, 24, 'orbita', .3, atraso, 700);
    if (para !== de) { circulo(para, c, .8, atraso + 100, 800); coluna(para, c, .4, 2.2, atraso + 120, 600); esfera(para.clone().add(V(0, .5, 0)), '#ffffff', .1, .8, atraso + 120, 350, .7); particulas(para, c, 24, 'luz', .3, atraso + 150, 800); anel(para, c, .2, 1.2, atraso + 120, 500); }
  }
  // pulso de condição no começo do turno (queimar, veneno, regenerar)
  function pulso(p, cor, estilo = 'luz') { anel(p, cor, .2, .9, 0, 600); particulas(p, cor, estilo === 'luz' ? 16 : 26, estilo, .3, 0, 800); }
  return { atualizar, tocar, pulso, salto };
}
