## Apêndice B — Requisitos para a Plataforma Digital

O sistema foi desenhado para rodar numa mesa virtual com **login Google**, **até 6 jogadores e 1 Mestre** por campanha. Este apêndice fixa o que as regras exigem do software; a construção fica para a próxima etapa.

### B.1 Papéis e permissões

| Ação | Jogador | Mestre |
| --- | --- | --- |
| Entrar com conta Google e ser convidado para a campanha | Sim | Cria a campanha e convida |
| Editar a própria ficha | Sim (Mestre aprova nível e XP) | Todas as fichas |
| Mover o próprio token no mapa | Sim, no seu turno durante combate; livre fora dele | Todos os tokens |
| Ver tokens de inimigos e NPCs | Só os revelados (névoa de guerra e visão/luz) | Tudo |
| Rolar dados | Rolagens próprias, visíveis a todos | Rolagens públicas ou ocultas |
| Ver Tensão de cristal Silente | Não | Sim (segredo) |
| Carregar mapas, definir luz, estação e lua | Não | Sim |
| Gerenciar iniciativa, condições, relógios e Reputação | Ver | Sim |

### B.2 Regras que o software deve automatizar

- **Rolador 2d10** com dado dourado (Kael) e azul (Lyra), Dado de Tirith para Vantagem/Desvantagem, detecção de Conjunção, Coroa de Kael, Olho de Aranor e graus de sucesso.
- **Eco do Fluxo** automático em testes de Dom (Lyra = 1 → +1 Tensão).
- **Contadores** de Fôlego e Tensão com a zona atual, conversão de déficit em Tensão, rolagem de Sintoma e alerta de Teste de Colapso.
- **Economia de ações** (3 ações + Reação) e penalidade de ataques múltiplos.
- **Grade de 1,5 m** com Deslocamento, diagonais 1–2, terreno difícil, áreas (3×3, cone, linha) e alcance.
- **Iniciativa** e fim de rodada com dano contínuo e custo de técnicas sustentadas.
- **Estado do céu** na cena (Dia de Kael, Noite Verdadeira, Noite Azul, Conjunção; lua dominante) aplicando os modificadores.

### B.3 Dados a guardar

Campanha, Usuário (conta Google), Personagem (ficha completa), Token (posição, tamanho, dono, visível), Mapa (imagem, grade, névoa, fontes de luz), Cena (estação, luz, lua), Combate (ordem, rodada, turno), Rolagem (histórico com dados de cada cor), Condição, Relógio, Reputação por facção e o catálogo de Dons, armas, armaduras, receitas e criaturas deste livro.
