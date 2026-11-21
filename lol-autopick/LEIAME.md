# Auto aceitar / pick / ban (LoL)

Roda no seu PC, junto com o cliente do LoL. Precisa só do Node 18+ (sem `npm install`).

1. Edite `config.json`: `pastaLol` (onde está o `lockfile` do cliente), `picks` e `bans` em ordem de prioridade (nome em inglês ou português do cliente, ex.: "Wukong", "Master Yi").
2. `node autopick.js` e deixe a janela aberta.

O que faz:
- Aceita a partida (`"aceitar": false` desliga).
- Na sua vez de banir: bane o primeiro da lista que não foi banido, não foi escolhido e que nenhum aliado marcou ou declarou.
- Na sua vez de escolher: trava o primeiro da lista que você tem e que está livre.

Teste da lógica: `node autopick.js --teste`.
