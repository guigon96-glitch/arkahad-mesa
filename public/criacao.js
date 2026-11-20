// Assistente de criação de personagem com prévia 3D.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { criarMiniatura } from './miniatura.js';
import { carregarModelos, criarPersonagem, modelosProntos, ARMAS_3D, SECUNDARIAS, CABELOS_3D, ROUPAS, ACESSORIOS, SEXOS, ESTILO_DOM } from './modelos.js';
import {
  ATRIBUTOS, PERICIAS, RACAS, ORIGENS, ESTRATOS, FACANHAS, VOCACOES, DONS, DONS_ELITE, TODOS_DONS, notasDom, RESSONANCIAS,
  CUSTO_DOM, fichaVazia, aparenciaPadrao, pontosAtributo, atributosFinais, ARVORES, TALENTO, pontosTalento, arvoresPermitidas, pontosNaArvore, bloqueioTalento,
  ataqueArma, danoTecnica, ARMA_POR_VOCACAO, SECUNDARIA_POR_VOCACAO,
  pontosPericia, gradPericia, maxPericia, bonusPericia, ehAurethian, nivelDom, derivados, validar,
} from './conteudo.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const PASSOS = ['Raça', 'Origem e estrato', 'Vocação', 'Dom', 'Atributos', 'Perícias', 'Talentos', 'Aparência', 'Identidade'];
const MATERIAIS = { cristal: 'Cristal', osso: 'Osso', ferro: 'Ferro Lunar', brasa: 'Brasa' };
const sinal = n => (n > 0 ? '+' : '') + n;

export function abrirCriador({ ficha, dadosCor, aoSalvar, aoFechar }) {
  const f = JSON.parse(JSON.stringify(ficha || fichaVazia()));
  f.aparencia = { ...aparenciaPadrao(f.raca, f.vocacao, f.aparencia?.sexo), ...(f.aparencia?.sexo ? f.aparencia : { base: f.aparencia?.base || '#e2b04a' }) };
  f.talentos ||= [];
  let verImbuida = false, animPrevia = 'parado';
  const dc = { kael: '#d9a23a', lyra: '#3f78e0', material: 'cristal', ...(dadosCor || {}) };
  let passo = ficha ? 8 : 0;

  const raiz = document.createElement('div');
  raiz.className = 'criador';
  raiz.innerHTML = `<div class="cr-caixa">
    <header class="cr-topo"><h2>${ficha ? 'Editar personagem' : 'Criar personagem'}</h2><span class="cresce"></span><button data-acao="fechar" aria-label="Fechar">Fechar</button></header>
    <nav class="cr-passos" id="crPassos"></nav>
    <section class="cr-corpo" id="crCorpo"></section>
    <aside class="cr-previa"><div class="cr-palco" id="crPalco"></div>
      <div class="cr-anims" id="crAnims"><button data-anim="parado">Parado</button><button data-anim="andar">Andar</button><button data-anim="ataque">Atacar</button><button data-anim="magia">Dom</button><button data-anim="vitoria">Vitória</button><button data-acao="girar" aria-label="Girar">⟳</button></div>
      <div id="crResumo"></div></aside>
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
  const cam = new THREE.PerspectiveCamera(30, 1, .1, 50); cam.position.set(0, .82, 3.0); cam.lookAt(0, .55, 0);
  cena.add(new THREE.HemisphereLight('#fff4e0', '#3a2a1a', 1.1));
  const sol = new THREE.DirectionalLight('#ffd9a0', 2.4); sol.position.set(-2, 3, 2.5); sol.castShadow = true; cena.add(sol);
  const contra = new THREE.DirectionalLight('#7fa8ff', 1.4); contra.position.set(2, 1.5, -2); cena.add(contra);
  const disco = new THREE.Mesh(new THREE.CylinderGeometry(.7, .75, .06, 40), new THREE.MeshStandardMaterial({ color: '#2a1d12', roughness: .8 }));
  disco.position.y = -.03; disco.receiveShadow = true; cena.add(disco);
  let mini = null, vivo = true, girando = true;
  const ro = new ResizeObserver(() => { const w = palco.clientWidth, h = palco.clientHeight; if (w && h) { rr.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix(); } });
  ro.observe(palco);
  const relogio = new THREE.Clock();
  (function laco() { if (!vivo) return; requestAnimationFrame(laco); const dt = relogio.getDelta(); if (mini) { if (girando) mini.rotation.y += .006; const p = mini.userData.personagem; p?.atualizar ? p.atualizar(dt) : p?.mixer?.update(dt); } rr.render(cena, cam); })();
  const env = new THREE.PMREMGenerator(rr); cena.environment = env.fromScene(new RoomEnvironment(), .04).texture; cena.environmentIntensity = .5;
  function atualizarPrevia() {
    const rot = mini ? mini.rotation.y : .5;
    if (mini) cena.remove(mini);
    const dom = ehAurethian(f) ? TODOS_DONS[f.dom]?.cor : null;
    const imbuir = verImbuida && dom ? { cor: dom, estilo: ESTILO_DOM[f.dom] || 'luz' } : null;
    mini = modelosProntos() ? criarPersonagem(f.aparencia, f.raca, { cristal: dom, imbuir }) : criarMiniatura(f.aparencia, f.raca, { cristal: dom });
    mini.rotation.y = rot;
    cena.add(mini);
    if (animPrevia !== 'parado') mini.userData.personagem?.tocar(animPrevia);
  }

  // ---------- resumo ----------
  function resumo() {
    const d = derivados(f), a = d.atributos, r = RACAS[f.raca], v = VOCACOES[f.vocacao];
    const dom = ehAurethian(f) ? TODOS_DONS[f.dom] : null;
    $('#crResumo').innerHTML = `<div class="cr-nome">${esc(f.nome || 'Sem nome')}</div>
      <div class="cr-sub">${esc(r.nome)} ${esc(r.subs[f.sub]?.nome || '')} · ${esc(v.nome)}${dom ? ` · <span style="color:${dom.cor}">${esc(dom.nome)} N${nivelDom(f)}</span>` : ' · Vellunari'}</div>
      <div class="cr-attrs">${ATRIBUTOS.map(([k]) => `<span><b>${a[k]}</b>${k}</span>`).join('')}</div>
      <div class="cr-der"><span>Vigor <b>${d.vigorMax}</b></span><span>Fôlego <b>${d.folegoMax}</b></span><span>Defesa <b>${d.defesa}</b></span><span>Proteção <b>${d.protecao}</b></span><span>Robustez <b>${d.robustez}</b></span><span>Determ. <b>${d.determinacao}</b></span><span>Limiar <b>${d.limiar}</b></span><span>Desl. <b>${d.desloc}</b></span></div>
      ${(() => { const at = ataqueArma(f, verImbuida); return `<div class="cr-sub" style="margin-top:6px">${esc(at.nome)}: ataque ${sinal(at.mod)} · dano ${esc(at.dano)}</div>`; })()}`;
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
    const tecs = d => d.tec.slice(0, n).map((t, i) => `<li><b>N${i + 1} ${esc(t)}</b> · ${esc(d.inf[i].acao)} · ${danoTecnica(f, i + 1)}<br><small>${esc(d.inf[i].alc)} — ${esc(d.inf[i].ef)}</small></li>`).join('');
    const d1 = TODOS_DONS[f.dom];
    return `<h3>${f.estrato === 'dualista' ? 'Dom primário' : 'Dom'} (Nível ${n})</h3><div class="cr-grade quatro">${Object.entries(lista).map(([k, d]) => cartao(f.dom === k, 'dom', k, `<i class="ponto" style="background:${d.cor}"></i>${esc(d.nome)}${d.elite ? ' ✦' : ''}`, `<small>${esc(d.tema)} · ${d.chave}</small>`)).join('')}</div>
      ${d1 ? `<p class="cr-nota">${notasDom(d1).map(esc).join('<br>')}</p><ul class="cr-tracos">${tecs(d1)}</ul>` : ''}
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
  function passoTalentos() {
    const pt = pontosTalento(f), perm = arvoresPermitidas(f), aur = ehAurethian(f);
    const arvore = ([k, arv]) => {
      const ok = perm.includes(k);
      const grau = g => arv.nos.filter(n => n.grau === g);
      const no = n => {
        const tem = f.talentos.includes(n.id), bloq = tem ? null : bloqueioTalento(f, n.id);
        const semPonto = !tem && pt.gastos >= pt.total;
        return `<button class="cr-talento ${tem ? 'sel' : ''}" data-acao="talento" data-v="${n.id}" ${(!tem && (bloq || semPonto)) ? 'disabled' : ''} title="${esc(bloq || '')}"><b>${esc(n.nome)}</b><small>${esc(n.desc)}</small>${!tem && bloq ? `<em>${esc(bloq)}</em>` : ''}</button>`;
      };
      return `<div class="cr-arvore ${ok ? '' : 'fechada'}" style="--cor:${arv.cor}"><h4>${esc(arv.nome)} <small>${pontosNaArvore(f, k)} pts</small></h4><p>${esc(arv.desc)}</p>
        ${ok ? [1, 2, 3, 4, 5].filter(g => grau(g).length).map(g => `<div class="cr-grau"><span>G${g}</span><div>${grau(g).map(no).join('')}</div></div>`).join('') : `<p class="cr-nota">${arv.tipo === 'vellunari' ? 'Só para Vellunari.' : arv.tipo === 'cristal' ? 'Só para Canalizador e Curandeiro.' : 'Só para Aurethians.'}</p>`}</div>`;
    };
    return `<h3>Talentos <span class="cr-pontos ${pt.gastos <= pt.total ? 'ok' : ''}">${pt.total - pt.gastos} de ${pt.total} pontos</span></h3>
      <p class="cr-nota">${aur ? 'Aurethian: seus pontos vêm do sangue-estelar. Armas vão até o Grau 3, mas você tem as árvores do Dom e a <b>Arma Imbuída</b> — o Dom correndo pela lâmina ou pela flecha.' : 'Vellunari: sem Dom, mas com mais pontos, a Mestria (Graus 4 e 5) de todas as armas e a árvore do Sangue Comum. Ninguém luta melhor com aço.'} Cada nó custa 1 ponto; o Grau N exige N−1 pontos na mesma árvore. Ganha pontos a cada nível.</p>
      <div class="cr-arvores">${Object.entries(ARVORES).sort(([a], [b]) => perm.includes(b) - perm.includes(a)).map(arvore).join('')}</div>`;
  }
  function passoAparencia() {
    const a = f.aparencia, r = RACAS[f.raca];
    const cor = (campo, rot) => `<div><label>${rot}</label><input type="color" data-ap="${campo}" value="${esc(a[campo] || '#888888')}"></div>`;
    const sel = (campo, rot, ops, desab = false) => `<div><label>${rot}</label><select data-ap="${campo}" ${desab ? 'disabled' : ''}>${Object.entries(ops).map(([k, n]) => `<option value="${k}" ${String(a[campo]) === k ? 'selected' : ''}>${esc(typeof n === 'string' ? n : n.nome)}</option>`).join('')}</select></div>`;
    const chk = (campo, rot) => `<label class="cr-check"><input type="checkbox" data-apb="${campo}" ${a[campo] ? 'checked' : ''}> ${rot}</label>`;
    const faixa = (campo, rot, min, max) => `<div><label>${rot} <small>${Math.round((a[campo] || 1) * 100)}%</small></label><input type="range" data-apn="${campo}" min="${min}" max="${max}" step="0.01" value="${a[campo] || 1}"></div>`;
    const arma = ARMAS_3D[a.arma] || {}, semSec = arma.duas || arma.besta;
    const dom = ehAurethian(f) ? TODOS_DONS[f.dom] : null;
    const grupo = (k, t) => Object.fromEntries(Object.entries(t).filter(([, v]) => v.grupo === k || !v.grupo));
    return `<h3>Corpo <button class="mini" data-acao="aleatorio">Sortear visual</button></h3>
      <div class="cr-grade dois">${Object.entries(SEXOS).map(([k, n]) => cartao(a.sexo === k, 'sexo', k, n, '')).join('')}</div>
      <div class="linha">${faixa('altura', 'Altura', .9, 1.1)}${faixa('porte', 'Porte', .9, 1.15)}</div>
      <label>Tom de pele (${esc(r.nome)})</label><div class="cr-cores">${r.pele.map(c => `<button class="cr-cor ${a.pele === c ? 'sel' : ''}" data-acao="pele" data-v="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}<input type="color" data-ap="pele" value="${esc(a.pele)}" aria-label="Outro tom"></div>
      <div class="linha">${sel('cabelo', 'Cabelo', CABELOS_3D)}${cor('corCabelo', 'Cor do cabelo')}${cor('olhos', 'Olhos')}</div>
      <div class="cr-lista dois">${chk('barba', 'Barba')}${chk('tatuagem', f.raca === 'sypheris' ? 'Tatuagens luminosas' : 'Tatuagens de runas')}</div>
      ${a.tatuagem || f.raca === 'sypheris' ? `<div class="linha">${cor('corTatuagem', 'Cor das tatuagens')}</div>` : ''}
      <h3>Roupas</h3>
      <div class="linha">${sel('torso', 'Tronco', ROUPAS.torso)}${sel('pernas', 'Pernas', ROUPAS.pernas)}${sel('botas', 'Pés', ROUPAS.botas)}</div>
      <div class="linha">${cor('corRoupa', 'Tecido')}${cor('corCouro', 'Couro e detalhes')}${cor('base', 'Base da miniatura')}</div>
      <div class="cr-lista dois">${Object.entries(ACESSORIOS).map(([k, n]) => chk(k, n)).join('')}</div>
      <h3>Armas</h3>
      <div class="linha">${sel('arma', 'Mão principal', ARMAS_3D)}${sel('secundaria', semSec ? 'Outra mão (arma de duas mãos)' : 'Outra mão', SECUNDARIAS, semSec)}</div>
      ${dom ? `<label class="cr-check"><input type="checkbox" data-acao-chk="imbuida" ${verImbuida ? 'checked' : ''}> Ver a arma imbuída com ${esc(dom.nome)}${f.talentos.includes('imb1') ? '' : ' (pegue “Imbuir Arma” nos Talentos para usar em jogo)'}</label>` : ''}
      <p class="cr-nota">Chifres Draveth, crista e pele metálica Zarathim, escamas, olhos que brilham e tatuagens Sypheris vêm da raça. A arma da vocação é só a sugestão inicial — escolha a que quiser.</p>
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
  const PAGINAS = [passoRaca, passoOrigem, passoVocacao, passoDom, passoAtributos, passoPericias, passoTalentos, passoAparencia, passoIdentidade];

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
    const pad = aparenciaPadrao(f.raca, f.vocacao, f.aparencia.sexo);
    Object.assign(f.aparencia, { pele: pad.pele, cabelo: pad.cabelo, corCabelo: pad.corCabelo, brilho: pad.brilho, barba: pad.barba, olhos: pad.olhos, tatuagem: pad.tatuagem, corTatuagem: pad.corTatuagem });
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
        podarTalentos(); atualizarPrevia(); break;
      case 'vocacao': {
        f.vocacao = v;
        Object.assign(f.aparencia, { arma: ARMA_POR_VOCACAO[v] || 'espada', secundaria: SECUNDARIA_POR_VOCACAO[v] || 'nenhuma' });
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
        if (d > 0 && (p.gastos >= p.total || gradPericia(f, v) >= maxPericia(f))) return;
        if (d < 0 && atual <= 0) return;
        f.pericias[v] = atual + d; if (!f.pericias[v]) delete f.pericias[v]; break;
      }
      case 'pele': f.aparencia.pele = v; atualizarPrevia(); break;
      case 'sexo': {
        f.aparencia.sexo = v;
        if (v === 'f' && ['Hair_SimpleParted', 'Hair_Buzzed'].includes(f.aparencia.cabelo)) f.aparencia.cabelo = 'Hair_Long';
        if (v === 'm' && f.aparencia.cabelo === 'Hair_Buns') f.aparencia.cabelo = 'Hair_SimpleParted';
        if (v === 'f') f.aparencia.barba = false;
        atualizarPrevia(); break;
      }
      case 'talento': {
        const i = f.talentos.indexOf(v);
        if (i >= 0) { f.talentos.splice(i, 1); podarTalentos(); }
        else { if (bloqueioTalento(f, v) || pontosTalento(f).gastos >= pontosTalento(f).total) return; f.talentos.push(v); }
        break;
      }
      case 'girar': girando = !girando; return;
      case 'aleatorio': {
        const r = RACAS[f.raca], s = arr => arr[Math.floor(Math.random() * arr.length)];
        const hsl = (l = .3) => '#' + new THREE.Color().setHSL(Math.random(), .35 + Math.random() * .35, l + Math.random() * .2).getHexString();
        const cab = Object.keys(CABELOS_3D).filter(k => f.aparencia.sexo === 'f' ? k !== 'Hair_Buzzed' : k !== 'Hair_Buns');
        Object.assign(f.aparencia, {
          pele: s(r.pele), cabelo: f.raca === 'zarathim' ? 'careca' : s(cab), corCabelo: s(['#1b130d', '#3a2414', '#6a4a2a', '#b07a3a', '#d8c39a', '#dfe8f0', '#7a1f1f', '#2a2a2a']),
          corRoupa: hsl(.22), corCouro: hsl(.15), torso: s(Object.keys(ROUPAS.torso)), pernas: s(Object.keys(ROUPAS.pernas)), botas: s(Object.keys(ROUPAS.botas)),
          capuz: Math.random() > .7, ombreira: Math.random() > .5, bracadeira: Math.random() > .4, cinto: Math.random() > .3,
          altura: +(0.94 + Math.random() * .12).toFixed(2), porte: +(0.95 + Math.random() * .15).toFixed(2),
        });
        atualizarPrevia(); break;
      }
      default: return;
    }
    desenhar();
  });
  raiz.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.campo) { f[t.dataset.campo] = t.dataset.campo === 'nivel' ? Math.max(1, Math.min(10, Number(t.value) || 1)) : t.value; resumo(); if (t.dataset.campo === 'livre') desenhar(); return; }
    if (t.dataset.ap) { f.aparencia[t.dataset.ap] = t.value; atualizarPrevia(); if (t.dataset.ap === 'arma' || t.dataset.ap === 'secundaria') { desenhar(); } return; }
    if (t.dataset.apb) { f.aparencia[t.dataset.apb] = t.checked; atualizarPrevia(); if (t.dataset.apb === 'tatuagem') desenhar(); return; }
    if (t.dataset.apn) { f.aparencia[t.dataset.apn] = Number(t.value); t.previousElementSibling.querySelector('small').textContent = Math.round(t.value * 100) + '%'; clearTimeout(t._t); t._t = setTimeout(atualizarPrevia, 120); return; }
    if (t.dataset.acaoChk === 'imbuida') { verImbuida = t.checked; atualizarPrevia(); resumo(); return; }
    if (t.dataset.dc) { dc[t.dataset.dc] = t.value; return; }
    if (t.dataset.facanha) {
      const s = new Set(f.facanhas || []); t.checked ? s.add(t.dataset.facanha) : s.delete(t.dataset.facanha);
      if (s.size > 2) { t.checked = false; return; } f.facanhas = [...s]; resumo();
    }
  });
  raiz.addEventListener('change', e => { if (e.target.dataset.campo === 'nivel' || e.target.dataset.campo === 'nome') desenhar(); });

  // tira talentos que deixaram de valer (ex.: mudou de estrato ou removeu um pré-requisito)
  function podarTalentos() {
    let mudou = true;
    while (mudou) { mudou = false; for (const id of [...f.talentos]) if (bloqueioTalento(f, id)) { f.talentos.splice(f.talentos.indexOf(id), 1); mudou = true; } }
    const pt = pontosTalento(f); if (f.talentos.length > pt.total) f.talentos.length = pt.total;
  }
  raiz.querySelector('#crAnims').addEventListener('click', e => {
    const b = e.target.closest('[data-anim]'); if (!b || !mini) return;
    animPrevia = ['parado', 'andar'].includes(b.dataset.anim) ? b.dataset.anim : 'parado';
    mini.userData.personagem?.tocar(b.dataset.anim);
  });
  function fechar() { vivo = false; ro.disconnect(); rr.dispose(); raiz.remove(); aoFechar?.(); }
  atualizarPrevia(); desenhar();
  if (!modelosProntos()) carregarModelos().then(() => { if (vivo) atualizarPrevia(); }).catch(() => {});
}
