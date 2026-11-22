# Prompts de design (skills color-expert, information-architecture-and-navigation, game-ui-ux)

Skills instaladas em `~/.claude/skills/` (reabra o Claude Code para carregarem).
Uma tarefa por sessão: cole um prompt, teste no Godot (F5), commit + push, `/clear`.
Ordem sugerida: 1 → 2 → 3 (cores primeiro, porque os outros reaproveitam os tokens) → 4 → 5 → 6 → 7.

---

## 1. Paleta da interface em tokens (color-expert)
```
Use a skill color-expert. No arkahad-godot, leia interface/tema.gd (visual "Obsidiana e âmbar").
Reorganize as cores em duas camadas: cores de referência (paleta, em OKLCH convertido para Color)
e cores com papel (fundo, painel, texto, texto_fraco, destaque, perigo, sucesso, aviso, borda).
Troque cores soltas em interface/*.gd por esses nomes. Todo par texto/fundo precisa de contraste
WCAG ≥ 4.5 (≥ 3 para texto grande); liste os pares que você conferiu.
Não mude o estilo geral, só deixe consistente. Commit e push no arkahad-godot.
```

## 2. Cores dos Doms e das condições (color-expert)
```
Use a skill color-expert. Levante as cores usadas para cada Dom (efeitos, ícones, Dom na arma) e
para as condições (CONDICOES em public/regras.js) no arkahad-godot.
Proponha uma tabela única: cada Dom e cada condição com cor distinguível entre si, inclusive para
daltonismo (deuteranopia e protanopia), legível sobre o fundo escuro do tema.
Mostre a tabela antes de aplicar; depois aplique nos tokens do tema.gd e nos lugares que usam.
```

## 3. Pintura das paredes (color-expert)
```
Use a skill color-expert. A camada tin (TINTAS em public/regras.js) ainda não é desenhada no Godot.
1) Revise as cores das TINTAS para que fiquem naturais em tijolo, reboco, tábuas e muralha sob a luz
   do dia e da lua (tons de pigmento, não cores saturadas de tela).
2) Desenhe a tinta em arkahad-godot/cena/paredes.gd multiplicando a cor do material.
Se mudar regras.js, atualize o espelho no Godot. Commit + push nos dois repositórios.
```

## 4. Painel do Mestre (information-architecture-and-navigation + game-ui-ux)
```
Use as skills information-architecture-and-navigation e game-ui-ux.
Analise a aba Mestre e o Editor em arkahad-godot/interface/tela_mesa.gd e interface/editor.gd.
Primeiro me mostre (sem código) a árvore atual de blocos/botões e uma árvore proposta, organizada
pelas tarefas do Mestre durante a Sessão (preparar mapa, conduzir combate, responder pedidos,
dar XP, controlar NPCs), com no máximo 3 níveis e o item mais usado sempre visível.
Depois que eu aprovar, reorganize só a ordem/agrupamento (sem mudar regras nem mensagens).
```

## 5. Ficha do jogador (information-architecture-and-navigation)
```
Use a skill information-architecture-and-navigation. Na aba Ficha (tela_mesa.gd), liste os blocos
na ordem atual e proponha a ordem pelo que o jogador consulta no turno (Vigor/Fôlego/Tensão,
ataques e Dom primeiro; história e inventário depois). Blocos raros começam recolhidos.
Rótulos curtos e iguais em todo lugar (mesmo nome na ficha, no HUD e no registro).
Mostre a proposta, espere meu ok, depois aplique.
```

## 6. Barra de ações e HUD (game-ui-ux + information-architecture-and-navigation)
```
Use as skills game-ui-ux e information-architecture-and-navigation.
Revise a barra de ações e o HUD em arkahad-godot/interface/tela_mesa.gd: agrupamento
(mover / atacar / Dom / defesa / fim do turno), atalhos 1–0, estado ativo visível
("onde estou": botão ligado, mira aberta), botões indisponíveis explicando o porquê no tooltip,
âncoras que não quebram em 1366x768 nem em ultrawide. Proponha, espere meu ok, aplique.
```

## 7. Rótulos e vocabulário (information-architecture-and-navigation)
```
Use a skill information-architecture-and-navigation (seção Labeling).
Faça um levantamento de todos os textos visíveis em arkahad-godot/interface/*.gd e aponte:
o mesmo conceito com nomes diferentes, termos fora do vocabulário do mundo (deve ser Sessão,
não sala/mesa; Kael, Lyra, Tirith, Fôlego, Tensão, Dom), rótulos vagos ("Outros", "Mais").
Entregue a lista de trocas; aplique só depois do meu ok.
```
