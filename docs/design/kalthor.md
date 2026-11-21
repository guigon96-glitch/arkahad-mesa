# Kalthor — design aprovado (a implementar)

Estado: parte 1 da árvore do Dom e a Arma de Brasa implementadas; ramos Inferno e Cinza pendentes (parte 2).
Hoje no código: `HAB_DOM.kalthor` em `public/conteudo.js` (4 nós antigos) e a árvore genérica `imbuida`.

## Mecânica central: Brasas (0–5)
- +1 Brasa ao acertar com fogo; +1 quando um inimigo Queimando cai. Apagam fora de combate.
- Habilidades gastam Brasas para turbinar.
- 5 Brasas = **Superaquecido**: +1d6 em todo dano de fogo, mas sofre 1d4 no fim de cada turno (sintoma: queimaduras).
- Contador visível na barra de combate.

## Raiz (G1) — ganha as duas
- **Brasa Viva** (passiva):
  1. Todo acerto do Kalthor (arma ou Dom) aplica Queimando 1. Se já queima, só renova a duração (não acumula dano). Kalthor nunca atordoa.
  2. **Ferida de Brasa**: alvo Queimando recebe metade de toda cura (em `curar()`, `worker.js`).
  3. **Pavor das Chamas**: ao acertar, alvo testa d20 + Robustez contra DIF 10 + nível do Kalthor. Falha: Amedrontado 1 e foge 1 + ⌊nível/2⌋ casas (reusa `empurra`); 20 natural do atacante = foge o dobro. Imune ao Pavor até o fim da próxima rodada. Criaturas sem mente/de fogo imunes.
- **Dardo Ígneo**: 8 q, 1d6. Se o alvo já queimava, ricocheteia em outro inimigo em chamas a até 4 q.

## Ramo Inferno (artilharia)
- G2 **Sol Cadente**: marca raio 1 a 12 q; cai no começo do próximo turno do Kalthor. 3d6 + 1d6 por Brasa gasta. Círculo visível no chão.
- G2 **Combustão**: detona o Queimando do alvo, +1d6 por turno restante. Se matar, explode e espalha fogo aos vizinhos (`cadeia`).
- G3 **Chuva de Meteoros** (+1 Tensão): 3 impactos (raio 1, 3d6). Chão vira fogueira por 2 turnos; madeira/paliçada desabam; gelo vira água.

## Ramo Cinza (terror e emboscada)
- G2 **Mortalha de Fumaça**: nuvem que cega; o Kalthor enxerga dentro e tem +2 contra quem está nela.
- G2 **Passo de Cinza**: teleporta para qualquer fogueira ou fumaça a até 12 q; o ponto de saída explode (1d6 em volta).
- G3 **Face do Incêndio** (+1 Tensão): todos a até 3 q testam o Pavor com Desvantagem (+1 DIF por Brasa gasta). Quem falha foge em chamas.

## Ramo Forja (corpo em brasa)
- G2 **Couraça de Magma**: quem acerta o Kalthor corpo a corpo sofre 1d6 e fica Queimando. 2 Brasas: Protegido 2.
- G2 **Coração de Fornalha**: em si, gera 2 Brasas e cura 1d6 (a cura dele não é cortada pela própria Ferida de Brasa).
- G3 **Renascer da Fênix** (+1 Tensão): 3 turnos em forma de fogo, Acelerado e imune a Queimando. Se cair a 0 nesse tempo: explode (4d6, raio 2) e volta com 10 de Vigor (`eterno`).

(A Lâmina Flamejante saiu da Forja e foi para a Arma Imbuída.)

## Interações com o mapa e outros Dons
- Fogueiras ficam no chão; madeira cai; gelo do Cryon derrete.
- Vento do Zephyr espalha as fogueiras do Kalthor 1 casa na direção do sopro (pode pegar aliados).

## Implementação em duas partes
1. Brasas + Superaquecido, Brasa Viva, ramo Forja.
2. Ramos Inferno e Cinza (Sol Cadente atrasado, explosão em cadeia, Passo de Cinza, fogo que espalha, Pavor em área).

---

# Arma Imbuída do Kalthor — "Arma de Brasa" (IMPLEMENTADA)

No jogo: Martelo de Forja e Flecha Incendiária acendem a fogueira na casa livre ao lado do alvo (a fogueira bloqueia a casa); "cai" = Marcado 1. Lâmina Flamejante e Saraivada só gastam Brasas com o botão Queimar Brasas ligado. Aparar em Chamas é automático (só PC com a arma em brasa). Sol Negro é 1× por combate.

Árvore própria `imbuida_kalthor`, no lugar da genérica `imbuida` quando o Dom é Kalthor. Nós G2+ exigem 1 ponto numa árvore de arma (`exigeArma`), como hoje. O foco é a arma; a árvore do Dom é o corpo e a magia.

- G1 **Arma em Brasa**: ação menor, 1 Fôlego: a arma pega fogo até o fim da cena, +1d4 de fogo. Acertos com ela geram Brasas e ativam a Brasa Viva.
- G2 (corpo a corpo) **Lâmina Flamejante**: gaste 1 Brasa: o golpe corta em arco e acerta todos os inimigos adjacentes à frente.
- G2 (corpo a corpo) **Martelo de Forja**: Triunfo no ataque derruba o alvo e acende uma fogueira embaixo dele.
- G2 (distância) **Flecha Incendiária**: o disparo acende uma fogueira na casa do alvo (fonte de chama para o Dom e destino do Passo de Cinza).
- G2 (distância) **Saraivada de Brasas**: gaste N Brasas: N disparos extras em alvos diferentes, cada um com o dano da arma.
- G3 (exige Dom) **Têmpera Viva**: o bônus vira 1d6. Superaquecido: a arma incandescente ignora a Proteção de armaduras de metal.
- G3 (exige Dom) **Aparar em Chamas** (reação, 1 Brasa): quem ataca o Kalthor corpo a corpo fica Queimando e tem −2 nesse ataque.
- G4 **Golpe do Sol Negro** (1× por cena): gasta todas as Brasas. 1d6 por Brasa numa linha de 6 q que atravessa os inimigos (`atravessa`) e deixa um rastro de fogueiras. Com arco: a flecha vira um cometa no mesmo trajeto.
