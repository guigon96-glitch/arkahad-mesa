# Mesa de Arkahad

Mesa virtual para o RPG **Arkahad — Sangue e Cristal**: mapa em grade, tokens, dados que caem na mesa de todos, combate por turnos e salas protegidas por senha. Até 6 jogadores + 1 Mestre por sala.

Roda inteiro na Cloudflare: um **Worker** serve as páginas e a API, e cada sala é um **Durable Object** (estado salvo + WebSocket em tempo real). O plano gratuito da Cloudflare basta para um grupo de amigos.

## Recursos

- Mapa em 3D com terreno texturizado, árvores, rochas, muros, água e fogueiras.
- Luz de Kael e Lyra com sombras reais (sombras duplas na Conjunção) e luas coloridas.
- Miniaturas 3D por raça, com aparência personalizável.
- Criador de personagem em 8 passos (raça, origem, estrato, vocação, Dom, atributos, perícias, aparência), equilibrado pelo livro de regras.
- Dados 3D que rolam na mesa de todos.
- Controles: botão direito gira, roda dá zoom, botão do meio arrasta; no celular, dois dedos.

## Como funciona

1. Cada pessoa entra com **Google** (ou com um apelido, se o Google não estiver configurado).
2. No **Saguão** aparecem as salas abertas.
3. Quem cria uma sala vira o **Mestre** dela e define a senha.
4. Os jogadores clicam em *Entrar* e digitam a senha (só na primeira vez; depois entram direto).

## Publicar (GitHub → Cloudflare)

1. Suba este código para um repositório no GitHub.
2. No painel da Cloudflare: **Workers & Pages → Create → Import a repository** e escolha o repositório.
3. Deixe o comando de build vazio e o de deploy como `npx wrangler deploy` (o padrão). Confirme.
4. Pronto: o site fica em `https://arkahad-mesa.<sua-conta>.workers.dev`. Cada `git push` publica de novo.

> Não use "Pages" puro: salas em tempo real precisam de Durable Objects, que só existem em Workers. O "Import a repository" de Workers já cuida disso.

## Ativar o login com Google (opcional)

Sem isso, o site aceita apelidos.

1. Em <https://console.cloud.google.com/apis/credentials>: **Criar credenciais → ID do cliente OAuth → Aplicativo da Web**.
2. Em **Origens JavaScript autorizadas**, adicione o endereço do site (ex.: `https://arkahad-mesa.suaconta.workers.dev`) e, para testes, `http://localhost:8787`.
3. Copie o **ID do cliente** e cole em `wrangler.jsonc`, no campo `GOOGLE_CLIENT_ID`. Faça commit e push.
4. Para permitir apelido junto com o Google, mude `PERMITIR_APELIDO` para `"1"`.

## Rodar no seu computador

```bash
npm install
npm run dev
```

Abra <http://localhost:8787>.

## Onde mexer

| Quero mudar… | Arquivo |
| --- | --- |
| Terrenos, paredes, custos de movimento, **altura do terreno e terreno alto em combate**, regras dos dados | `public/regras.js` |
| Raças, vocações, Dons, armas, **árvores de talentos** e cálculo da ficha | `public/conteudo.js` |
| Personagens 3D (corpo, roupas, cabelos, armas, Dom na arma, criaturas) | `public/modelos.js` |
| Miniaturas simples (reserva) e dados 3D | `public/miniatura.js` |
| Cenário 3D, céus (HDRI), luzes, água, paredes e pós-processamento | `public/cena3d.js` |
| Relevo contínuo do chão e mistura de texturas | `public/terreno.js` (texturas em `public/texturas/`) |
| Criador de personagem | `public/criacao.js` |
| Editor de terreno (pincel, retângulo, linha, preencher, conta-gotas, desfazer), mapas da sessão, portais, baixar/carregar mapa | `public/app.js` (seções Editor, Portais, Baixar e carregar) e `src/worker.js` (`case 'mapa'`, `case 'portal'`) |
| Barra de combate, mira, alcance, linha de visão e iniciativa | `public/app.js` (seção Combate) e `public/regras.js` |
| Resolução de ataques no servidor (Defesa, cobertura, dano) | `src/worker.js` (`case 'ataque'`) |
| Visual do mapa, luzes, cores dos dados | `public/app.js` (topo do arquivo) |
| Cores e layout | `public/style.css` |
| Login, salas, senhas, permissões do Mestre | `src/worker.js` |
| Número máximo de jogadores | `MAX_JOGADORES` em `src/worker.js` |

## Segurança

- Senhas das salas são guardadas com PBKDF2 (nunca em texto puro); 5 tentativas erradas derrubam a conexão.
- Os dados são rolados no **servidor**: ninguém consegue "escolher" o resultado.
- NPCs ocultos e notas do Mestre **não são enviados** aos jogadores.
- O segredo das sessões é gerado automaticamente na primeira execução. Para definir o seu: `npx wrangler secret put SESSION_SECRET`.

## Créditos

Modelos 3D: personagens, roupas, cabelos, animações, armas e criaturas de **Quaternius** ([quaternius.com](https://quaternius.com)) — Universal Base Characters, Modular Character Outfits, Universal Animation Library, Modular Weapons, Ultimate Monsters, Ultimate Stylized Nature (árvores e rochas); armas, esqueletos e cenário do **KayKit** de Kay Lousberg ([kaylousberg.com](https://www.kaylousberg.com)). Tudo licença CC0 1.0. Bibliotecas: three.js (MIT). Fontes: Cinzel e Alegreya Sans (OFL). Lista completa em `public/creditos.html` (também no site, em /creditos.html), e os textos das licenças em `public/modelos/`.
