// Solo contínuo do tabuleiro: um único relevo suave (sem blocos), com texturas que se misturam,
// penhascos de rocha nos desníveis, borda da maquete descendo até a mesa e grade desenhada no próprio chão.
import * as THREE from 'three';
import { nivelEm } from './regras.js';

export const NIVEL_H = .6;          // altura de um nível de terreno
export const MARGEM = 1;            // borda da maquete: o resto é a mesa de jogo (mesajogo.js)
export const MESA_Y = -.35;         // altura do tampo da mesa
// camadas de textura (ordem do array de texturas)
const CAMADAS = ['grama', 'terra', 'areia', 'rocha', 'calcada', 'tabuas', 'vidro', 'floresta'];
const ASPEREZA = [1, 1, .95, .92, .9, .85, .45, 1];
const ESCALA = [.55, .5, .45, .32, .5, .5, .4, .5];     // repetições por casa
const RUGOSO = [1, 1, .8, 1.4, 0, 0, .1, 1];            // quanto o relevo natural aparece
// terreno da casa → camada
const CAMADA_DE = { '"': 0, T: 0, k: 0, n: 0, o: 0, t: 0, y: 0, '.': 1, Q: 1, m: 1, h: 1, '*': 1, b: 1, c: 1, s: 1, w: 1, ',': 2, '~': 2, l: 2, '^': 3, '_': 4, '#': 4, a: 4, '=': 5, '+': 5, v: 6, P: 7, '/': 4, '|': 4 };
// mobília e objetos de masmorra não têm chão próprio: usam o piso de uma casa vizinha (tábuas, ladrilho…)
function camadaVizinha(mesa, x, y) {
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
    const v = (mesa.grid[y + dy] || '')[x + dx];
    if (v in CAMADA_DE) return CAMADA_DE[v];
  }
  return 4;
}
const AFUNDA = { '~': -.42 };       // leito da água
const ELEVA = { '^': .12 };

let texturas = null;
export function carregarTexturasSolo(base = '/texturas/') {
  if (texturas) return texturas;
  const ler = n => new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = erro; i.src = base + n; });
  const montar = async sufixo => {
    const imgs = await Promise.all(CAMADAS.map(c => ler(`${c}_${sufixo}.jpg`)));
    // usa a resolução dos arquivos (até 1024); celular fica em 512 para poupar memória de vídeo
    const T = Math.min(imgs[0].naturalWidth || 512, matchMedia('(pointer: coarse)').matches ? 512 : 1024), cv = document.createElement('canvas'); cv.width = cv.height = T;
    const g = cv.getContext('2d', { willReadFrequently: true }), dados = new Uint8Array(T * T * 4 * imgs.length);
    imgs.forEach((im, i) => { g.clearRect(0, 0, T, T); g.drawImage(im, 0, 0, T, T); dados.set(g.getImageData(0, 0, T, T).data, i * T * T * 4); });
    const t = new THREE.DataArrayTexture(dados, T, T, imgs.length);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true; t.anisotropy = 8; t.colorSpace = sufixo === 'cor' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.needsUpdate = true;
    return t;
  };
  texturas = Promise.all([montar('cor'), montar('nrm')]).then(([cor, nrm]) => ({ cor, nrm }));
  return texturas;
}

function acaso(x, y, k = 0) {
  let h = (x * 374761393 + y * 668265263 + k * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
// ruído suave de valor (determinístico)
function ruido(x, y, k) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const s = t => t * t * (3 - 2 * t), a = acaso(xi, yi, k), b = acaso(xi + 1, yi, k), c = acaso(xi, yi + 1, k), d = acaso(xi + 1, yi + 1, k);
  return (a + (b - a) * s(fx)) * (1 - s(fy)) + (c + (d - c) * s(fx)) * s(fy);
}
function fbm(x, y, k) { return ruido(x, y, k) * .55 + ruido(x * 2.1, y * 2.1, k + 1) * .28 + ruido(x * 4.3, y * 4.3, k + 2) * .17; }

// desfoque separável (caixa, 2 passadas ≈ gaussiano)
function desfocar(campo, W, H, r, canais = 1, passadas = 2) {
  if (r < 1) return campo;
  const tmp = new Float32Array(campo.length);
  const passada = (de, para, horizontal) => {
    for (let c = 0; c < canais; c++) for (let a = 0; a < (horizontal ? H : W); a++) {
      let soma = 0, n = 0; const L = horizontal ? W : H;
      const at = i => horizontal ? ((a * W + i) * canais + c) : ((i * W + a) * canais + c);
      for (let i = -r; i <= r; i++) { const ii = Math.min(L - 1, Math.max(0, i)); soma += de[at(ii)]; n++; }
      for (let i = 0; i < L; i++) {
        para[at(i)] = soma / n;
        const sai = Math.min(L - 1, Math.max(0, i - r)), entra = Math.min(L - 1, Math.max(0, i + r + 1));
        soma += de[at(entra)] - de[at(sai)];
      }
    }
  };
  for (let k = 0; k < passadas; k++) { passada(campo, tmp, true); passada(tmp, campo, false); }
  return campo;
}

// Constrói o relevo. Devolve a malha e funções de consulta de altura.
export function construirSolo(mesa, tex, opcoes = {}) {
  const C = mesa.cols, R = mesa.rows, M = MARGEM;
  const area = (C + 2 * M) * (R + 2 * M);
  const S = area > 5000 ? 3 : area > 2600 ? 4 : 5;     // vértices por casa
  const W = (C + 2 * M) * S + 1, H = (R + 2 * M) * S + 1;
  const celula = (x, z) => {
    const cx = Math.floor(x), cz = Math.floor(z);
    if (cx < 0 || cz < 0 || cx >= C || cz >= R) return null;
    return [cx, cz];
  };
  const alt = new Float32Array(W * H), rug = new Float32Array(W * H), pesos = new Float32Array(W * H * 8);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const x = i / S - M, z = j / S - M, k = j * W + i;
    const c = celula(x - 1e-4, z - 1e-4) || celula(x + 1e-4, z + 1e-4);
    if (c) {
      const ch = mesa.grid[c[1]][c[0]];
      alt[k] = nivelEm(mesa, c[0], c[1]) * NIVEL_H + (AFUNDA[ch] || 0) + (ELEVA[ch] || 0);
      const camada = CAMADA_DE[ch] ?? camadaVizinha(mesa, c[0], c[1]);
      pesos[k * 8 + camada] = 1; rug[k] = RUGOSO[camada];
    } else {
      // lateral da maquete: desce até abaixo do tampo da mesa
      alt[k] = MESA_Y - .1; pesos[k * 8 + 1] = 1; rug[k] = .5;
    }
  }
  desfocar(alt, W, H, 1, 1, S >= 5 ? 1 : 1);
  desfocar(pesos, W, H, Math.max(1, Math.round(S * .2)), 8);
  desfocar(rug, W, H, Math.max(1, Math.round(S * .3)));
  // detalhe natural do chão
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const x = i / S - M, z = j / S - M, k = j * W + i;
    alt[k] += ((fbm(x * .9, z * .9, 5) - .5) * .09 + (ruido(x * 3.1, z * 3.1, 6) - .5) * .025) * rug[k];
  }
  // geometria
  const pos = new Float32Array(W * H * 3), p0 = new Float32Array(W * H * 4), p1 = new Float32Array(W * H * 4);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i;
    pos[k * 3] = i / S - M; pos[k * 3 + 1] = alt[k]; pos[k * 3 + 2] = j / S - M;
    for (let c = 0; c < 4; c++) { p0[k * 4 + c] = pesos[k * 8 + c]; p1[k * 4 + c] = pesos[k * 8 + 4 + c]; }
  }
  const idx = new Uint32Array((W - 1) * (H - 1) * 6); let n = 0;
  for (let j = 0; j < H - 1; j++) for (let i = 0; i < W - 1; i++) {
    const a = j * W + i, b = a + 1, c = a + W, d = c + 1;
    idx[n++] = a; idx[n++] = c; idx[n++] = b; idx[n++] = b; idx[n++] = c; idx[n++] = d;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aPeso0', new THREE.BufferAttribute(p0, 4));
  geo.setAttribute('aPeso1', new THREE.BufferAttribute(p1, 4));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeVertexNormals();
  geo.computeBoundingSphere();

  // realce de alcance de movimento (uma textura de casas)
  // R = alcance de movimento, G = alcance de ataque/técnica, B = área sob o cursor
  const realceDados = new Uint8Array(C * R * 4);
  const realce = new THREE.DataTexture(realceDados, C, R, THREE.RGBAFormat);
  realce.magFilter = realce.minFilter = THREE.NearestFilter; realce.needsUpdate = true;

  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .9, metalness: 0 });
  const u = {
    uCor: { value: tex.cor }, uNrm: { value: tex.nrm }, uEscala: { value: ESCALA }, uAspereza: { value: ASPEREZA },
    uGrade: { value: opcoes.grade ?? .22 }, uTab: { value: new THREE.Vector2(C, R) }, uRealce: { value: realce },
  };
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = 'attribute vec4 aPeso0; attribute vec4 aPeso1; varying vec4 vP0; varying vec4 vP1; varying vec3 vMundo; varying vec3 vNMundo;\n' + sh.vertexShader
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n vP0 = aPeso0; vP1 = aPeso1; vMundo = (modelMatrix * vec4(transformed, 1.0)).xyz; vNMundo = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = `precision highp sampler2DArray;
      uniform sampler2DArray uCor; uniform sampler2DArray uNrm; uniform float uEscala[8]; uniform float uAspereza[8];
      uniform float uGrade; uniform vec2 uTab; uniform sampler2D uRealce;
      varying vec4 vP0; varying vec4 vP1; varying vec3 vMundo; varying vec3 vNMundo;
      float hsh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(hsh(i), hsh(i + vec2(1, 0)), f.x), mix(hsh(i + vec2(0, 1)), hsh(i + vec2(1, 1)), f.x), f.y); }
      vec4 amostra(int c, vec2 uv) {
        // duas escalas misturadas para esconder a repetição
        vec4 a = texture(uCor, vec3(uv, float(c)));
        vec4 b = texture(uCor, vec3(uv * .37 + vec2(.13, .71), float(c)));
        return mix(a, b, .35);
      }
      vec3 amostraN(int c, vec2 uv) { return texture(uNrm, vec3(uv, float(c))).xyz * 2. - 1.; }
      ` + sh.fragmentShader
      .replace('#include <map_fragment>', `
        float w[8]; w[0] = vP0.x; w[1] = vP0.y; w[2] = vP0.z; w[3] = vP0.w; w[4] = vP1.x; w[5] = vP1.y; w[6] = vP1.z; w[7] = vP1.w;
        vec3 nM = normalize(vNMundo);
        float inclin = 1. - nM.y;
        float rochaP = smoothstep(.16, .34, inclin);
        // bordas orgânicas: o ruído quebra a linha entre texturas
        float rq = vnoise(vMundo.xz * 2.7) * .6 + vnoise(vMundo.xz * 7.1) * .4;
        vec3 albedo = vec3(0.); vec3 nt = vec3(0.); float soma = 0.; float asp = 0.;
        for (int c = 0; c < 8; c++) {
          float p = w[c];
          if (c == 3) p = max(p, rochaP * 1.4);
          else p *= (1. - rochaP);
          if (p < .02) continue;
          vec2 uv = vMundo.xz * uEscala[c];
          vec4 t = amostra(c, uv);
          float alturaT = dot(t.rgb, vec3(.33));
          p = pow(p, 1.6) * (.35 + alturaT + rq * .45);
          p = p * p;
          vec3 nn = amostraN(c, uv);
          if (c == 3 && rochaP > .01) {
            // rocha nos penhascos: projeção lateral (sem esticar a textura)
            vec2 uvL = (abs(nM.x) > abs(nM.z) ? vMundo.zy : vMundo.xy) * uEscala[3];
            vec4 tl = amostra(3, uvL);
            t = mix(t, tl, rochaP); nn = mix(nn, amostraN(3, uvL), rochaP);
          }
          albedo += t.rgb * p; nt += nn * p; asp += uAspereza[c] * p; soma += p;
        }
        albedo /= max(soma, 1e-4); nt /= max(soma, 1e-4); asp /= max(soma, 1e-4);
        // variação de cor em grande escala
        float macro = vnoise(vMundo.xz * .11) * .6 + vnoise(vMundo.xz * .37) * .4;
        albedo *= .82 + macro * .32;
        // fora do tabuleiro: um pouco mais escuro e dessaturado
        vec2 dentro = step(vec2(0.), vMundo.xz) * step(vMundo.xz, uTab);
        float noTab = dentro.x * dentro.y;
        float distTab = length(max(max(-vMundo.xz, vMundo.xz - uTab), 0.));
        albedo = mix(albedo, albedo * .78, (1. - noTab) * smoothstep(0., 3., distTab));
        // grade e realce de alcance
        vec2 cel = floor(vMundo.xz); vec2 f = fract(vMundo.xz);
        float linha = 1. - smoothstep(0., .035, min(min(f.x, 1. - f.x), min(f.y, 1. - f.y)));
        float borda = 1. - smoothstep(0., .06, min(min(abs(vMundo.x), abs(vMundo.x - uTab.x)), min(abs(vMundo.z), abs(vMundo.z - uTab.y))));
        vec4 rx = noTab > .5 ? texture2D(uRealce, (cel + .5) / uTab) : vec4(0.);
        float rr = rx.r;
        albedo = mix(albedo, albedo * .45, linha * uGrade * noTab);
        albedo = mix(albedo, albedo * .5 + vec3(.62, .14, .08), rx.g * (.3 + linha * .55));
        albedo = mix(albedo, albedo * .4 + vec3(.55, .35, .9), rx.b * (.55 + linha * .45));
        albedo = mix(albedo, vec3(.9, .72, .3), borda * .55 * step(distTab, .1));
        albedo = mix(albedo, albedo * .6 + vec3(.55, .43, .12), rr * (.35 + linha * .5));
        diffuseColor.rgb *= albedo;
        vec3 nTex = nt;`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = asp;')
      .replace('#include <normal_fragment_maps>', `
        {
          vec3 T = normalize(cross(vec3(0., 0., 1.), nM)); vec3 B = normalize(cross(nM, T));
          vec3 nW = normalize(nM + (T * nTex.x - B * nTex.y) * .6);
          normal = normalize((viewMatrix * vec4(nW, 0.)).xyz);
        }`)
      // reflexo do céu (HDRI) no chão a 10%: cheio, o vidro negro virava um espelho
      .replace('#include <lights_fragment_end>', '#if defined( RE_IndirectSpecular )\n radiance *= .1;\n#endif\n#include <lights_fragment_end>');
  };
  mat.customProgramCacheKey = () => 'solo-v2';
  const malha = new THREE.Mesh(geo, mat);
  malha.receiveShadow = true; malha.castShadow = true;

  function alturaPonto(x, z) {
    const fi = (x + M) * S, fj = (z + M) * S;
    const i = Math.max(0, Math.min(W - 2, Math.floor(fi))), j = Math.max(0, Math.min(H - 2, Math.floor(fj)));
    const tx = Math.min(1, Math.max(0, fi - i)), tz = Math.min(1, Math.max(0, fj - j));
    const a = alt[j * W + i], b = alt[j * W + i + 1], c = alt[(j + 1) * W + i], d = alt[(j + 1) * W + i + 1];
    return (a + (b - a) * tx) * (1 - tz) + (c + (d - c) * tx) * tz;
  }
  // canal 0 = movimento, 1 = alcance, 2 = área. mapa: Map 'x,y' → força (0..1) ou distância (>0 = marcado)
  function marcar(canal, mapa, comoForca = false) {
    for (let i = 0; i < C * R; i++) realceDados[i * 4 + canal] = 0;
    if (mapa) for (const [key, v] of mapa) {
      const [x, y] = key.split(',').map(Number); if (x < 0 || y < 0 || x >= C || y >= R) continue;
      const f = comoForca ? v : (v > 0 ? 1 : 0); if (f > 0) realceDados[(y * C + x) * 4 + canal] = Math.round(255 * Math.min(1, f));
    }
    realce.needsUpdate = true;
  }
  const marcarAlcance = mapa => marcar(0, mapa);
  return { malha, alturaPonto, marcarAlcance, marcar, uniforms: u, margem: M };
}

