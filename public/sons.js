// Sons das habilidades, golpes e dados (Kenney, CC0: Sci-Fi Sounds, Impact Sounds, RPG Audio) em public/sons/.
// Web Audio: liga no primeiro clique/tecla (regra dos navegadores), carrega sob demanda e varia o tom para cada Dom.
const NOMES = ['conjurar', 'escudo', 'onda', 'teleporte', 'cura', 'explosao', 'explosao_grande', 'raio', 'feixe', 'disparo', 'gelo', 'cristal', 'pedra', 'metal', 'liquido', 'soco', 'acerto', 'corte', 'zunido', 'dado1', 'dado2', 'pulso'];
let ctx = null, saida = null;
const buffers = {};
let volume = (() => { try { const v = localStorage.getItem('arkahad.som'); return v === null ? .7 : Math.max(0, Math.min(1, +v)); } catch { return .7; } })();

function carregar(nome) {
  return (buffers[nome] ||= fetch(`/sons/${nome}.ogg`).then(r => r.arrayBuffer()).then(b => ctx.decodeAudioData(b)).catch(() => null));
}
function ligar() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  ctx = new AC(); saida = ctx.createGain(); saida.gain.value = volume; saida.connect(ctx.destination);
  for (const n of NOMES) carregar(n);
}
addEventListener('pointerdown', ligar, { passive: true }); addEventListener('keydown', ligar);

// tom: 1 = normal (1.5 mais agudo); atraso em ms; vol 0..1
export function tocarSom(nome, { tom = 1, vol = 1, atraso = 0 } = {}) {
  if (!ctx || !volume || !NOMES.includes(nome)) return;
  carregar(nome).then(b => {
    if (!b) return;
    const f = ctx.createBufferSource(), g = ctx.createGain();
    f.buffer = b; f.playbackRate.value = tom * (.94 + Math.random() * .12); g.gain.value = vol;
    f.connect(g).connect(saida); f.start(ctx.currentTime + atraso / 1000);
  });
}
export function volumeSom() { return volume; }
export function definirVolume(v) {
  volume = Math.max(0, Math.min(1, v));
  try { localStorage.setItem('arkahad.som', String(volume)); } catch {}
  if (saida) saida.gain.value = volume;
}
// som de impacto de cada Dom (elemento → arquivo e tom)
const SOM_DOM = { geo: ['pedra', 1], aquilon: ['liquido', .9], toxys: ['liquido', 1.2], verdis: ['liquido', 1.5], gravitio: ['explosao_grande', 1.2] };
const SOM_ESTILO = { fogo: ['explosao', 1.15], gelo: ['gelo', 1], raio: ['raio', 1.2], folhas: ['liquido', 1.5], gotas: ['liquido', 1], fumaca: ['explosao', .7], luz: ['cura', 1.5], ondas: ['onda', 1.3], vento: ['zunido', 1.3], cristal: ['cristal', 1], orbita: ['teleporte', .8] };
export function somDoDom(dom, estilo) { return SOM_DOM[dom] || SOM_ESTILO[estilo] || ['acerto', 1]; }
