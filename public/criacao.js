// Assistente de criação de personagem com prévia 3D.
import * as THREE from 'three';
import { criarMiniatura } from './miniatura.js';
import {
  ATRIBUTOS, PERICIAS, RACAS, ORIGENS, ESTRATOS, FACANHAS, VOCACOES, DONS, DONS_ELITE, TODOS_DONS, RESSONANCIAS,
  ARMAS_VISUAIS, CABELOS, CUSTO_DOM, DANO_DOM, fichaVazia, aparenciaPadrao, pontosAtributo, atributosFinais,
  pontosPericia, gradPericia, bonusPericia, ehAurethian, nivelDom, derivados, validar,
} from './conteudo.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const PASSOS = ['Raça', 'Origem e estrato', 'Vocação', 'Dom', 'Atributos', 'Perícias', 'Aparência', 'Identidade'];
const MATERIAIS = { cristal: 'Cristal', osso: 'Osso', ferro: 'Ferro Lunar', brasa: 'Brasa' };
const sinal = n => (n > 0 ? '+' : '') + n;

export function abrirCriador({ ficha, dadosCor, aoSalvar, aoFechar }) {
  const f = JSON.parse(JSON.stringify(ficha || fichaVazia()));
  f.aparencia ||= aparenciaPadrao(f.raca, f.vocacao);
  const dc = { kael: '#d9a23a', lyra: '#3f78e0', material: 'cristal', ...(dadosCor || {}) };
  let passo = ficha ? 7 : 0;

  const raiz = document.createElement('div');
  raiz.className = 'criador';
  raiz.innerHTML = `<div class="cr-caixa">
    <header class="cr-topo"><h2>${ficha ? 'Editar personagem' : 'Criar personagem'}</h2><span class="cresce"></span><button data-acao="fechar" aria-label="Fechar">Fechar</button></header>
    <nav class="cr-passos" id="crPassos"></nav>
    <section class="cr-corpo" id="crCorpo"></section>
    <aside class="cr-previa"><div class="cr-palco" id="crPalco"></div><div id="crResumo"></div></aside>
    <footer class="cr-rodape"><button data-acao="voltar">Voltar</button><span class="cresce erro" id="crErro"></span><button class="pri" data-acao="avancar">Próximo</button></footer>
  </div>`;
  document.body.appendChild(raiz);
  const $ = s => raiz.querySelector(s);

  // ---------- prévia 3D ----------
  const palco = $('#crPalco');
  const rr = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  rr.setPixelRatio(Math.min(devicePixelRatio, 2)); rr.outputColorSpace = THREE.SRGBColorSpace; rr.toneMapping = THREE.ACESFilmicToneMapping;
  rr.shadowMap.enabled = true;
  palco.appendChild(rr.domElement);
  const cena = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(30, 1, .1, 50); cam.position.set(0, .75, 2.6); cam.lookAt(0, .48, 0);
  cena.add(new THREE.HemisphereLight('#fff4e0', '#3a2a1a', 1.1));
  const sol = new THREE.DirectionalLight('#ffd9a0', 2.4); sol.position.set(-2, 3, 2.5); sol.castShadow = true; cena.add(sol);
  const contra = new THREE.DirectionalLight('#7fa8ff', 1.4); contra.position.set(2, 1.5, -2); cena.add(contra);
  const disco = new THREE.Mesh(new THREE.CylinderGeometry(.7, .75, .06, 40), new THREE.MeshStandardMaterial({ color: '#2a1d12', roughness: .8 }));
  disco.position.y = -.03; disco.receiveShadow = true; cena.add(disco);
  let mini = null, vivo = true;
  const ro = new ResizeObserver(() => { const w = palco.clientWidth, h = palco.clientHeight; if (w && h) { rr.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix(); } });
  ro.observe(palco);
  (function laco() { if (!vivo) return; requestAnimationFrame(laco); if (mini) mini.rotation.y += .01; rr.render(cena, cam); })();
  function atualizarPrevia() {
    if (mini) { cena.remove(mini); mini.traverse(o => o.geometry?.dispose()); }
    const dom = ehAurethian(f) ? TODOS_DONS[f.dom]?.cor : null;
    mini = criarMiniatura(f.aparencia, f.raca, { cristal: dom }); cena.add(mini);
  }

  // ---------- resumo ----------
  function resumo() {
    const d = derivados(f), a = d.atributos, r = RACAS[f.raca], v = VOCACOES[f.vocacao];
    const dom = ehAurethian(f) ? TODOS_DONS[f.dom] : null;
    $('#crResumo').innerHTML = `<div class="cr-nome">${esc(f.nome || 'Sem nome')}</div>
      <div class="cr-sub">${esc(r.nome)} ${esc(r.subs[f.sub]?.nome || '')} · ${esc(v.nome)}${dom ? ` · <span style="color:${dom.cor}">${esc(dom.nome)} N${nivelDom(f)}</span>` : ' · Vellunari'}</div>
      <div class="cr-attrs">${ATRIBUTOS.map(([k]) => `<span><b>${a[k]}</b>${k}</span>`).join('')}</div>
      <div class="cr-der"><span>Vigor <b>${d.vigorMax}</b></span><span>Fôlego <b>${d.folegoMax}</b></span><span>Defesa <b>${d.defesa}</b></span><span>Proteção <b>${d.protecao}</b></span><span>Robustez <b>${d.robustez}</b></span><span>Determ. <b>${d.determinacao}</b></span><span>Limiar <b>${d.limiar}</b></span><span>Desl. <b>${d.desloc}</b></span></div>`;
  }

  // ---------- passos ----------
  const cartao = (sel, acao, valor, titulo, corpo, desab = false) => `<button class="cr-cartao ${sel ? 'sel' : ''}" data-acao="${acao}" data-v="${esc(valor)}" ${desab ? 'disabled' : ''}><b>${titulo}</b>${corpo}</button>`;
  const mods = m => Object.entries(m || {}).map(([k, v]) => `${sinal(v)} ${k}`).join(', ');

  function passoRaca() {
    const r = RACAS[f.raca];
    return `<h3>Escolha a raça</h3><div class="cr-grade">${Object.entries(RACAS).map(([k, x]) => cartao(f.raca === k, 'raca', k, x.nome, `<small>${esc(x.desc)}</small><em>${k === 'sarthani' ? '+1 em atributo livre, +1 perícia' : mods(x.mods)}</em>`)).join('')}</div>
      <h3>Linhagem</h3><div class="cr-grade dois">${Object.entries(r.subs).map(([k, s]) => cartao(f.sub === k, 'sub', k, s.nome, `<small>${esc(s.desc)}</small>`)).join('')}</div>
      ${r.livre ? `<label>Atributo que recebe o +1 livre</label><select data-campo="livre">${ATRIBUTOS.map(([k, n]) => `<option value="${k}" ${f.livre === k ? 'selected' : ''}>${n}</option>`).join('')}</select>` : ''}
      <ul class="cr-tracos">${r.tracos.map(t => `<li>${esc(t)}</li>`).join('')}</ul>`;
  }
  function passoOrigem() {
    return `<h3>Origem</h3><div class="cr-grade tres">${Object.entries(ORIGENS).map(([k, o]) => cartao(f.origem === k, 'origem', k, o.nome, `<small>${esc(o.desc)}</small><em>+1 em ${o.pericias.map(p => PERICIAS.find(x => x.id === p).nome).join(' e ')}</em>`)).join('')}</div>
      <h3>Estrato social</h3><div class="cr-grade dois">${Object.entries(ESTRATOS).map(([k, e]) => cartao(f.estrato === k, 'estrato', k, e.nome, `<small>${esc(e.desc)}</small>`)).join('')}</div>
      ${f.estrato === 'vellunari' ? `<h3>Façanhas do Sangue Comum (escolha 2)</h3><div class="cr-lista">${Object.entries(FACANHAS).map(([k, t]) => `<label class="cr-check"><input type="checkbox" data-facanha="${k}" ${(f.facanhas || []).includes(k) ? 'checked' : ''}> ${esc(t)}</label>`).join('')}</div>` : ''}`;
  }
  function passoVocacao() {
    return `<h3>Vocação</h3><div class="cr-grade">${Object.entries(VOCACOES).map(([k, v]) => cartao(f.vocacao === k, 'vocacao', k, v.nome, `<small>${esc(v.papel)} · Vigor +${v.vigor}</small><small>${esc(v.hab)}</small><em>${esc(v.kit)}</em>`, v.soAurethian && !ehAurethian(f))).join('')}</div>
      <p class="cr-nota">As duas primeiras perícias da vocação ganham +1 de graça: ${VOCACOES[f.vocacao].pericias.slice(0, 2).map(p => PERICIAS.find(x => x.id === p).nome).join(' e ')}.</p>`;
  }
  function passoDom() {
    if (!ehAurethian(f)) return `<h3>Sem Dom</h3><p>Vellunari não têm Dom — e por isso recebem mais atributos, perícias, Fôlego e duas Façanhas. Mude o estrato no passo 2 se quiser um Aurethian.</p>`;
    const lista = f.estrato === 'elite' ? { ...DONS, ...DONS_ELITE } : DONS, n = nivelDom(f);
    const tecs = d => d.tec.slice(0, n).map((t, i) => `<li><b>N${i + 1} ${esc(t)}</b> · ${CUSTO_DOM[i]} Fôlego · ${DANO_DOM[i]}</li>`).join('');
    const d1 = TODOS_DONS[f.dom];
    return `<h3>${f.estrato === 'dualista' ? 'Dom primário' : 'Dom'} (Nível ${n})</h3><div class="cr-grade quatro">${Object.entries(lista).map(([k, d]) => cartao(f.dom === k, 'dom', k, `<i class="ponto" style="background:${d.cor}"></i>${esc(d.nome)}${d.elite ? ' ✦' : ''}`, `<small>${esc(d.tema)} · ${d.chave}</small>`)).join('')}</div>
      ${d1 ? `<ul class="cr-tracos">${tecs(d1)}</ul>` : ''}
      ${f.estrato === 'dualista' ? `<h3>Dom secundário</h3><div class="cr-grade quatro">${Object.entries(DONS).map(([k, d]) => cartao(f.dom2 === k, 'dom2', k, `<i class="ponto" style="background:${d.cor}"></i>${esc(d.nome)}`, `<small>${esc(d.tema)}</small>`, k === f.dom)).join('')}</div>` : ''}
      <h3>Ressonância do cristal</h3><div class="cr-grade tres">${Object.entries(RESSONANCIAS).map(([k, r]) => cartao(f.ressonancia === k, 'ressonancia', k, r.nome, `<small>${esc(r.desc)}</small>`)).join('')}</div>`;
  }
  function passoAtributos() {
    const p = pontosAtributo(f), fin = atributosFinais(f);
    return `<h3>Atributos <span class="cr-pontos ${p.gastos === p.total ? 'ok' : ''}">${p.total - p.gastos} pontos restantes</span></h3>
      <p class="cr-nota">Todos começam em 1. Máximo 4 antes da raça; pode baixar um atributo a 0 para ganhar 1 ponto.</p>
      <div class="cr-lista">${ATRIBUTOS.map(([k, n]) => `<div class="cr-linha"><span class="cresce">${n}</span><button class="mini" data-acao="attr" data-v="${k}" data-d="-1">−</button><b class="cr-num">${f.atributos[k]}</b><button class="mini" data-acao="attr" data-v="${k}" data-d="1">+</button><span class="cr-final">= ${fin[k]}</span></div>`).join('')}</div>`;
  }
  function passoPericias() {
    const p = pontosPericia(f), a = atributosFinais(f), voc = VOCACOES[f.vocacao];
    return `<h3>Perícias <span class="cr-pontos ${p.gastos <= p.total ? 'ok' : ''}">${p.total - p.gastos} pontos restantes</span></h3>
      <p class="cr-nota">Graduação máxima 3. Destacadas: perícias da vocação. Origem e vocação já dão alguns pontos grátis.</p>
      <div class="cr-lista">${PERICIAS.map(x => { const g = gradPericia(f, x.id), b = bonusPericia(f, x.id), tot = a[x.attr] + g + b; return `<div class="cr-linha ${voc.pericias.includes(x.id) ? 'voc' : ''}"><span class="cresce">${esc(x.nome)}${x.treinada ? ' †' : ''} <small>${x.attr}</small></span><button class="mini" data-acao="per" data-v="${x.id}" data-d="-1">−</button><b class="cr-num">${g}</b><button class="mini" data-acao="per" data-v="${x.id}" data-d="1">+</button><span class="cr-final">${sinal(tot)}${b ? ` <small>(+${b})</small>` : ''}</span></div>`; }).join('')}</div>`;
  }
  function passoAparencia() {
    const a = f.aparencia, r = RACAS[f.raca];
    const cor = (campo, rot) => `<div><label>${rot}</label><input type="color" data-ap="${campo}" value="${esc(a[campo])}"></div>`;
    const sel = (campo, rot, ops) => `<div><label>${rot}</label><select data-ap="${campo}">${Object.entries(ops).map(([k, n]) => `<option value="${k}" ${String(a[campo]) === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>`;
    const chk = (campo, rot) => `<label class="cr-check"><input type="checkbox" data-apb="${campo}" ${a[campo] ? 'checked' : ''}> ${rot}</label>`;
    return `<h3>Aparência <button class="mini" data-acao="aleatorio">Sortear</button></h3>
      <label>Tom de pele</label><div class="cr-cores">${r.pele.map(c => `<button class="cr-cor ${a.pele === c ? 'sel' : ''}" data-acao="pele" data-v="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}<input type="color" data-ap="pele" value="${esc(a.pele)}"></div>
      <div class="linha">${sel('cabelo', 'Cabelo', CABELOS)}${cor('corCabelo', 'Cor do cabelo')}${cor('brilho', f.raca === 'sypheris' ? 'Tatuagens' : f.raca === 'veloryn' ? 'Brilho dos olhos' : 'Detalhe / tatuagem')}</div>
      <div class="linha">${cor('roupa', 'Roupa')}${cor('calca', 'Calça')}${sel('armadura', 'Armadura', { leve: 'Leve', media: 'Média', pesada: 'Pesada' })}${cor('corArmadura', 'Metal')}</div>
      <div class="linha">${sel('arma', 'Arma', ARMAS_VISUAIS)}${cor('corCapa', 'Capa / escudo')}${cor('base', 'Base da miniatura')}</div>
      <div class="cr-lista dois">${chk('capa', 'Capa')}${chk('escudo', 'Escudo')}${chk('capacete', 'Elmo')}${chk('barba', 'Barba')}</div>
      <h3>Seus dados</h3><div class="linha"><div><label>Dado de Kael</label><input type="color" data-dc="kael" value="${esc(dc.kael)}"></div><div><label>Dado de Lyra</label><input type="color" data-dc="lyra" value="${esc(dc.lyra)}"></div><div><label>Material</label><select data-dc="material">${Object.entries(MATERIAIS).map(([k, n]) => `<option value="${k}" ${dc.material === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div></div>`;
  }
  function passoIdentidade() {
    const erros = validar(f);
    return `<h3>Identidade</h3>
      <label>Nome</label><input data-campo="nome" maxlength="40" value="${esc(f.nome)}" placeholder="Ex.: Mira Cryon Valdane">
      <div class="linha"><div><label>Sigla do token</label><input data-campo="sigla" maxlength="3" value="${esc(f.sigla || '')}"></div><div><label>Nível</label><input data-campo="nivel" type="number" min="1" max="10" value="${f.nivel || 1}"></div></div>
      <label>Conceito</label><input data-campo="conceito" maxlength="120" value="${esc(f.conceito)}" placeholder="Ex.: ex-estivador de Gravitio que deve ao Sol Escamado">
      <label>Fardo</label><input data-campo="fardo" maxlength="120" value="${esc(f.fardo)}" placeholder="Vício, medo, dívida ou segredo">
      <label>Juramento</label><input data-campo="juramento" maxlength="120" value="${esc(f.juramento)}" placeholder="A promessa que te move">
      ${erros.length ? `<div class="cr-erros"><b>Antes de salvar:</b><ul>${erros.map(e => `<li>${esc(e)}</li>`).join('')}</ul></div>` : '<p class="cr-ok">Tudo certo. Personagem equilibrado pelas regras.</p>'}`;
  }
  const PAGINAS = [passoRaca, passoOrigem, passoVocacao, passoDom, passoAtributos, passoPericias, passoAparencia, passoIdentidade];

  function desenhar() {
    $('#crPassos').innerHTML = PASSOS.map((p, i) => `<button class="${i === passo ? 'sel' : ''}" data-acao="ir" data-v="${i}"><span>${i + 1}</span>${p}</button>`).join('');
    $('#crCorpo').innerHTML = PAGINAS[passo]();
    $('#crCorpo').scrollTop = 0;
    $('[data-acao="voltar"]').disabled = passo === 0;
    $('[data-acao="avancar"]').textContent = passo === PASSOS.length - 1 ? 'Salvar personagem' : 'Próximo';
    $('#crErro').textContent = '';
    resumo();
  }
  function trocouRaca() {
    const r = RACAS[f.raca]; f.sub = Object.keys(r.subs)[0];
    const pad = aparenciaPadrao(f.raca, f.vocacao);
    Object.assign(f.aparencia, { pele: pad.pele, cabelo: pad.cabelo, corCabelo: pad.corCabelo, brilho: pad.brilho, barba: pad.barba });
  }

  raiz.addEventListener('click', e => {
    const b = e.target.closest('[data-acao]'); if (!b || b.disabled) return;
    const v = b.dataset.v, d = Number(b.dataset.d || 0);
    switch (b.dataset.acao) {
      case 'fechar': fechar(); return;
      case 'ir': passo = Number(v); break;
      case 'voltar': passo = Math.max(0, passo - 1); break;
      case 'avancar':
        if (passo < PASSOS.length - 1) { passo++; break; }
        { const erros = validar(f); if (erros.length) { $('#crErro').textContent = erros[0]; return; } }
        aoSalvar(f, { ...dc }); fechar(); return;
      case 'raca': f.raca = v; trocouRaca(); atualizarPrevia(); break;
      case 'sub': f.sub = v; break;
      case 'origem': f.origem = v; break;
      case 'estrato':
        f.estrato = v;
        if (!ehAurethian(f) && VOCACOES[f.vocacao].soAurethian) f.vocacao = 'lamina';
        if (DONS_ELITE[f.dom] && v !== 'elite') f.dom = 'kalthor';
        if (v !== 'vellunari') f.facanhas = [];
        atualizarPrevia(); break;
      case 'vocacao': {
        f.vocacao = v; const voc = VOCACOES[v], arm = voc.armadura;
        Object.assign(f.aparencia, { arma: voc.arma, escudo: !!voc.escudo, armadura: arm === 'cota' ? 'media' : 'leve' });
        atualizarPrevia(); break;
      }
      case 'dom': f.dom = v; if (f.dom2 === v) f.dom2 = Object.keys(DONS).find(k => k !== v); atualizarPrevia(); break;
      case 'dom2': f.dom2 = v; break;
      case 'ressonancia': f.ressonancia = v; break;
      case 'attr': {
        const nv = f.atributos[v] + d, p = pontosAtributo(f);
        if (nv < 0 || nv > 4) return;
        if (nv === 0 && p.zeros >= 1) return;
        if (d > 0 && p.gastos >= p.total) return;
        f.atributos[v] = nv; break;
      }
      case 'per': {
        const atual = f.pericias[v] || 0, p = pontosPericia(f);
        if (d > 0 && (p.gastos >= p.total || gradPericia(f, v) >= 3)) return;
        if (d < 0 && atual <= 0) return;
        f.pericias[v] = atual + d; if (!f.pericias[v]) delete f.pericias[v]; break;
      }
      case 'pele': f.aparencia.pele = v; atualizarPrevia(); break;
      case 'aleatorio': {
        const r = RACAS[f.raca], s = arr => arr[Math.floor(Math.random() * arr.length)];
        const hsl = () => '#' + new THREE.Color().setHSL(Math.random(), .45 + Math.random() * .3, .25 + Math.random() * .3).getHexString();
        Object.assign(f.aparencia, { pele: s(r.pele), cabelo: s(Object.keys(CABELOS)), corCabelo: s(['#1b130d', '#3a2414', '#6a4a2a', '#b07a3a', '#d8c39a', '#dfe8f0', '#7a1f1f', '#2a2a2a']), roupa: hsl(), calca: hsl(), corCapa: hsl(), capa: Math.random() > .3 });
        atualizarPrevia(); break;
      }
      default: return;
    }
    desenhar();
  });
  raiz.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.campo) { f[t.dataset.campo] = t.dataset.campo === 'nivel' ? Math.max(1, Math.min(10, Number(t.value) || 1)) : t.value; resumo(); if (t.dataset.campo === 'livre') desenhar(); return; }
    if (t.dataset.ap) { f.aparencia[t.dataset.ap] = t.value; atualizarPrevia(); return; }
    if (t.dataset.apb) { f.aparencia[t.dataset.apb] = t.checked; atualizarPrevia(); return; }
    if (t.dataset.dc) { dc[t.dataset.dc] = t.value; return; }
    if (t.dataset.facanha) {
      const s = new Set(f.facanhas || []); t.checked ? s.add(t.dataset.facanha) : s.delete(t.dataset.facanha);
      if (s.size > 2) { t.checked = false; return; } f.facanhas = [...s]; resumo();
    }
  });
  raiz.addEventListener('change', e => { if (e.target.dataset.campo === 'nivel' || e.target.dataset.campo === 'nome') desenhar(); });

  function fechar() { vivo = false; ro.disconnect(); rr.dispose(); raiz.remove(); aoFechar?.(); }
  atualizarPrevia(); desenhar();
}
