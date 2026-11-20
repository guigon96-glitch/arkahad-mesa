// Conteúdo do Livro de Regras "Sangue e Cristal" usado pelo criador de personagem.
// Edite aqui para ajustar raças, vocações, Dons e o cálculo dos valores derivados.

export const ATRIBUTOS = [
  ['FOR', 'Força'], ['AGI', 'Agilidade'], ['RES', 'Resistência'], ['INT', 'Intelecto'],
  ['PER', 'Percepção'], ['VON', 'Vontade'], ['PRE', 'Presença'],
];

export const PERICIAS = [
  ['combate_leve', 'Combate Leve', 'AGI'], ['combate_pesado', 'Combate Pesado', 'FOR'], ['pontaria', 'Pontaria', 'AGI'],
  ['briga', 'Briga', 'FOR'], ['canalizacao', 'Canalização', 'VON'], ['atletismo', 'Atletismo', 'FOR'],
  ['acrobacia', 'Acrobacia', 'AGI'], ['furtividade', 'Furtividade', 'AGI'], ['ladinagem', 'Ladinagem', 'AGI', true],
  ['atencao', 'Atenção', 'PER'], ['rastreamento', 'Rastreamento', 'PER'], ['intuicao', 'Intuição', 'PER'],
  ['sobrevivencia', 'Sobrevivência', 'PER'], ['natureza', 'Natureza', 'INT'], ['medicina', 'Medicina', 'INT', true],
  ['alquimia', 'Alquimia', 'INT', true], ['conhecimento', 'Conhecimento', 'INT'], ['runas', 'Runas', 'INT', true],
  ['tatica', 'Tática', 'INT'], ['oficio', 'Ofício', 'INT'], ['navegacao', 'Navegação', 'PER'],
  ['persuasao', 'Persuasão', 'PRE'], ['enganacao', 'Enganação', 'PRE'], ['intimidacao', 'Intimidação', 'PRE'],
  ['etiqueta', 'Etiqueta', 'PRE'], ['intriga', 'Intriga', 'INT'], ['comercio', 'Comércio', 'PRE'],
  ['montaria', 'Montaria e Condução', 'AGI'],
].map(([id, nome, attr, treinada]) => ({ id, nome, attr, treinada: !!treinada }));
export const PERICIA = Object.fromEntries(PERICIAS.map(p => [p.id, p]));

// mods: atributos; bonus: bônus fixos em testes de perícia; extra: efeitos nos derivados
export const RACAS = {
  sarthani: {
    nome: 'Sarthani', desc: 'Humanos adaptáveis e numerosos, com tatuagens tribais de runas de Kael.',
    mods: {}, livre: 1, periciaExtra: 1, desloc: 6, vida: 80,
    tracos: ['+1 em um atributo à escolha', '+1 ponto de perícia', 'Imunes a doenças comuns', 'Vulneráveis a venenos necróticos (Nytherin)'],
    subs: {
      nortista: { nome: 'Nortista', desc: 'Vorngard e Kaerith. +2 Vigor; Vantagem contra Intimidação.', extra: { vigor: 2 } },
      sulista: { nome: 'Sulista', desc: 'Cethor e Sylvannis. +2 em Comércio.', bonus: { comercio: 2 } },
    },
    pele: ['#f1d2b6', '#d9a982', '#b57d55', '#8a5a3a', '#5e3b26', '#3e271a'],
  },
  zarathim: {
    nome: 'Zarathim', desc: 'Pele cinza metálica, cristas ósseas e olhos âmbar. Guerreiros que desprezam a fraqueza.',
    mods: { FOR: 1, RES: 1, PRE: -1 }, desloc: 6, vida: 70,
    tracos: ['Pele metálica: Proteção 1 contra corte', 'Cabeçada 1d6', 'Orgulho de Aranor: +2 no ataque ao ficar abaixo da metade', 'Desvantagem contra toxinas de musgo e fungo'],
    subs: {
      cruzador: { nome: 'Cruzador', desc: 'Nômade. Deslocamento 7 e +2 em Sobrevivência.', desloc: 7, bonus: { sobrevivencia: 2 } },
      fortificado: { nome: 'Fortificado', desc: 'Defensor. Proteção natural 2 contra corte e perfuração; Deslocamento 5.', desloc: 5, extra: { protecao: 1 } },
    },
    pele: ['#8d9399', '#6f767d', '#a7adb3', '#5a6066', '#7b7f86'],
  },
  veloryn: {
    nome: 'Veloryn', desc: 'Pele azul translúcida, olhos luminescentes e cabelos prateados. Guardiões das florestas.',
    mods: { PER: 1, VON: 1, FOR: -1 }, desloc: 6, vida: 90, bonus: { natureza: 2, medicina: 2 },
    tracos: ['Enxergam na penumbra e na Noite Azul', 'Vantagem em Robustez contra venenos', '+2 em Natureza e Medicina', 'Vulneráveis a fogo'],
    subs: {
      florestano: { nome: 'Florestano', desc: 'Draymar. Ignoram vegetação como terreno difícil.' },
      lacustre: { nome: 'Lacustre', desc: 'Sylvannis. Nadam com Deslocamento cheio; prendem o fôlego 10 minutos.' },
    },
    pele: ['#7fb6e8', '#5f9ad6', '#9ccdf0', '#6a8fd8', '#86c4e0'],
  },
  draveth: {
    nome: 'Draveth', desc: 'Escamas vermelhas ou douradas, chifres curvados e olhos reptilianos. Mercadores e marinheiros.',
    mods: { RES: 1, PRE: 1, AGI: -1 }, desloc: 6, vida: 85,
    tracos: ['Escamas: Proteção 1 contra tudo', 'Resistente 3 a fogo', 'Pacto de Sangue: Vantagem para fazer cumprir contratos', 'Vulneráveis a frio'],
    extra: { protecao: 1 },
    subs: {
      arenoso: { nome: 'Arenoso', desc: 'Cethor. +1 FOR no lugar de +1 RES; +2 em Sobrevivência no deserto.', mods: { FOR: 1, RES: -1 }, bonus: { sobrevivencia: 2 } },
      maritimo: { nome: 'Marítimo', desc: 'Sylvannis. +1 AGI (anula o −1); +2 em Navegação.', mods: { AGI: 1 }, bonus: { navegacao: 2 } },
    },
    pele: ['#b8392c', '#9c2b22', '#d2a23a', '#c4782a', '#7d2a20'],
  },
  sypheris: {
    nome: 'Sypheris', desc: 'Pele negra brilhante, tatuagens luminescentes que mudam com a emoção, olhos brancos.',
    mods: { INT: 1, PER: 1, RES: -1 }, desloc: 6, vida: 75,
    tracos: ['Pele refletora: Resistente 3 a luz', 'Memória Estelar: Vantagem para lembrar', 'Tatuagens revelam emoções (+2 para lê-los)', 'Ossos frágeis: Limiar de Ferimento −2'],
    extra: { limiarFer: -2 },
    subs: {
      luminoso: { nome: 'Luminoso', desc: 'Xilthor. +2 em Conhecimento.', bonus: { conhecimento: 2 } },
      sombrio: { nome: 'Sombrio', desc: 'Exploradores. +2 em Furtividade.', bonus: { furtividade: 2 } },
    },
    pele: ['#2e2a36', '#3a3442', '#26222c', '#4a4152'],
  },
  dvarith: {
    nome: 'Dvarith', desc: 'Baixos, pele acinzentada, olhos de brasa e barbas trançadas com ferro. Vida curta e intensa.',
    mods: { FOR: 1, RES: 1, AGI: -1 }, desloc: 5, vida: 60,
    tracos: ['+1 Vigor por nível', 'Vantagem para não ser derrubado', 'Resistente 3 a fogo', 'Lentos na água'],
    extra: { vigorNivel: 1 },
    subs: {
      montanhes: { nome: 'Montanhês', desc: 'Velshar. +2 em Ofício; armas que forjam ganham +1 de dano.', bonus: { oficio: 2 } },
      cavernicola: { nome: 'Cavernícola', desc: 'Visão no escuro de 12 quadrados; Desvantagem em Percepção ao meio-dia.' },
    },
    pele: ['#9a948c', '#7f7a73', '#b2aca3', '#6b665f'],
  },
};

export const ORIGENS = {
  kaerith: { nome: 'Kaerith', desc: 'Planalto político', pericias: ['intriga', 'etiqueta'] },
  cethor: { nome: 'Cethor', desc: 'Deserto do ouro', pericias: ['comercio', 'sobrevivencia'] },
  velshar: { nome: 'Velshar', desc: 'Forjas do norte', pericias: ['oficio', 'atletismo'] },
  draymar: { nome: 'Draymar', desc: 'Santuário verde', pericias: ['natureza', 'medicina'] },
  sylvannis: { nome: 'Sylvannis', desc: 'Ilhas do coral', pericias: ['navegacao', 'atletismo'] },
  xilthor: { nome: 'Xilthor', desc: 'Pântano dos arquivos', pericias: ['conhecimento', 'runas'] },
  vorngard: { nome: 'Vorngard', desc: 'Terra dos ossos', pericias: ['combate_pesado', 'intimidacao'] },
  ithorak: { nome: 'Ithorak', desc: 'Cânion dos renegados', pericias: ['furtividade', 'ladinagem'] },
  auraxis: { nome: 'Auraxis', desc: 'Centro neutro', pericias: ['etiqueta', 'intuicao'] },
};

export const ESTRATOS = {
  vellunari: { nome: 'Vellunari', desc: 'Sem Dom (~60%). +1 ponto de atributo, +3 perícias, +4 Fôlego e 2 Façanhas do Sangue Comum.', pontos: 1, pericias: 3, folego: 4, dom: 0 },
  operario: { nome: 'Aurethian Operário', desc: 'Dom no Nível 1 (~38%). Cristal Definitivo e registro em Auraxis.', pontos: 0, dom: 1 },
  elite: { nome: 'Aurethian de Elite', desc: 'Dom no Nível 2 e acesso aos Dons de Elite (~2%). −2 pontos de atributo; Obrigação com uma Casa.', pontos: -2, dom: 2, elite: true },
  dualista: { nome: 'Dualista', desc: 'Dois Dons no Nível 1 com um único tanque de Fôlego (1 em 5.000). −1 ponto de atributo; segredo do Sangue-Duplo.', pontos: -1, dom: 1, dois: true },
};

export const FACANHAS = {
  vontade: 'Vontade de Ferro — Vantagem contra Psyka, Phasma, Somnis e Umbra',
  calejada: 'Mão Calejada — Manobras custam 1 Fôlego a menos',
  cacador: 'Caçador de Sangue-Estelar — +2 de dano contra quem usou Dom nesta rodada',
  alquimico: 'Engenho Alquímico — −2 DIF em Alquimia',
  povo: 'Olho do Povo — encontra um informante Vellunari por sessão',
  teimosia: 'Teimosia — ignora uma condição por 1 rodada, 1 vez por cena',
  esquiva: 'Esquiva do Comum — +1 Defesa contra ataques de Dons',
  leitor: 'Leitor de Cristais — PER DIF 15 revela o Dom de um Aurethian',
  lavrador: 'Resistência de Lavrador — +1 Limiar de Ferimento e +3 Vigor',
  ressentimento: 'Ressentimento Afiado — +2 Intimidação e Intriga contra a Elite',
};

export const ARMADURAS = {
  nenhuma: { nome: 'Roupas', p: 0, agiMax: 9 },
  acolchoada: { nome: 'Acolchoada', p: 1, agiMax: 9 },
  couro: { nome: 'Couro', p: 2, agiMax: 9 },
  cota: { nome: 'Cota de malha', p: 3, agiMax: 3 },
};

export const VOCACOES = {
  lamina: { nome: 'Lâmina', papel: 'Duelista, dano corpo a corpo', vigor: 4, pericias: ['combate_leve', 'combate_pesado', 'atletismo', 'acrobacia', 'intimidacao'], armadura: 'couro', arma: 'sabre', kit: 'Sabre, adaga, couro', hab: 'Posturas de Duelo: Ofensiva (+2 ataque, −2 Defesa), Guarda (+2 Defesa) ou Contra (Reação: ataca quem errar você).' },
  sentinela: { nome: 'Sentinela', papel: 'Defensor, controle de linha', vigor: 6, pericias: ['combate_pesado', 'briga', 'atletismo', 'tatica', 'atencao'], armadura: 'cota', escudo: 2, arma: 'espada', kit: 'Espada, escudo, cota de malha', hab: 'Muralha: Reação — vira o alvo de um ataque contra aliado adjacente.' },
  batedor: { nome: 'Batedor', papel: 'Explorador, combate à distância', vigor: 2, pericias: ['pontaria', 'rastreamento', 'sobrevivencia', 'furtividade', 'natureza'], armadura: 'couro', arma: 'arco', kit: 'Arco curto, espada curta, couro, corda', hab: 'Marcar Presa: +1d6 de dano contra ela e Vantagem para rastreá-la.' },
  sombra: { nome: 'Sombra', papel: 'Espião, assassino, ladrão', vigor: 2, pericias: ['combate_leve', 'furtividade', 'ladinagem', 'enganacao', 'acrobacia'], armadura: 'couro', arma: 'adaga', kit: '2 adagas, espada curta, couro, ferramentas de ladrão', hab: 'Golpe Furtivo: +2d6 de dano contra alvo Flanqueado ou Desprevenido.' },
  alquimista: { nome: 'Alquimista', papel: 'Preparos, venenos, bombas', vigor: 0, pericias: ['alquimia', 'natureza', 'medicina', 'oficio', 'pontaria'], armadura: 'acolchoada', arma: 'besta', kit: 'Besta leve, adaga, acolchoada, kit alquímico', hab: 'Bolsa de Preparos: INT + 2 doses de receitas comuns por descanso longo.' },
  erudito: { nome: 'Erudito', papel: 'Conhecimento, runas, contra-Dom', vigor: 0, pericias: ['conhecimento', 'runas', 'tatica', 'intuicao', 'intriga'], armadura: 'acolchoada', arma: 'adaga', kit: 'Adaga, acolchoada, livros, lente', hab: 'Códice Vivo: identifica um Dom visto (DIF 15); aliados ganham +2 contra aquele alvo.' },
  orador: { nome: 'Orador', papel: 'Líder, diplomata, manipulador', vigor: 2, pericias: ['persuasao', 'enganacao', 'etiqueta', 'intriga', 'comercio'], armadura: 'nenhuma', arma: 'espada', kit: 'Sabre, roupas finas, anel de sinete, +5 K', hab: 'Palavra de Comando: um aliado se move 3 quadrados ou ganha +2 no próximo teste.' },
  curandeiro: { nome: 'Curandeiro', papel: 'Suporte físico, recuperação', vigor: 2, pericias: ['medicina', 'natureza', 'alquimia', 'intuicao', 'persuasao'], armadura: 'couro', arma: 'martelo', kit: 'Martelo leve, escudo de madeira, couro, 2 kits médicos, ervas de Nimriel', hab: 'Mãos Firmes: estabiliza ou cura 1d6 + INT de Vigor.' },
  canalizador: { nome: 'Canalizador', papel: 'Especialista no próprio Dom', vigor: 2, pericias: ['canalizacao', 'atletismo', 'conhecimento', 'atencao', 'intimidacao'], armadura: 'couro', arma: 'espada', kit: 'Arma à escolha, couro, cristal de foco', hab: 'Fluxo Disciplinado: +3 Fôlego; a primeira técnica de cada turno custa 1 Fôlego a menos.', soAurethian: true, extra: { folego: 3 } },
};

const T = (...n) => n;
export const DONS = {
  kalthor: { nome: 'Kalthor', tema: 'Calor, fogo e fumaça', chave: 'VON', cor: '#ff7a1e', tec: T('Atiçar', 'Esfera de Fogo', 'Barreira de Chamas', 'Tempestade de Fogo') },
  cryon: { nome: 'Cryon', tema: 'Gelo', chave: 'VON', cor: '#8fe3ff', tec: T('Gelo Escorregadio', 'Escudo de Gelo', 'Parede de Gelo', 'Tempestade de Gelo') },
  verdis: { nome: 'Verdis', tema: 'Plantas', chave: 'VON', cor: '#5fd05a', tec: T('Brotar', 'Cipós', 'Muralha de Espinhos', 'Fortaleza Viva') },
  vithar: { nome: 'Vithar', tema: 'Suporte vital (cura)', chave: 'VON', cor: '#ffe08a', tec: T('Fechar Cortes', 'Regenerar', 'Pulso Vital', 'À Beira da Morte') },
  phasma: { nome: 'Phasma', tema: 'Ilusões', chave: 'INT', cor: '#c9a0ff', tec: T('Imagem Estática', 'Figuras Animadas', 'Cena Complexa', 'Mundo Falso') },
  zephyr: { nome: 'Zephyr', tema: 'Ar e ventos', chave: 'AGI', cor: '#d8f3ff', tec: T('Rajada', 'Escudo de Ar', 'Redemoinho', 'Ventania') },
  toxys: { nome: 'Toxys', tema: 'Venenos', chave: 'INT', cor: '#9be04a', tec: T('Exsudar', 'Toxina Paralisante', 'Jato Venenoso', 'Nuvem Letal') },
  voltri: { nome: 'Voltri', tema: 'Eletricidade', chave: 'AGI', cor: '#ffe94a', tec: T('Faísca', 'Arco Elétrico', 'Corrente', 'Relâmpago') },
  umbra: { nome: 'Umbra', tema: 'Sombras menores', chave: 'AGI', cor: '#7a5fd0', tec: T('Mão de Sombra', 'Cão de Sombra', 'Lâmina de Sombra', 'Silhueta Sólida') },
  sonara: { nome: 'Sonara', tema: 'Sons', chave: 'PRE', cor: '#f0c0ff', tec: T('Voz do Sino', 'Grito', 'Onda Sônica', 'Explosão Sônica') },
  aquilon: { nome: 'Aquilon', tema: 'Adaptação aquática', chave: 'RES', cor: '#3fa6ff', tec: T('Membranas', 'Nadadeiras e Escamas', 'Correntes', 'Ondas') },
  lumora: { nome: 'Lumora', tema: 'Luz', chave: 'VON', cor: '#fff6c0', tec: T('Brilho', 'Pulso Cegante', 'Explosão Luminosa', 'Aura Radiante') },
  morphis: { nome: 'Morphis', tema: 'Mimetismo animal', chave: 'FOR', cor: '#c08a4a', tec: T('Traço Menor', 'Asas ou Guelras', 'Forma Parcial', 'Forma Quase Completa') },
  specula: { nome: 'Specula', tema: 'Reflexos', chave: 'PER', cor: '#e0e8f0', tec: T('Reflexo Falso', 'Espelho de Defesa', 'Cópias', 'Clone Semi-sólido') },
  cristalis: { nome: 'Cristalis', tema: 'Cristais Vaeloryn', chave: 'INT', cor: '#7ff0e0', tec: T('Vibrar', 'Lâmina de Cristal', 'Barreira Refletora', 'Estacas') },
  gravitio: { nome: 'Gravitio', tema: 'Massa e peso', chave: 'VON', cor: '#8a7aff', tec: T('Aliviar', 'Pesar Arma', 'Imobilizar', 'Campo de Peso') },
  chronos: { nome: 'Chronos', tema: 'Percepção temporal', chave: 'PER', cor: '#ffd27a', tec: T('Reflexos Acelerados', 'Retardar', 'Ritmo do Grupo', 'Bolsão Temporal') },
  psyka: { nome: 'Psyka', tema: 'Mente menor', chave: 'PRE', cor: '#ff7ad0', tec: T('Toque Emocional', 'Sugestão', 'Pânico ou Lealdade', 'Ordem Implantada') },
  biomor: { nome: 'Biomor', tema: 'Adaptação biológica', chave: 'RES', cor: '#7ad08a', tec: T('Adaptação Leve', 'Adaptação Extrema', 'Traço Vital', 'Adaptação Impossível') },
  aether: { nome: 'Aether', tema: 'Campos de energia', chave: 'VON', cor: '#a0d8ff', tec: T('Escudo Pequeno', 'Barreira', 'Cúpula', 'Fortaleza de Energia') },
  spectra: { nome: 'Spectra', tema: 'Projeção espectral', chave: 'VON', cor: '#b0f0ff', tec: T('Espiar', 'Tocar', 'Manipular', 'Espectro Semi-sólido') },
  visora: { nome: 'Visora', tema: 'Presciência limitada', chave: 'PER', cor: '#f8e8a0', tec: T('Lampejo', 'Pressentir', 'Cenário Curto', 'Visão Clara') },
  geo: { nome: 'Geo', tema: 'Terra e endurecimento', chave: 'FOR', cor: '#c09060', tec: T('Pele de Madeira', 'Pele de Pedra', 'Pele de Ferro', 'Pele de Aço') },
  ferrar: { nome: 'Ferrar', tema: 'Metais', chave: 'FOR', cor: '#b8c0c8', tec: T('Moldar', 'Escudo de Placa', 'Dobrar Arma', 'Grande Moldagem') },
  nebulon: { nome: 'Nebulon', tema: 'Névoas e vapores', chave: 'INT', cor: '#b0b8a0', tec: T('Véu de Névoa', 'Vapor Irritante', 'Vapor Corrosivo', 'Tempestade de Vapores') },
  somnis: { nome: 'Somnis', tema: 'Sonhos', chave: 'PRE', cor: '#9080ff', tec: T('Sonho Calmo', 'Pesadelo', 'Sonho Complexo', 'Sonho Coletivo') },
};
export const DONS_ELITE = {
  chama_abismo: { nome: 'Chama do Abismo', tema: 'Fogo primordial', chave: 'VON', cor: '#3a6bff', elite: true, tec: T('Brasa Abissal', 'Lança Abissal', 'Muralha Voraz', 'Inferno') },
  eco_estelar: { nome: 'Eco Estelar', tema: 'Percepção absoluta', chave: 'PER', cor: '#ffffff', elite: true, tec: T('Ler Intenções', 'Desmascarar', 'Coordenar', 'Percepção Absoluta') },
  veu_caos: { nome: 'Véu do Caos', tema: 'Distorção sensorial', chave: 'PRE', cor: '#c040ff', elite: true, tec: T('Desorientar', 'Inverter Sentido', 'Ocultar Aliados', 'Exército Falso') },
  dissolucao: { nome: 'Dissolução', tema: 'Desintegração inorgânica', chave: 'PER', cor: '#d0d0d0', elite: true, tec: T('Dissolver', 'Desarmar', 'Anular', 'Reduzir a Pó') },
  entropia: { nome: 'Entropia', tema: 'Caos molecular', chave: 'INT', cor: '#ff4040', elite: true, tec: T('Deteriorar', 'Detonar', 'Corroer', 'Zona de Caos') },
  caosmora: { nome: 'Caosmora', tema: 'Distorção em massa', chave: 'PRE', cor: '#ff60a0', elite: true, tec: T('Desequilíbrio', 'Terreno Falso', 'Anular Sentido', 'Legião') },
  eterna: { nome: 'Eterna', tema: 'Regeneração avançada', chave: 'RES', cor: '#ff8080', elite: true, tec: T('Regenerar', 'Fechar Ferimentos', 'Anular Ferimento', 'Retorno') },
  intuara: { nome: 'Intuara', tema: 'Compreensão analítica', chave: 'INT', cor: '#80ffd0', elite: true, tec: T('Observar', 'Ler Estilo', 'Copiar Manobra', 'Desmonte Total') },
};
export const TODOS_DONS = { ...DONS, ...DONS_ELITE };
export const CUSTO_DOM = [1, 2, 3, 5];
export const DANO_DOM = ['1d6+1', '2d6+2', '3d6+3', '5d6+4'];

export const RESSONANCIAS = {
  cromatico: { nome: 'Cromático', desc: 'Muda de cor com a emoção. 1×/cena, +2 de dano sob emoção forte.' },
  ressonante: { nome: 'Ressonante', desc: 'Vibra. Sente Dons a 6 quadrados; não é surpreendido por Dons.' },
  silente: { nome: 'Silente', desc: 'Estático. +2 em Furtividade ao usar Dom; o Mestre guarda sua Tensão.' },
  sonoro: { nome: 'Sonoro', desc: 'Toca como sino. Aliados que ouvem ganham +1 Iniciativa.' },
  luminescente: { nome: 'Luminescente', desc: 'Brilha com o esforço. +1 Limiar de Colapso; Tensão visível.', extra: { limiar: 1 } },
  reativo: { nome: 'Reativo', desc: 'Cor do Dom. Dualistas trocam de Dom sem custo de ação.' },
  opaco: { nome: 'Opaco', desc: 'Raro, sem resposta. +2 Fôlego; a Zona 3 vem sem aviso.', extra: { folego: 2 } },
};

// Armas (o visual 3D fica em modelos.js). tipo liga a arma à árvore de talentos e à perícia de ataque.
export const ARMAS = {
  nenhuma: { nome: 'Punhos', tipo: 'briga', dano: '1d4' },
  espada: { nome: 'Espada', tipo: 'lamina', dano: '1d8' }, sabre: { nome: 'Sabre curvo', tipo: 'lamina', dano: '1d8' },
  adaga: { nome: 'Adaga', tipo: 'lamina', dano: '1d6' }, adaga_serrilhada: { nome: 'Adaga serrilhada', tipo: 'lamina', dano: '1d6' },
  espada_longa: { nome: 'Espada longa', tipo: 'peso', dano: '2d6', duas: true }, montante: { nome: 'Montante', tipo: 'peso', dano: '2d6+1', duas: true },
  machado: { nome: 'Machado', tipo: 'peso', dano: '1d8+1' }, machadinha: { nome: 'Machadinha', tipo: 'peso', dano: '1d8' },
  machado_guerra: { nome: 'Machado de guerra', tipo: 'peso', dano: '2d6+1', duas: true }, machado_duplo: { nome: 'Machado duplo', tipo: 'peso', dano: '2d8', duas: true },
  martelo: { nome: 'Martelo', tipo: 'peso', dano: '1d8' }, martelo_guerra: { nome: 'Martelo de guerra', tipo: 'peso', dano: '2d6+2', duas: true },
  foice: { nome: 'Foice de guerra', tipo: 'peso', dano: '2d6', duas: true },
  arco: { nome: 'Arco de madeira', tipo: 'distancia', dano: '1d8', duas: true }, arco_recurvo: { nome: 'Arco recurvo', tipo: 'distancia', dano: '1d8+1', duas: true },
  arco_dourado: { nome: 'Arco dourado', tipo: 'distancia', dano: '1d10', duas: true }, arco_sombrio: { nome: 'Arco sombrio', tipo: 'distancia', dano: '1d10', duas: true },
  besta: { nome: 'Besta de mão', tipo: 'distancia', dano: '1d8' }, besta_pesada: { nome: 'Besta pesada', tipo: 'distancia', dano: '2d6', duas: true },
};
export const PERICIA_ARMA = { lamina: 'combate_leve', peso: 'combate_pesado', distancia: 'pontaria', briga: 'briga' };
const ARMA_ANTIGA = { espada_grande: 'espada_longa', machado_grande: 'machado_guerra', adagas: 'adaga', cajado: 'espada', varinha: 'adaga', lanca: 'foice', maca: 'martelo', leques: 'adaga' };
export function armaDe(f) { const a = f?.aparencia?.arma; return ARMAS[a] ? a : ARMA_ANTIGA[a] || 'espada'; }
export function temEscudo(f) { const ap = f?.aparencia || {}; return String(ap.secundaria || '').startsWith('escudo') && !ARMAS[armaDe(f)]?.duas; }
export const ARMA_POR_VOCACAO = { lamina: 'sabre', sentinela: 'espada', batedor: 'arco', sombra: 'adaga', alquimista: 'besta', erudito: 'adaga', orador: 'espada', curandeiro: 'martelo', canalizador: 'espada' };
export const SECUNDARIA_POR_VOCACAO = { sentinela: 'escudo_brasao', sombra: 'adaga', alquimista: 'bomba', curandeiro: 'escudo_madeira' };

// ================= Árvores de talentos =================
// Cada nó custa 1 Ponto de Talento. Para pegar um nó do Grau N você precisa já ter N−1 pontos naquela árvore.
// Aurethians: armas só até o Grau 3, mas têm as árvores do Dom e a árvore híbrida (Arma Imbuída).
// Vellunari (humanos sem Dom): mais pontos, Graus 4–5 (Mestria) nas armas e a árvore do Sangue Comum.
const N = (id, grau, nome, desc, ef) => ({ id, grau, nome, desc, ef: ef || null });
export const ARVORES = {
  laminas: { nome: 'Lâminas', tipo: 'arma', cor: '#cfd6dc', desc: 'Espadas, sabres e adagas. Precisão e contra-ataque.', nos: [
    N('lam1a', 1, 'Golpe Preciso', '+1 nos ataques com lâminas.', { ataque: { lamina: 1 } }),
    N('lam1b', 1, 'Guarda Alta', '+1 Defesa empunhando uma lâmina.', { defesaArma: { lamina: 1 } }),
    N('lam2a', 2, 'Corte Duplo', 'Com duas armas, 1 ataque extra por turno com −2 (custa 1 Fôlego).'),
    N('lam2b', 2, 'Finta', 'Ação: Enganação contra Intuição do alvo; se vencer, ele fica Desprevenido.'),
    N('lam3', 3, 'Riposte', 'Reação (1×/rodada, 1 Fôlego): quando um inimigo adjacente erra você, ataque-o.'),
    N('lam4a', 4, 'Mestre de Lâminas', '+1d6 de dano com lâminas. Só Vellunari.', { dano: { lamina: '1d6' }, soVellunari: true }),
    N('lam4b', 4, 'Dança de Aço', 'Entre dois ataques, mova até 2 casas sem provocar. Só Vellunari.', { soVellunari: true }),
    N('lam5', 5, 'Mil Cortes', '1×/cena: ataque cada inimigo adjacente com bônus cheio. Só Vellunari.', { soVellunari: true }),
  ] },
  pesadas: { nome: 'Armas Pesadas', tipo: 'arma', cor: '#b58a5a', desc: 'Machados, martelos, montantes e foices. Força bruta.', nos: [
    N('pes1a', 1, 'Braço Forte', '+1 de dano com armas pesadas.', { danoFixo: { peso: 1 } }),
    N('pes1b', 1, 'Pegada Firme', 'Vantagem contra desarme e empurrão.'),
    N('pes2a', 2, 'Quebra-Guarda', 'Ao acertar, a Defesa do alvo cai 2 até o seu próximo turno.'),
    N('pes2b', 2, 'Varrer', 'Um ataque atinge dois inimigos adjacentes, com −2.'),
    N('pes3', 3, 'Golpe Esmagador', '3 Fôlego: +2d6 de dano; o alvo cai se falhar em Robustez.'),
    N('pes4a', 4, 'Fúria de Ferro', '+2 de dano e ignora 2 de Proteção. Só Vellunari.', { danoFixo: { peso: 2 }, soVellunari: true }),
    N('pes4b', 4, 'Inquebrável', '+4 Vigor e Vantagem contra ser derrubado. Só Vellunari.', { vigor: 4, soVellunari: true }),
    N('pes5', 5, 'Terremoto', '1×/cena: golpe no chão — dano da arma em área 3×3 e todos caem. Só Vellunari.', { soVellunari: true }),
  ] },
  distancia: { nome: 'Distância', tipo: 'arma', cor: '#8fb37a', desc: 'Arcos e bestas. Mira, alcance e controle.', nos: [
    N('dis1a', 1, 'Olho Firme', '+1 nos ataques à distância.', { ataque: { distancia: 1 } }),
    N('dis1b', 1, 'Recarga Rápida', 'Recarregar a besta não gasta ação; sacar flecha é livre.'),
    N('dis2a', 2, 'Tiro Mirado', 'Gaste 1 ação parado: +2 no próximo disparo.'),
    N('dis2b', 2, 'Disparo Duplo', 'Dois disparos na mesma ação, ambos com −3.'),
    N('dis3', 3, 'Tiro Incapacitante', '2 Fôlego: o alvo atingido tem Deslocamento −3 até o fim do turno dele.'),
    N('dis4a', 4, 'Olho de Falcão', 'Alcance dobrado; ignora cobertura parcial. +1d6 de dano. Só Vellunari.', { dano: { distancia: '1d6' }, soVellunari: true }),
    N('dis4b', 4, 'Tiro na Brecha', 'Disparos ignoram 2 de Proteção. Só Vellunari.', { soVellunari: true }),
    N('dis5', 5, 'Chuva de Flechas', '1×/cena: área 3×3 até 12 casas; cada alvo sofre o dano da arma. Só Vellunari.', { soVellunari: true }),
  ] },
  baluarte: { nome: 'Baluarte', tipo: 'arma', cor: '#8aa0c8', desc: 'Escudos e armaduras. Proteger quem está ao lado.', nos: [
    N('bal1a', 1, 'Escudeiro', '+1 Defesa usando escudo.', { defesaEscudo: 1 }),
    N('bal1b', 1, 'Couraça Treinada', 'Cota de malha limita a AGI em 4 (em vez de 3).', { agiMax: 1 }),
    N('bal2a', 2, 'Empurrão de Escudo', 'Ação: empurre 1 casa; se vencer Atletismo, o alvo cai.'),
    N('bal2b', 2, 'Sentinela Atenta', '+1 Iniciativa e um ataque de oportunidade extra por rodada.', { ini: 1 }),
    N('bal3', 3, 'Muralha Viva', 'Reação: reduza em 1d6+RES o dano sofrido por um aliado adjacente.'),
    N('bal4a', 4, 'Inabalável', '+1 Proteção. Só Vellunari.', { protecao: 1, soVellunari: true }),
    N('bal4b', 4, 'Escudo de Todos', 'Aliados adjacentes ganham +1 Defesa. Só Vellunari.', { soVellunari: true }),
    N('bal5', 5, 'Última Linha', '1×/cena: ao cair a 0 de Vigor, fique de pé com 1. Só Vellunari.', { soVellunari: true }),
  ] },
  sangue: { nome: 'Sangue Comum', tipo: 'vellunari', cor: '#e2b04a', desc: 'Só Vellunari. A teimosia de quem não nasceu com Dom.', nos: [
    N('san1a', 1, 'Fôlego de Trabalhador', '+3 Fôlego.', { folego: 3 }),
    N('san1b', 1, 'Calejado', '+3 Vigor.', { vigor: 3 }),
    N('san2a', 2, 'Olho para Dons', '+2 Defesa contra técnicas de Dom.'),
    N('san2b', 2, 'Improviso', 'Armas improvisadas sem penalidade; +1 em Ofício.'),
    N('san3', 3, 'Caçador de Aurethians', '+1d6 de dano contra quem usou Dom nesta rodada.'),
    N('san4', 4, 'Teimosia de Pedra', '+2 Determinação; ignore uma condição por cena.', { determinacao: 2 }),
    N('san5', 5, 'Herói do Povo', '1×/sessão: troque uma falha por um sucesso com Triunfo.'),
  ] },
  potencia: { nome: 'Potência do Dom', tipo: 'dom', cor: '#ff8a4a', desc: 'Só Aurethian. Mais dano, alcance e área nas técnicas.', nos: [
    N('pot1a', 1, 'Canal Amplo', '+2 de dano nas técnicas de ataque.', { danoDom: 2 }),
    N('pot1b', 1, 'Alcance Estendido', '+3 casas de alcance nas técnicas.'),
    N('pot2a', 2, 'Explosão Controlada', 'Áreas ganham +1 casa de raio e você escolhe quem poupar.'),
    N('pot2b', 2, 'Foco do Cristal', '+1 nos testes de Dom.', { testeDom: 1 }),
    N('pot3', 3, 'Sobrecarga', '+2 Fôlego: a técnica causa o dano do nível seguinte.'),
    N('pot4', 4, 'Ressonância Maior', '+1d6 de dano em toda técnica de ataque.', { danoDomDado: '1d6' }),
    N('pot5', 5, 'Catástrofe', '1×/cena: técnica do seu maior nível sem custo de Fôlego, mas +2 Tensão.'),
  ] },
  controle: { nome: 'Controle do Dom', tipo: 'dom', cor: '#6aa8ff', desc: 'Só Aurethian. Fôlego, Tensão e precisão.', nos: [
    N('con1a', 1, 'Respiração Disciplinada', '+2 Fôlego.', { folego: 2 }),
    N('con1b', 1, 'Mente Fria', '+1 Limiar de Colapso.', { limiar: 1 }),
    N('con2a', 2, 'Economia', 'A primeira técnica de cada cena custa 1 Fôlego a menos.'),
    N('con2b', 2, 'Sentir o Fluxo', 'Sente Dons em uso a até 6 casas.'),
    N('con3', 3, 'Zona Segura', 'Técnicas de Nível 1 não geram Tensão por falta de Fôlego.'),
    N('con4', 4, 'Fluxo Contínuo', '1×/cena, ação: recupere 1d6 de Fôlego.'),
    N('con5', 5, 'Comunhão', '1×/sessão: ignore os efeitos da Zona 3 por uma rodada.'),
  ] },
  imbuida: { nome: 'Arma Imbuída', tipo: 'hibrida', cor: '#c86aff', desc: 'Só Aurethian. O Dom corre pela arma: espada em chamas, flecha elétrica, martelo de gelo.', nos: [
    N('imb1', 1, 'Imbuir Arma', 'Ação menor, 1 Fôlego: até o fim da cena sua arma ganha o elemento do Dom (+1d4 de dano daquele tipo). Funciona com flechas e virotes.', { imbuir: '1d4' }),
    N('imb2a', 2, 'Lâmina Canalizada', 'Ao acertar com a arma imbuída, gaste 2 Fôlego para aplicar uma técnica de Nível 1 no alvo sem gastar ação. Exige 1 ponto numa árvore de arma.', { exigeArma: true }),
    N('imb2b', 2, 'Projétil Elemental', 'Disparos imbuídos explodem: 2 de dano do elemento em quem estiver adjacente ao alvo. Exige 1 ponto numa árvore de arma.', { exigeArma: true }),
    N('imb3', 3, 'Golpe de Cristal', 'O bônus da arma imbuída vira +1d6. Exige 1 ponto numa árvore do Dom.', { imbuir: '1d6', exigeDom: true }),
    N('imb4', 4, 'Arma Viva', 'Imbuir passa a ser gratuito; um Triunfo no ataque aplica a condição do Dom (queimando, congelado, atordoado…).', { imbuir: '1d6', exigeDom: true }),
    N('imb5', 5, 'Avatar Elemental', '1×/cena, por 3 rodadas: cada acerto com a arma aplica de graça uma técnica de Nível 2.', { exigeDom: true }),
  ] },
};
export const TALENTO = Object.fromEntries(Object.entries(ARVORES).flatMap(([a, arv]) => arv.nos.map(n => [n.id, { ...n, arvore: a }])));
export function pontosTalento(f) {
  const n = num(f.nivel, 1);
  const total = ehAurethian(f) ? 1 + n : 2 + n + Math.floor(n / 2);
  return { total, gastos: (f.talentos || []).length };
}
export function arvoresPermitidas(f) {
  const aur = ehAurethian(f);
  return Object.entries(ARVORES).filter(([, a]) => a.tipo === 'arma' || (aur ? a.tipo === 'dom' || a.tipo === 'hibrida' : a.tipo === 'vellunari')).map(([k]) => k);
}
export function pontosNaArvore(f, arvore) { return (f.talentos || []).filter(id => TALENTO[id]?.arvore === arvore).length; }
// por que um nó não pode ser pego agora (ou null)
export function bloqueioTalento(f, id) {
  const t = TALENTO[id]; if (!t) return 'Talento desconhecido.';
  const aur = ehAurethian(f), arv = ARVORES[t.arvore];
  if (!arvoresPermitidas(f).includes(t.arvore)) return arv.tipo === 'vellunari' ? 'Só Vellunari.' : 'Só Aurethian.';
  if (t.ef?.soVellunari && aur) return 'Mestria: só Vellunari.';
  if (aur && arv.tipo === 'arma' && t.grau > 3) return 'Aurethians vão até o Grau 3 nas armas.';
  const outros = (f.talentos || []).filter(x => x !== id);
  const naArvore = outros.filter(x => TALENTO[x]?.arvore === t.arvore).length;
  if (naArvore < t.grau - 1) return `Precisa de ${t.grau - 1} ponto(s) em ${arv.nome}.`;
  if (t.grau >= 4 && num(f.nivel, 1) < (t.grau === 4 ? 3 : 5)) return `Exige nível ${t.grau === 4 ? 3 : 5}.`;
  if (t.ef?.exigeArma && !outros.some(x => ARVORES[TALENTO[x]?.arvore]?.tipo === 'arma')) return 'Exige 1 ponto numa árvore de arma.';
  if (t.ef?.exigeDom && !outros.some(x => ARVORES[TALENTO[x]?.arvore]?.tipo === 'dom')) return 'Exige 1 ponto numa árvore do Dom.';
  return null;
}
function efeitos(f) {
  const e = {};
  for (const id of f.talentos || []) {
    const ef = TALENTO[id]?.ef; if (!ef) continue;
    for (const [k, v] of Object.entries(ef)) {
      if (typeof v === 'number') e[k] = (e[k] || 0) + v;
      else if (typeof v === 'object') { e[k] ||= {}; for (const [kk, vv] of Object.entries(v)) e[k][kk] = typeof vv === 'number' ? (e[k][kk] || 0) + vv : [e[k][kk], vv].filter(Boolean).join('+'); }
      else if (typeof v === 'string') e[k] = v; // o maior dado de imbuir vem por último
    }
  }
  return e;
}
export function temImbuir(f) { return ehAurethian(f) && (f.talentos || []).includes('imb1'); }
// Ataque com a arma equipada: bônus no teste e dano (já com talentos e imbuir)
export function ataqueArma(f, imbuida = false) {
  const a = atributosFinais(f), id = armaDe(f), arma = ARMAS[id], e = efeitos(f);
  const per = PERICIA_ARMA[arma.tipo];
  const at = PERICIA[per]?.attr || 'FOR';
  const mod = a[at] + gradPericia(f, per) + bonusPericia(f, per) + num(e.ataque?.[arma.tipo]);
  const atrDano = arma.tipo === 'distancia' ? 0 : arma.tipo === 'lamina' ? Math.max(a.FOR, a.AGI) : a.FOR;
  const fixo = atrDano + num(e.danoFixo?.[arma.tipo]);
  let dano = arma.dano + (e.dano?.[arma.tipo] ? '+' + e.dano[arma.tipo] : '') + (fixo ? (fixo > 0 ? '+' : '') + fixo : '');
  if (imbuida && temImbuir(f)) dano += '+' + (e.imbuir || '1d4');
  return { id, nome: arma.nome, tipo: arma.tipo, pericia: per, mod, dano };
}
export function danoTecnica(f, nivel) {
  const e = efeitos(f);
  return DANO_DOM[nivel - 1] + (e.danoDom ? '+' + e.danoDom : '') + (e.danoDomDado ? '+' + e.danoDomDado : '');
}
export function bonusTesteDom(f) { return num(efeitos(f).testeDom); }

export function fichaVazia() {
  return {
    raca: 'sarthani', sub: 'nortista', livre: 'FOR', origem: 'kaerith', estrato: 'operario',
    atributos: { FOR: 1, AGI: 1, RES: 1, INT: 1, PER: 1, VON: 1, PRE: 1 },
    vocacao: 'lamina', dom: 'kalthor', dom2: 'zephyr', ressonancia: 'cromatico', facanhas: [], talentos: [],
    pericias: {}, nome: '', conceito: '', fardo: '', juramento: '', nivel: 1,
    aparencia: aparenciaPadrao('sarthani', 'lamina'),
  };
}
export const PELE_PADRAO = { sarthani: 1, zarathim: 0, veloryn: 0, draveth: 0, sypheris: 0, dvarith: 0 };
export function aparenciaPadrao(raca, vocacao, sexo = 'm') {
  const r = RACAS[raca] || RACAS.sarthani;
  const f = sexo === 'f';
  const roupas = { lamina: ['#6b2a22', '#4a3020'], sentinela: ['#34465e', '#5a3b22'], batedor: ['#3d5a2a', '#5b3a22'], sombra: ['#2a2a32', '#3a2a20'], alquimista: ['#5a4a2a', '#4a3020'],
    erudito: ['#3a3460', '#4a3020'], orador: ['#6a1f3a', '#3a2418'], curandeiro: ['#e6dcc4', '#6a4a2a'], canalizador: ['#2a4a5a', '#4a3020'] }[vocacao] || ['#5a4030', '#4a3020'];
  return {
    sexo: f ? 'f' : 'm', altura: 1, porte: 1,
    pele: r.pele[PELE_PADRAO[raca] ?? 1] || r.pele[0],
    cabelo: raca === 'zarathim' ? 'careca' : raca === 'draveth' ? (f ? 'Hair_Long' : 'careca') : raca === 'dvarith' ? 'Hair_Buzzed' : f ? 'Hair_Long' : 'Hair_SimpleParted',
    corCabelo: raca === 'veloryn' ? '#dfe8f0' : raca === 'dvarith' ? '#8a4a22' : raca === 'sypheris' ? '#e8e8f0' : '#2b1d14',
    barba: raca === 'dvarith' && !f,
    olhos: { sarthani: '#4a3020', veloryn: '#bff6ff', sypheris: '#ffffff', draveth: '#ffd54a', zarathim: '#ffae3a', dvarith: '#ff6a2a' }[raca] || '#4a3020',
    tatuagem: raca === 'sarthani', corTatuagem: raca === 'sypheris' ? '#5fd3ff' : '#2a3a5a',
    brilho: raca === 'sypheris' ? '#5fd3ff' : raca === 'veloryn' ? '#bff6ff' : '#ffb347',
    torso: ['sentinela', 'orador', 'curandeiro', 'erudito'].includes(vocacao) ? 'campones' : 'patrulheiro',
    pernas: ['orador', 'curandeiro', 'erudito'].includes(vocacao) ? 'campones' : 'patrulheiro',
    botas: 'patrulheiro', capuz: vocacao === 'sombra' || vocacao === 'batedor', ombreira: vocacao === 'sentinela' || vocacao === 'lamina', bracadeira: vocacao !== 'orador', cinto: true,
    corRoupa: roupas[0], corCouro: roupas[1],
    arma: ARMA_POR_VOCACAO[vocacao] || 'espada', secundaria: SECUNDARIA_POR_VOCACAO[vocacao] || 'nenhuma',
    base: '#e2b04a',
  };
}

// --------- cálculo central (equilíbrio do livro de regras) ---------
export function pontosAtributo(f) {
  const est = ESTRATOS[f.estrato] || ESTRATOS.operario;
  const zeros = Object.values(f.atributos).filter(v => v === 0).length;
  const gastos = Object.values(f.atributos).reduce((s, v) => s + (v - 1), 0);
  return { total: 9 + est.pontos + (zeros ? 1 : 0), gastos, zeros };
}
export function atributosFinais(f) {
  const r = RACAS[f.raca], s = r?.subs?.[f.sub] || {};
  const a = { ...f.atributos };
  for (const [k, v] of Object.entries(r?.mods || {})) a[k] += v;
  for (const [k, v] of Object.entries(s.mods || {})) a[k] += v;
  if (r?.livre && f.livre && a[f.livre] !== undefined) a[f.livre] += r.livre;
  return a;
}
export function pontosPericia(f) {
  const est = ESTRATOS[f.estrato] || {};
  const total = 10 + (est.pericias || 0) + (RACAS[f.raca]?.periciaExtra || 0);
  const gastos = Object.values(f.pericias || {}).reduce((s, v) => s + v, 0);
  return { total, gastos };
}
export function gradPericia(f, id) {
  const voc = VOCACOES[f.vocacao];
  let g = num(f.pericias?.[id]);
  if ((ORIGENS[f.origem]?.pericias || []).includes(id)) g += 1;
  if (voc && voc.pericias.slice(0, 2).includes(id)) g += 1;
  return Math.min(3, g);
}
export function bonusPericia(f, id) {
  const r = RACAS[f.raca], s = r?.subs?.[f.sub] || {};
  return num(r?.bonus?.[id]) + num(s.bonus?.[id]);
}
export function ehAurethian(f) { return (ESTRATOS[f.estrato]?.dom || 0) > 0; }
export function nivelDom(f) { return ESTRATOS[f.estrato]?.dom || 0; }

export function derivados(f) {
  const a = atributosFinais(f);
  const r = RACAS[f.raca] || {}, s = r.subs?.[f.sub] || {}, v = VOCACOES[f.vocacao] || {};
  const est = ESTRATOS[f.estrato] || {}, res = ehAurethian(f) ? RESSONANCIAS[f.ressonancia] : null;
  const fac = f.estrato === 'vellunari' ? (f.facanhas || []) : [];
  const nivel = num(f.nivel, 1);
  const arm = ARMADURAS[v.armadura] || ARMADURAS.nenhuma;
  const e = efeitos(f), arma = ARMAS[armaDe(f)];
  const extra = k => num(r.extra?.[k]) + num(s.extra?.[k]) + num(v.extra?.[k]) + num(res?.extra?.[k]) + num(e[k]);
  const vigorMax = 12 + a.RES * 3 + num(v.vigor) + extra('vigor') + extra('vigorNivel') * nivel + (fac.includes('lavrador') ? 3 : 0) + 4 * (nivel - 1);
  const folegoMax = 6 + (a.RES + a.VON) * 2 + num(est.folego) + extra('folego') + (nivel - 1);
  const limiar = Math.max(3, a.RES + a.VON) + extra('limiar');
  const limiarFer = a.RES + 8 + extra('limiarFer') + (fac.includes('lavrador') ? 1 : 0);
  const metade = Math.floor(nivel / 2);
  const escudo = temEscudo(f) ? 2 + num(e.defesaEscudo) : 0;
  const defesa = 10 + Math.min(a.AGI, arm.agiMax + num(e.agiMax)) + metade + escudo + num(e.defesaArma?.[arma?.tipo]);
  return {
    atributos: a, vigorMax, folegoMax, limiar, limiarFer, defesa,
    robustez: 10 + a.RES + metade, determinacao: 10 + a.VON + metade + num(e.determinacao),
    ini: a.AGI + a.PER + num(e.ini), desloc: s.desloc || r.desloc || 6,
    protecao: arm.p + extra('protecao'), armadura: arm.nome,
  };
}

export function validar(f) {
  const erros = [];
  const pa = pontosAtributo(f);
  if (pa.gastos !== pa.total) erros.push(`Distribua exatamente ${pa.total} pontos de atributo (faltam ${pa.total - pa.gastos}).`);
  if (pa.zeros > 1) erros.push('Só um atributo pode ser reduzido a 0.');
  if (Object.values(f.atributos).some(v => v > 4 || v < 0)) erros.push('Atributos vão de 0 a 4 antes da raça.');
  const pp = pontosPericia(f);
  if (pp.gastos > pp.total) erros.push(`Você gastou ${pp.gastos} de ${pp.total} pontos de perícia.`);
  if (VOCACOES[f.vocacao]?.soAurethian && !ehAurethian(f)) erros.push('Canalizador exige ser Aurethian.');
  if (ehAurethian(f) && !TODOS_DONS[f.dom]) erros.push('Escolha um Dom.');
  if (DONS_ELITE[f.dom] && f.estrato !== 'elite') erros.push('Dons de Elite exigem o estrato Elite.');
  if (f.estrato === 'dualista' && (f.dom === f.dom2 || !DONS[f.dom2] || DONS_ELITE[f.dom])) erros.push('O Dualista precisa de dois Dons comuns diferentes.');
  if (f.estrato === 'vellunari' && (f.facanhas || []).length !== 2) erros.push('Escolha 2 Façanhas do Sangue Comum.');
  const pt = pontosTalento(f);
  if (pt.gastos > pt.total) erros.push(`Você gastou ${pt.gastos} de ${pt.total} Pontos de Talento.`);
  for (const id of f.talentos || []) { const b = bloqueioTalento(f, id); if (b) { erros.push(`Talento “${TALENTO[id]?.nome || id}”: ${b}`); break; } }
  if (!String(f.nome || '').trim()) erros.push('Dê um nome ao personagem.');
  return erros;
}
function num(v, d = 0) { const n = Number(v); return Number.isFinite(n) ? n : d; }
