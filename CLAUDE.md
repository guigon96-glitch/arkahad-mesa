# Mesa de Arkahad — guia para o Claude Code

Mesa virtual 3D para o RPG de Arkahad (sistema próprio: testes em 2d10 Kael/Lyra; ataques em d20 separados — Kael acerto, Lyra dano, Aranor punição do Dom). Até 6 jogadores + Mestre, login Google, sessões com senha, vários mapas por sessão ligados por portais. Tudo em português (interface, código, nomes de variáveis).

## Cliente principal: Godot (leia antes de qualquer tarefa)
- **Toda novidade de jogo (interface, cena 3D, combate, mover, efeitos, ficha, painel do Mestre) é feita no cliente Godot 4.7, que é OUTRA pasta: `C:/Users/guigo/Documents/arkahad-godot` (sem git; o `LEIAME.md` de lá tem o mapa dos arquivos).** A pasta `godot/` deste repositório é só o piloto antigo: não mexa nela. O site em `public/` (app.js, cena3d.js, criacao.js…) virou legado: só mexa nele se o dono pedir pelo nome “site”/“navegador”.
- O servidor continua sendo `src/worker.js` (autoridade de tudo: movimento, ações, rolagens) e as regras compartilhadas continuam em `public/regras.js` + `public/conteudo.js`. Regra nova vai no servidor primeiro; o Godot só mostra prévia e envia mensagens WebSocket.
- O Godot não importa os módulos JS: o que ele precisa das regras é copiado em GDScript (`nucleo/regras.gd` = regras de mapa, `nucleo/ficha.gd` = contas da ficha, `nucleo/jogo.gd` = turno/ações/alcance, espelho do `app.js`; `dados/conteudo.json` vem de `node ferramentas/preparar.mjs ../arkahad-mesa`). Ao mudar regra no servidor ou em `regras.js`/`conteudo.js`, atualize o espelho no Godot na mesma tarefa.
- Antes de editar o `arkahad-godot`, copie os arquivos que vai mudar para o scratchpad (não há git lá para desfazer).

## Economia de tokens (siga sempre)
- Leia só o que a tarefa precisa. Use `grep -n` para achar a função e leia com offset/limit; nunca leia `app.js`, `cena3d.js` ou `worker.js` inteiros.
- Não abra: `public/vendor/`, `node_modules/`, `package-lock.json`, `*.glb`, `*.hdr`, `public/texturas/`, `public/ceus/`, imagens. (Bloqueados em `.claude/settings.json`.)
- Regras do jogo: veja `docs/regras/INDICE.md` e abra só o capítulo necessário.
- Não tire screenshots nem rode playwright a menos que o dono peça; ele testa no Godot e descreve o problema.
- Respostas curtas: diga o que mudou e como testar. Não cole código grande na resposta.
- Uma tarefa por sessão. Ao terminar: commit + push, e sugira `/clear`.

## Rodar e publicar
- `npm install` uma vez; `npm run dev` (wrangler dev) → http://localhost:8787. Para testar multiplayer: uma aba como Mestre, outra como jogador (login por apelido funciona porque `PERMITIR_APELIDO = "1"`).
- Publicar = `git push` na `main`. A Cloudflare (Workers Builds) publica sozinha. Não rode `wrangler deploy` à mão sem o dono pedir.
- Sem etapa de build: o navegador carrega os módulos ES direto de `public/`. three.js r170 está copiado em `public/vendor/` (import map em `index.html`: `three` e `three/addons/`). Ao usar um addon novo do three, copie o arquivo da tag r170 para `public/vendor/addons/` e verifique os imports dele.

## Mapa dos arquivos
| Assunto | Arquivo |
|---|---|
| Servidor: login (JWT do Google), API, Durable Objects `Saguao` (lista de sessões) e `Sala` (estado da sessão + WebSocket) | `src/worker.js` |
| Regras de mapa: terrenos, custos, níveis de altura, Dijkstra, linha de visão, terreno alto, rolagens 2d10 | `public/regras.js` (usado pelo servidor e pelo cliente) |
| Conteúdo do sistema: raças, origens, estratos, vocações, Dons, armas, talentos, ficha e cálculos | `public/conteudo.js` |
| (legado, site) Interface do jogo: saguão, ficha, painel do Mestre, editor de terreno, mapas/portais, barra de combate, mira | `public/app.js` |
| Criador de personagem (passos, talentos, aparência com prévia 3D) | `public/criacao.js` |
| (legado, site) Cena 3D: câmera, céus HDRI, luzes, água, paredes, portais, miniaturas, dados físicos, pós-processamento | `public/cena3d.js` |
| Relevo contínuo do chão (heightfield + mistura de 8 texturas por shader) | `public/terreno.js` |
| Personagens modulares (corpo, roupas, cabelo, armas, Dom na arma), criaturas, natureza | `public/modelos.js` |
| Miniaturas simples de reserva e dados 3D | `public/miniatura.js` |
| Efeitos das habilidades do Dom (partículas, projéteis, feixes, explosões, colunas, ondas, auras, escudos) | `public/efeitos.js` |
| Estilos | `public/style.css` |
| **Cliente principal (Godot 4.7, Forward+)**: saguão, mesa 3D, barra de ações, mira, Mover, editor, criador, fichas. Mapa dos arquivos no `LEIAME.md` de lá (`interface/tela_mesa.gd`, `nucleo/jogo.gd`, `nucleo/regras.gd`, `cena/mesa3d.gd`…) | `C:/Users/guigo/Documents/arkahad-godot` |
| Piloto antigo do Godot (abandonado, não mexer) | `godot/` |
| Créditos e licenças (obrigatório atualizar ao adicionar asset de terceiros) | `public/creditos.html`, `public/modelos/LICENCA-*.txt`, `README.md` |

O livro de regras completo está em `docs/regras/` (um arquivo por capítulo, índice em `INDICE.md`; cópia do Claude Doc do dono). O que vale no jogo é o implementado em `conteudo.js` + `regras.js`.

Comandos do projeto: `/tarefa <pedido>`, `/regra <pergunta>`, `/modelo3d <arquivo>`, `/publicar`.

## Modelo de dados (Durable Object `Sala`)
- Armazenamento: `meta` (nome, códigos, senha PBKDF2, `mapaInicial`, `vendo` = mapa que o Mestre está vendo), `mapas` (id → mapa), `pcs` (id do usuário → personagem), `npcs`, `log`. Sessões antigas com a chave `mesa` são migradas para `mapas.m1` em `carregar()`.
- Mapa: `{ id, nome, cols, rows, grid: string[], alt: string[], par: string[], rot: string[], tin: string[], luz, lua, portais: { 'x,y': { para, x, y, nome, cor } }, combate }`.
  - `grid`: um caractere por casa (ver `TERRENOS` em `regras.js`: `"` mato, `.` terra, `,` areia, `_` ladrilho, `=` madeira, `v` vidro negro, `~` água, `T` árvore, `P` pinheiro, `Q` árvore seca, `k` arbusto, `#` muro, `m` paliçada, `h` muro baixo, `+` porta, `^` rocha, `*` fogueira, `b c s n a o w` objetos, `/` rampa e `|` escada, que ligam níveis: `custoSubida`).
  - `par` (paredes): `# m f h + d` e as de construção `g` tijolo, `i` reboco, `p` tábuas, `z` muralha, `!` janela, `%` grade (`PAREDES` em `regras.js`; espessura/altura em `arkahad-godot/cena/paredes.gd` (e `PAREDES` do `cena3d.js` no site).
  - `tin` (pintura das paredes): uma letra de `TINTAS` (`regras.js`) por casa, ' ' = cor natural; validada por `camadaTinta` no `worker.js`. Nenhum cliente desenha a tinta ainda (fazer no Godot).
  - Sala fechada pelas quatro paredes (porta fechada conta): `semParedeEntre` em `regras.js`; o `mover` recusa para todos, inclusive o Mestre.
  - `alt`: `'0'..'4'` = nível −1..+3 (`nivelEm`). `NIVEL_H` em `terreno.js` dá a altura visual.
- PCs e NPCs têm `mapa`; o servidor resolve com `idMapa()`. Cada jogador recebe só o mapa onde está o personagem dele (`estadoPara`); o Mestre recebe o mapa `meta.vendo` e todos os NPCs.
- O cliente nunca é a autoridade: movimento (Dijkstra com custo de subida), turno, 3 ações por turno, rolagens e ataques (`case 'ataque'`: `rolarAtaque` em `regras.js`, Kael + mod contra Defesa + cobertura + guarda, dano = Lyra + dano da arma − Proteção) acontecem no servidor. O cliente só calcula prévias (alcance, linha de visão, bônus de altura) e envia o modificador.
- Toda entrada do cliente passa por `limparPc` / `limparNpc` / `mapaValidado`. Ao criar campo novo, adicione-o às listas `CAMPOS_PC` / `CAMPOS_NPC` e valide.
- Mensagens WebSocket principais: `mesa` (editar o mapa atual), `mapa` (criar/ir/importar/apagar/inicial/trazer), `portal`, `pc`, `npc`, `apagarNpc`, `mover`, `combate`, `ataque`, `defender`, `rolar`, `pedir` (jogador pede teste), `decidir` (Mestre aprova com DIF oculta e XP), `xp`, `fichaMestre` (notas secretas e para o jogador), `ajuda` (dica + bônus no próximo teste, secreta ou não), `acoes`, `ping`, `aviso`. XP: `darXp`/`xpAbate` em `worker.js`, tabela em `regras.js`.
- Habilidades do Dom: 4 por Dom em `HAB_DOM` (`conteudo.js`), viram a árvore de talentos `hab_<dom>`. `ataque` com `hab` usa os dados da tabela (dano, cura, condições); o servidor manda `habilidade` (animação) e `condicao` (pulso no começo do turno). Condições ficam em `cond` de PCs/NPCs (só o servidor escreve), tabela `CONDICOES` em `regras.js`. Tipos: atq, apoio, si, mov (teleporte), campo (área sem rolar). Extras (empurra, troca, joga, cadeia, escudo, dreno, rouba, terreno, altura, derruba…) em `efeitosAtaque`/`habilidadeEspecial`/`moldar` no `worker.js`; `escudo` e `tp` (contador de teleporte, a cena não anima a caminhada) também só o servidor escreve. NPCs têm `dom` e `habs` (ids marcados pelo Mestre no editor, sem pontos); o teste de Dom do NPC usa `ataque`.

## Assets 3D
- Personagens: Quaternius (Universal Base Characters + Modular Outfits + Universal Animation Library), recoloridos por shader (pele, roupa por máscara em `modelos/q/mask_*.png`, olhos). Ossos de peças de roupa vêm com sufixos `_1`, `_2` do GLTFLoader: use `acharOsso()`/`canon()`.
- Criaturas: `public/modelos/q/criaturas/*.glb`, cadastradas em `CRIATURAS_3D` (`modelos.js`) com altura real em metros. Animações são achadas por regex de nome (Idle, Walk, Run, Attack, HitReact, Death…).
- Natureza: `public/modelos/natureza.glb` (Quaternius Ultimate Stylized Nature, convertido de FBX). Cenário/objetos: `public/modelos/cenario.glb` (KayKit).
- Escala: uma casa = 1 unidade ≈ 1,5 m; uma pessoa de 1,85 m vira ~1,02 unidade de altura.
- Otimizar todo .glb novo com `@gltf-transform` (prune com `keepAttributes: true` antes de atribuir texturas, dedup, weld, quantize, textureCompress jpeg/webp 512–1024). Meta: personagem < 1,5 MB, item < 300 KB.
- Toda obra de terceiros só entra com licença que permita uso (CC0 de preferência) e com crédito em `creditos.html`.

## Testar
- Depois de mudar JS: `node --check arquivo.js`.
- Godot: executável em `C:/Users/guigo/Documents/RPG/Godot_v4.7.2-stable_win64.exe`. Checar erros: `<godot> --headless --path C:/Users/guigo/Documents/arkahad-godot --quit-after 200` (o `--check-only` por arquivo não enxerga os autoloads `Jogo`, `Rede`, `Dados`). Teste de verdade automático: uma cena temporária `_teste.tscn` na raiz de lá que instancia `principal.tscn`, põe `Rede.token` (login por apelido em `/api/login`), chama `_entrar(codigo)` e salva `get_viewport().get_texture().get_image()`; apague depois.
- Teste do dono: `npm run dev` aqui e F5 no projeto `arkahad-godot` (servidor `http://127.0.0.1:8787`).
- Site (legado): `npm run dev` e abrir no navegador. Em `localhost`, `globalThis.__arkahad` expõe `enviar`, `selecionar`, `mesa`, `cena` (com `_cam`, `_ctl`, `_alt`, `_solo`) para testes automáticos.
- A cena tem qualidade adaptativa (desliga AO/bloom se < 24 fps). Verifique em PC fraco e no celular quando mexer em gráficos.

## Convenções
- Português em tudo que o usuário vê; termos do mundo: Kael, Lyra, Tirith, Conjunção, Fôlego, Tensão, Dom, Aurethian, Vellunari, Sessão (não “sala”/“mesa” na interface).
- Mudanças pequenas e focadas; não reescrever arquivos grandes inteiros (`app.js` e `cena3d.js` são longos — edite trechos).
- Commits em português, descrevendo o que muda para o jogador.
