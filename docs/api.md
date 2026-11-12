# API (contrato HTTP para o front)

O que o front consome. **Atualize este doc ao mudar a API.** Modelo dos dados em [`data_model.md`](./data_model.md);
o servidor é a autoridade do combate (D9): o cliente só envia a jogada e exibe o resultado.

## Convenções

- Base local: `http://localhost:3333` (`PORT` no `.env`). CORS só para as origens de `CORS_ORIGINS`.
- Corpo e resposta em JSON. Cada resposta embrulha o recurso numa chave (`{ account }`, `{ characters }`).
- Erros no formato do Nest: `{ statusCode, message }`. Validação de formato (Zod) devolve 400 com `errors`.
- **Login por username + senha** (`data_model.md` 3.5): toda rota exige estar logado, menos as marcadas como
  **públicas** (cadastro, login, refresh, logout, catálogo, `GET /economy` e health). O que é da conta logada fica em
  `/me/...`; o que vem pelo id (`/characters/:id`, `/squads/:id`, `/battles/:id`, `/chests/:id`) só serve ao dono
  (outra conta = 403).
- **Sessão em cookies httpOnly** (`SameSite=Strict`): o front chama a API com `credentials: 'include'` e nunca vê os
  tokens. `access_token` (JWT RS256, 15 min) vai em toda requisição; `refresh_token` (30 dias, com rotação) só nas
  rotas `/sessions`. Quando uma rota der 401, o front chama `POST /sessions/refresh` e repete; se o refresh também
  der 401, volta para o login.
- **CSRF:** além do `SameSite=Strict`, POST/PUT/DELETE vindos de uma origem fora de `CORS_ORIGINS` dão 403. O front
  precisa ficar no mesmo *site* da API (ex.: `app.dominio` e `api.dominio`).
- **Admin:** as rotas `/admin/...` exigem o papel `ADMIN` (403 sem ele; seção Admin no fim). Ninguém vira admin
  pela API.
- **Limite de requisições por IP:** 300/min no geral; cadastro, login e `PATCH /me` 5/min; refresh 30/min (429 ao
  passar).
- **A seed nunca sai do servidor** (D33).

| Status | Quando |
|---|---|
| 400 | corpo ou parâmetro fora do formato, ou regra do domínio (username inválido, senha curta, build com 3 skills, jogada ilegal, saldo insuficiente, baú já aberto) |
| 401 | não está logado, token vencido ou inválido, ou username/senha errados |
| 403 | recurso de outra conta, ou origem não permitida (CSRF) |
| 404 | recurso não existe |
| 409 | já existe (username, `key` do catálogo), item do catálogo em uso, ou a batalha não aceita a jogada agora (já acabou, não é a vez do jogador, ou outra jogada entrou antes: clique duplo ou duas abas), ou a carteira mudou no meio de um gasto (nada foi gasto: repetir) |
| 429 | limite de requisições |

## Fluxo de uma partida contra a máquina

1. `POST /accounts`: cria a conta, já com os 12 personagens iniciais (D133, D150). `POST /sessions`: entra.
2. `POST /me/squads`: salva a formação (4 personagens na grade 3x3).
3. `GET /npc-squads`: escolhe o adversário.
4. `POST /me/battle-drafts`: o servidor sorteia o **campo** e mostra antes da escolha do squad (D28).
5. `POST /battles` com o squad: a batalha começa; a máquina joga até a vez do jogador.
6. Na vez do jogador: `GET /battles/:id/options` (o que dá para fazer, com a prévia) e `POST /battles/:id/actions`
   com uma das opções. Repete até `status: FINISHED`; no fim vem o XP (`rewards`, D134) e a moeda, os fragmentos e
   às vezes um baú (`loot`, D150).

Contas de teste do seed, as duas com os personagens no nível 18: `admin` / `origin123` (papel de admin) e `tester_01` /
`origin123` (com os blocos de skill do nível 5 do Derik, da Gaia e do Tank). As duas começam com 20.000 M e 50 de
cada fragmento, para testar baús e aprimoramento.

## Saúde

| Rota | Resposta |
|---|---|
| `GET /health` (pública) | 200 `{ status: 'ok' }` |

## Catálogo (públicas)

| Rota | Resposta |
|---|---|
| `GET /templates` | 200 `{ templates }`: os 18 modelos com classe, raridade, `isStarter` (inicial: a conta nova recebe; os outros só saem de baú), variantes, traço de família, stats (perfil no nível 100), passiva e skills (kit primeiro, na ordem Básica, Padrão, Função, Assinatura) |
| `GET /traits` | 200 `{ traits }`: os 10 traços com `key`, nome, descrição, categoria, origem (`TEMPLATE` família / `CONQUERED`), variante (família) e efeitos. É o que a tela mostra no lugar das `traitKeys` dos personagens, das unidades e do `requiredTraitKeys` dos campos |
| `GET /npc-squads?difficulty=` | 200 `{ npcSquads }`: `{ key, name, description, profile, difficulty, level }`, do mais fácil ao mais difícil. `difficulty` opcional (`BEGINNER` a `GRANDMASTER`); outro valor dá 400 |
| `GET /formation-bonuses` | 200 `{ formationBonuses: { statAuras: [{ characterClass, stat, percent }], supportHealPercent, artilleryBackDamagePercent, executorLoneAttackPercent } }`: os valores do D128, lidos das constantes que o motor aplica |
| `GET /gear-rules` | 200 `{ gearRules: { grades: [{ grade, statPercents: { primary, secondary }, requirements, fullBondCostPercent, passiveFactor, rarity, saleValue, partial, none }], bondFactor, adminTuning, maxWaivers, noVariantBonus, lineagePassives, inventory: { initial, step, max } }, gear }`: as regras do equipamento vivo (D94, D153), lidas das constantes, e o catálogo de equipamentos (o formato do item de `GET /me/gear`, sem os campos da conta). `partial` e `none` = `{ statPercents, loseAction: { start, step, max } \| null }`; `rarity` e `saleValue` nulos no Divino |
| `GET /beast-rules` | 200 `{ beastRules: { grades: [{ grade, statPercent: { DOMINANCE, MASTER }, dominanceWillCost, equality: { bufferPercent, bonusPercent }, masterRequirements, saleValue }], speedShare, willShare, duration: { normal, sacred }, fieldCap, perCharacter, equalityAbsorbShare, equalityBreakPercent }, beasts }`: as regras dos contratos (D95, D154), lidas das constantes, e o catálogo de bestas (formato do item de `GET /me/beasts`, sem os campos da conta) |
| `GET /dom-rules` | 200 `{ domRules: { pillars: [{ pillar, primaryStat, secondaryStat, title, uniqueSkill: { name, description }, feats: [{ role, description }] }], levels: [{ level, threshold, thresholdWithoutVariant, primaryPercent, secondaryPercent }], window, checkEvery, lossShare, advancedRoles, advancedRolePoints, pveWeights } }`: as regras do DOM (D93, D152) para o guia, lidas das constantes do servidor; o texto dos feitos já vem com os números |

Como cada bônus de formação vale (D128): `statAuras` e `supportHealPercent` (cura recebida, Suporte) vão para os aliados
adjacentes nas 4 direções, e auras da mesma classe não somam. `artilleryBackDamagePercent` é da própria Artilharia, de
dano, no fundo da linha e com alguém à frente dela. `executorLoneAttackPercent` é do próprio Executor, de Ataque, sem
aliado adjacente. A Vanguarda ancora os adjacentes (não podem ser empurrados, puxados nem trocados à força) e não tem valor.

O squad de NPC **não mostra personagens, formação nem skills**: a formação do rival só aparece quando a batalha
começa e as skills nem nela (`pvp_brief.md` 3).

## Contas e sessão

A conta: `{ id, username, displayName }` (a senha nunca sai, nem como hash).

| Rota | Respostas |
|---|---|
| `POST /accounts` `{ username, displayName, password }` (pública) | 201 `{ account }`; 400 formato inválido (username 3 a 20: minúsculas, números e `_`; nome 2 a 30; senha 8 a 72); 409 username já usado (sem diferença de maiúsculas). Não entra sozinho: depois vem o login |
| `POST /sessions` `{ username, password }` (pública) | 204 com os cookies; 401 username ou senha errados (mesma resposta para os dois) |
| `POST /sessions/refresh` (pública, lê o cookie) | 204 com cookies novos (o refresh antigo deixa de valer); 401 sem cookie ou sessão inválida. Refresh já usado aparecendo de novo derruba **todas** as sessões da conta (token roubado) |
| `DELETE /sessions` (pública) | 204: revoga a sessão e apaga os cookies (funciona mesmo com o token de acesso vencido) |
| `GET /me` | 200 `{ account }` da conta logada, com o `role` (`PLAYER` ou `ADMIN`): é por ele que o front mostra as telas de admin. Os outros jogadores nunca veem o papel |
| `PATCH /me` `{ displayName?, currentPassword?, newPassword? }` | 200 `{ account }` (como no `GET /me`). Muda o nome exibido e/ou a senha; a senha só com `currentPassword`. O username e o papel não mudam (outro campo no corpo dá 400). Trocar a senha **encerra todas as sessões** da conta (os outros aparelhos voltam para o login) e manda cookies novos para este. 400 nome ou senha nova fora da regra, senha atual errada (400, não 401, para o front não tentar o refresh) ou corpo vazio; se uma parte falha, nada muda. 5/min por IP |
| `GET /accounts/:username` | 200 `{ account }`; 404 (busca exata, normalizada) |

## Personagens (`characters`)

O personagem: `{ id, templateKey, name, characterClass, level, xp, xpToNextLevel, danger, awakenedVariantKey,
awakeningHint, dom, stats, freePoints: { allocated, available, maxPerStat }, traitKeys, skills: [{ key, name, source,
isEnhanced, buildSlot }], gear? }`. `stats` são os de fora da batalha (nível + pontos livres + traços + DOM), **sem o
equipamento**. `buildSlot` 1 a 4 = na build. `gear` só vem em `GET /me/characters` e `GET /characters/:id`: o
equipamento no slot (formato de `GET /me/gear`, com o `bond` deste personagem) mais `stats` já com o bônus dele, ou
nulo sem equipamento. Nas mesmas duas rotas vem `beasts: [{ id, key, name, contract, grade, slot }]`: as bestas com
contrato, cada uma com o slot da build que a invocação toma na batalha.

**DOM (D60, D93, D152):** visível, é treino e não segredo. `dom: { windowWeight, pillars: [{ pillar, level, points,
roles: { DAMAGE, TANK, SUPPORT, CONTROL }, nextLevel, nextThreshold, lossBelow, title }] }`, os 4 pilares na ordem
`MIND`, `HEART`, `BODY`, `AURA`. `level` nulo = sem o pilar. `points` = pontos na janela (as últimas batalhas até
150 de peso; `windowWeight` diz quanto já tem). `nextThreshold` = pontos para o próximo nível (nulo no avançado);
o avançado pede também 8 pontos em 3 papéis (`roles`). `lossBelow` = abaixo disso o pilar cai um nível na próxima
conferência (a cada 25 de peso). `title` só no avançado (Vidente, Resiliente, Indestrutível, Rei), que dá a skill
única na batalha. Os feitos, os pesos e as skills únicas estão em `GET /dom-rules`.

**Despertar (D67, D151):** tudo oculto. A partir do nível 80, o servidor sorteia o despertar no fim de uma batalha e
abre 3 missões que o jogador não vê. `awakeningHint` é a única pista: `SILENT` (nada, ou nenhuma missão cumprida),
`SIGNS` (1 cumprida: "algo desperta"), `IMMINENT` (2: está perto) ou `AWAKENED`. Ao despertar, `awakenedVariantKey`
passa a ter a variante despertada, a recompensa da batalha vem com `awakened: true` e abrem os blocos de recuperação
(abaixo).

| Rota | Respostas |
|---|---|
| `GET /me/characters` | 200 `{ characters }` da conta logada |
| `GET /characters/:id` | 200 `{ character }`; 403 de outra conta; 404 |
| `PUT /characters/:id/build` `{ skillKeys: [4] }` | 200 `{ character }`; 400 (não aprendida, repetida, quantidade); 403 de outra conta |
| `PUT /characters/:id/free-points` `{ HP, ATTACK, DEFENSE, SPEED, PRECISION, EVASION, WILL }` | 200 `{ character }`; 400 (acima do total do nível ou do teto da classe). 403 de outra conta. Troca a distribuição inteira (D48) |

**Blocos de skill (D77, D135):** a cada 5 níveis o personagem ganha um bloco de até 3 skills e escolhe 1. O bloco
nasce no fim da batalha (`rewards[].newSkillOffers` diz quantos abriram), fica numa fila sem prazo e não dá para
recusar. A skill escolhida fica guardada; para usar, entra na build. Despertado, cada bloco de 80 a 100 traz ao
menos 1 skill despertada enquanto restarem. Ao despertar, abrem **blocos de recuperação** (`source: AWAKENING`), um
para cada nível de despertada já atingido (80, 85...), cada um com ao menos 1 despertada (D151).

| Rota | Respostas |
|---|---|
| `GET /me/skill-offers` | 200 `{ offers: [{ id, characterId, level, source, skills }] }`: os blocos pendentes, do mais antigo para o mais novo; `source` = `LEVEL_UP` ou `AWAKENING`; `skills` no mesmo formato de `GET /templates` |
| `POST /skill-offers/:id/choose` `{ skillKey }` | 200 `{ character }` com a skill aprendida (`source: OFFER`, `buildSlot: null`); 400 skill fora do bloco ou bloco já escolhido; 403 de outra conta; 404 |

**Aprimorar skill (D80, D100, D150):** tentativa paga, com 25% de chance (fixa, sem pity). O custo sai na hora, dê certo
ou não: moeda + fragmentos **da linhagem da skill** (Neutro na skill none), pelo tipo da skill (`GET /economy`,
`enhancement.cost`). Deu certo: `isEnhanced: true` e a skill rende +15% (dano, cura, escudo, buff e debuff). Um
aprimoramento só por skill.

| Rota | Respostas |
|---|---|
| `POST /characters/:id/enhance` `{ skillKey }` | 200 `{ success, chance, character, wallet }` (`success: false` = perdeu o custo); 400 skill não aprendida, já aprimorada ou saldo insuficiente (nada é gasto); 403 de outra conta; 404; 409 a carteira mudou no meio (nada foi gasto) |

## Squads (`squads`)

O squad: `{ id, name, members: [{ characterId, row, column }] }`. `row` 0 a 2 (linha), `column` 0 a 2 (0 = frente).

| Rota | Respostas |
|---|---|
| `POST /me/squads` `{ name, members: [4 × { characterId, row, column }] }` | 201 `{ squad }`; 400 (4 personagens da conta, sem repetir, células distintas na grade); 404 personagem |
| `GET /me/squads` | 200 `{ squads }` da conta logada |
| `PUT /squads/:id/formation` `{ members }` | 200 `{ squad }`; 403 de outra conta; se der erro, a formação anterior continua |
| `DELETE /squads/:id` | 204; 403 de outra conta |

## Batalhas (`battles`, PvE)

| Rota | Respostas |
|---|---|
| `POST /me/battle-drafts` `{ npcSquadKey }` | 201 `{ draft: { id, opponent: { key, name, profile, difficulty }, field } }`; 404 NPC. `field` traz `requiredTraitKeys` (quem tem qualquer um ganha o bônus, D98) e os dois bônus. Vale por 30 minutos |
| `POST /battles` `{ draftId, squadId }` | 201 `{ battle, events, rewards, loot }`; 403 pré-batalha ou squad de outra conta; 404 pré-batalha (já usada, inclusive por um clique duplo, ou expirada) ou squad; 400 squad incompleto ou personagem sem build |
| `GET /me/battles?status=` | 200 `{ battles }`: as batalhas da conta, da mais recente para a mais antiga (até 50), sem a foto e sem o log: `{ id, mode, status, squadId, npcSquadId, opponent: { name, profile, difficulty }, winner, endReason, rounds, startedAt, finishedAt }`. `status=IN_PROGRESS` acha a batalha para retomar (aba fechada, outro aparelho); `FINISHED` é o histórico |
| `GET /battles/:id` | 200 `{ battle, events }` com **todos** os eventos (retomar a tela ou rever); 403 de outra conta |
| `POST /battles/:id/forfeit` | 200 `{ battle }`: desistir (W.O.). A máquina vence (`endReason: ABANDON`) e não há XP (D136, D147); 403 de outra conta; 409 se a batalha já acabou (inclusive por uma jogada que terminou ao mesmo tempo) |
| `GET /battles/:id/options` | 200 `{ turn, options }`: as jogadas legais da vez do jogador (abaixo); 403 de outra conta; 409 se não é a vez do jogador ou a batalha acabou |
| `POST /battles/:id/actions` (jogada) | 200 `{ battle, events, rewards, loot }` com os eventos **desta** jogada e das vezes da máquina que vieram depois; 400 jogada ilegal (nada muda); 403 de outra conta; 409 batalha encerrada ou outra jogada entrou antes (nada desta fica gravado) |

**Jogada** (`data_model.md` 3.11):

```jsonc
{ "type": "SKILL", "skillKey": "kael-vaz:...", "targetSide": "OPPONENT", "target": { "row": 1, "column": 0 },
  "swapWith": { ... }, "moveTo": { ... }, "fieldKey": "..." }   // os três últimos só nas skills que pedem
{ "type": "MOVE", "to": { "row": 0, "column": 1 } }
{ "type": "SWAP", "withRef": "PLAYER:2" }
{ "type": "DEFEND" }   // só sem skill possível (D38, D122); senão 400
```

**Opções da vez** (`GET /battles/:id/options`): `turn: { ref, side, round }` e `options: [{ payload, preview }]`. O
`payload` é exatamente o corpo de `POST /battles/:id/actions`, então o front não precisa repetir as regras do
motor: só mostra e manda o escolhido. São as mesmas jogadas que a IA considera (`engine.md` 3.13): cada skill
pronta em cada alvo que dá um conjunto diferente de atingidos (com as escolhas extras de trocar inimigos, avançar,
mover aliado e trocar campo), mover para uma célula adjacente vazia, trocar com um aliado (menos quem já foi trocado e ainda não agiu, D141; senão 400) e, **só sem skill
possível**, Defender (D38). Nas skills, `preview` traz `potency` (a força com o Desgaste), `desgaste: { cost, slack }`
e `hits: [{ ref, falloff, hitChance, effects }]`; cada efeito diz o que faria (`DAMAGE` com o valor já com todos os
modificadores, `HEAL`, `SHIELD`, `APPLY_STATUS` com a chance etc.). Chances são probabilidades: o resultado de verdade
sai da seed. Em mover, trocar e defender, `preview` é nulo.

**`battle`:**

| Campo | O que é |
|---|---|
| `status`, `mode`, `opponent` | `IN_PROGRESS` / `FINISHED`; `PVE`; nome, perfil e dificuldade da máquina |
| `round`, `turn`, `timeline` | rodada (até 30); de quem é a vez (`{ ref, side }`, nulo no fim); as próximas 8 vezes |
| `field`, `fields` | o campo valendo (`key`, `untilRound`, `isInitial`) e o catálogo para as trocas |
| `units` | as 8 unidades (`PLAYER:0..3`, `OPPONENT:0..3`): modelo (`templateKey`, também o nome da imagem em `origin-front/public/characters/`), HP, escudo, posição, status, Provocado/Protegido, parceiro do Ligado (`linkedWith`), `invulnerable` (Indestrutível do DOM, até o próximo turno dele), Engajado, classe, nível e traços |
| `result` | no fim: `winner`, `endReason` (`ELIMINATION`, `ROUND_LIMIT` ou `ABANDON`), `rounds`, `rewards` (o XP entregue, o mesmo da resposta da última jogada; vazio na desistência) e `loot` (moeda, fragmentos e baú; nulo na desistência) |

**O que o jogador vê do inimigo** (`pvp_brief.md` 3): classe, nível, traços e o estado em campo. **Não** vê os
`stats` (vêm nulos) nem as skills que ele ainda não usou: `skills` do inimigo só traz as já vistas. Das próprias
unidades vem tudo, com `ready` em cada skill (fora de recarga).

**Skills únicas do DOM (D93, D152):** cada pilar avançado acrescenta uma skill depois das 4 da build, com
`singleUse: true` e `domPillar` (nas outras, `false` e nulo). Uso único (depois de usada, `ready` fica falso até o
fim), sem Desgaste e sem teste de acerto; jogam-se como qualquer skill (`skillKey` `dom:mind`, `dom:heart`,
`dom:body` ou `dom:aura`). Na prévia, a do Rei vem como `WEAKEN { percent, chance }`, a da Vidente como
`APPLY_STATUS` (Atordoado) e a do Indestrutível como `INVULNERABLE`.

**`events`:** a lista de `BattleEvent` (`src/domain/combat/engine/battle-events.ts`), em ordem: `TURN`, `SKILL`,
`DAMAGE` (com `linked: true` quando veio pelo Ligado, `hpLeft` = HP do alvo depois e `targetStatuses` = status dele antes do golpe), `HEAL`, `STATUS`, `MOVE`, `DEFEATED`, `BATTLE_END` e os demais, como `SKIP` (`reason`: `STUN`, `SLEEP` ou `GEAR`, o equipamento vivo agindo sozinho), os das bestas (`SUMMON`, `BEAST_LEAVE`, `EQUALITY`, `EQUALITY_ABSORB`, `EQUALITY_BREAK`), `WOKE` (acordou), `CLEANSE` (Purificar; `status` é o que saiu) e `INVULNERABLE` (Indestrutível). `TURN` traz `statuses` (os que seguem valendo naquele turno). O golpe anulado pelo Indestrutível vem como `DAMAGE` com `amount: 0`. É o que a tela anima.

**`rewards`** (só quando a batalha acaba): `[{ characterId, xp, levelsGained, level, newSkillOffers, awakened?, domChanges? }]`
dos 4 que entraram (D134); `newSkillOffers` = blocos de skill que a subida abriu (D135), mais os de recuperação;
`awakened: true` só em quem despertou nesta batalha (D151); `domChanges: [{ pillar, from, to }]` só em quem subiu ou
caiu um pilar do DOM (`from`/`to` nulo = sem o pilar, D152). Ficam guardados na batalha:
`GET /battles/:id` traz os mesmos em `result.rewards`, para a tela de resultado depois de uma reconexão.

**`loot`** (só quando a batalha acaba; nulo antes): `{ coins, fragments: { [linhagem]: quantidade }, chest: { id, tier } | null }`.
Moeda (vitória 130, derrota 70) e fragmentos (2 / 1, do tipo das variantes da squad; sem variante = Neutro), os dois
com os modificadores do XP (dificuldade e mesmo NPC). O baú, quando cai, fica fechado na conta (`GET /me/chests`).
Já está na carteira quando a resposta chega; também fica em `result.loot`.

**Jogada enviada duas vezes** (clique duplo, duas abas): só a primeira entra. A outra recebe 409 e nada dela fica
gravado, nem o XP. O front deve recarregar com `GET /battles/:id`.

## Economia (carteira, fragmentos e baús)

Valores em `progression_brief.md` Parte 3 (D100, D104, D150). A carteira: `{ coins, fragments, fragmentCap }`, com
`fragments` = os 7 tipos (`FUNDAMENTAL`, `ELEMENTAL`, `MATERIAL`, `VECTORIAL`, `PSYCHIC`, `BIOLOGICAL` e `NONE` =
Neutro), zero nos que faltam, e `fragmentCap` = 500 por tipo. O que passaria do limite vira moeda (40 M cada).

O baú: `{ id, tier, source, battleId, createdAt, openedAt, contents }`. `tier` usa a escala de raridade (`E` a `SS`);
`source` é `PURCHASE` ou `BATTLE`. `contents` é nulo até abrir; depois, `{ rarity, character, convertedTemplateKey,
gear, convertedGearKey, coins, fragments }`: `character` (`{ templateKey, characterId }`) é o personagem novo que
entrou no Elenco; `convertedTemplateKey` é o repetido que virou moeda; `gear` (`{ templateKey, gearId }`) é o
equipamento que entrou no inventário (D153); `convertedGearKey` é o equipamento que não coube e virou moeda; `coins` é
o valor do que virou moeda. Baús abertos antes do D153 não têm `gear` nem `convertedGearKey`.

| Rota | Respostas |
|---|---|
| `GET /economy` (pública) | 200 `{ chests: [{ tier, price, fragments, rarityChances }], raritySaleValue, fragments: { cap, buyPrice, sellPrice }, enhancement: { chance, cost }, battle: { coins, fragments, chestDrop, lossChestDropFactor } }`: os valores para a tela mostrar preços e chances (`price` nulo = não se compra) |
| `GET /me/wallet` | 200 `{ wallet }` |
| `POST /me/fragments/buy` `{ type, amount }` | 200 `{ wallet }`: 200 M cada; 400 saldo insuficiente, quantidade menor que 1 ou passaria de 500 no tipo |
| `POST /me/fragments/sell` `{ type, amount }` | 200 `{ wallet }`: 40 M cada; 400 fragmentos insuficientes |
| `GET /me/chests` | 200 `{ chests }`: os baús **fechados**, do mais antigo para o mais novo |
| `POST /me/chests` `{ tier }` | 201 `{ chest, wallet }`: compra um baú (E 300, D 1.000, C 3.500 M), que chega fechado; 400 nível que não se compra (B a SS) ou saldo insuficiente; 409 a carteira mudou no meio |
| `POST /chests/:id/open` | 200 `{ chest, character, gear, wallet }`: abre (1 item + fragmentos, D150, D153). `character` é o personagem novo (formato de `GET /characters/:id`) ou nulo; `gear` é o equipamento novo (formato de `GET /me/gear`) ou nulo; 400 já aberto (inclusive por um clique duplo: só a primeira abertura entrega); 403 de outra conta; 404 |

**Inventário** (D100, D153): `POST /me/inventory/expand` → 200 `{ price, inventory: { slots, nextExpansionPrice }, wallet }`:
+5 espaços por 300, 600, 1.000, 1.500, 2.000 M e +500 M a cada compra seguinte, até 100; 400 saldo insuficiente ou já
no máximo (`nextExpansionPrice` nulo); 409 a carteira mudou no meio.

**Gasto ao mesmo tempo** (duas abas): de dois gastos em cima do mesmo saldo, só um entra; o outro recebe 409 sem gastar
nada. Ganhos (fim de batalha, baú aberto) nunca se perdem.

## Equipamento vivo (`gear`, D153)

Regras em `living_gear_brief.md` 10. O item: `{ id, key, name, description, kind, grade, lineage, primaryStat,
secondaryStat, primaryPercent, secondaryPercent, requirements: [{ stat, level }], titles, saleValue, source, acquiredAt,
characterId, bond }`. `kind` = `WEAPON` ou `ARMOR`; `grade` = `SQUIRE`, `KNIGHT`, `MASTER`, `KING` ou `DIVINE`;
`saleValue` nulo = Divino (não se vende); `characterId` nulo = guardado.

O elo (`bond`, com quem está usando; nulo se guardado): `{ characterId, bond, requirements: [{ stat, level, met }],
met, waived, matchingTitles, effects }`. `bond` = `FULL`, `PARTIAL` ou `NONE`; `met` = requisitos cumpridos de
verdade; `waived` = substituídos por título da lista ou Prodígio (no máximo 1). `effects` = `{ bond, bonusPercents,
penaltyPercents, initialDesgastePercent, passive, loseAction }`:

- `bonusPercents`: o bônus por stat, já com o elo e o ×1,25 sem variante.
- `penaltyPercents`: a queda na batalha (parcial e sem elo).
- `initialDesgastePercent`: o custo do pleno (Desgaste inicial no stat da linhagem).
- `passive`: a passiva da linhagem já escalada: `DOT_ON_HIT { chance }`, `SINGLE_TARGET_REDUCTION { percent }`,
  `IGNORE_DEFENSE { percent }`, `STATUS_WILL { percent }`, `REGEN { percentOfMaxHp }` ou
  `INITIAL_SHIELD { percentOfMaxHp }`.
- `loseAction`: a chance de perder a ação (`{ start, step, max }` em %), ou nulo.

O elo muda com os pontos livres; na batalha, vale o do início.

| Rota | Respostas |
|---|---|
| `GET /me/gear` | 200 `{ inventory: { used, slots, nextExpansionPrice }, gear }`: o inventário, do mais antigo para o mais novo |
| `GET /gear/:id/bonds` | 200 `{ gear, bonds }`: o elo com cada personagem da conta (para escolher quem usa); 403 de outra conta; 404 |
| `POST /gear/:id/equip` `{ characterId }` | 200 `{ gear, unequipped }`: põe no slot do personagem (um só). Se estava em outro personagem, sai de lá; o que estava no slot volta para o inventário (`unequipped`, ou nulo). Qualquer elo vale. 403 equipamento ou personagem de outra conta; 404 |
| `POST /gear/:id/unequip` | 200 `{ gear }`: volta para o inventário; 403; 404 |
| `POST /gear/:id/sell` | 200 `{ coins, wallet }`: vende ao sistema (Escudeiro 40, Cavaleiro 250, Mestre 1.500, Rei 9.000 M); 400 equipado (tire antes) ou Divino; 403; 404 |

**Na batalha:** cada unidade traz `gear` (nulo sem equipamento). Dos dois lados aparecem `key`, `name`, `kind`,
`grade`, `lineage` e `passive`; da própria unidade, também `bond`, `bonusPercents`, `penaltyPercents`,
`initialDesgastePercent` e `loseAction`. Eventos: `SKIP` com `reason: 'GEAR'` (o equipamento agiu sozinho); `STATUS` e
`HEAL` com `source: 'GEAR'` (Dano contínuo da Elemental, regeneração da Biológica).

## Contratos com bestas (`beasts`, D154)

Regras em `beast_contracts_brief.md` 10. A besta: `{ id, key, name, description, contract, grade, lineage, skills,
requirements, titles, saleValue, source, acquiredAt, characterId, slot, requirementsWithHolder }`. `contract` =
`DOMINANCE` (a IA joga a besta), `MASTER` (o jogador joga) ou `EQUALITY` (não entra em campo, divide o dano com o
dono). `grade` = `SQUIRE`, `KNIGHT`, `MASTER`, `KING` ou `SACRED`. `skills` são as 2 em campo (formato da skill
do catálogo, sem Desgaste). `saleValue` é nulo na sagrada. `characterId` e `slot` são o contrato (nulos =
guardada). `requirementsWithHolder` só vem no Mestre com contrato: os requisitos com o dono agora.

Os requisitos: `{ characterId, meets, requirements: [{ stat, level, met }], met, waived, matchingTitles }`. `meets` =
pode firmar e entrar em batalha (o Mestre pede todos; o título da lista vale 1).

| Rota | Respostas |
|---|---|
| `GET /me/beasts` | 200 `{ beasts }`; os espaços do inventário (equipamento e bestas somados) estão em `GET /me/gear` |
| `GET /beasts/:id/requirements` | 200 `{ beast, requirements }`: com cada personagem da conta (vazio fora do Mestre); 403; 404 |
| `POST /beasts/:id/contract` `{ characterId, slot }` | 200 `{ beast }`: firma o contrato; a invocação toma o slot (1 a 4) da build. 400 já tem contrato, slot ocupado, personagem já com o máximo de bestas (1, ou 2 com Domador), segunda sagrada ou Mestre sem todos os requisitos; 403; 404 |
| `PUT /beasts/:id/slot` `{ slot }` | 200 `{ beast }`: troca o slot que a invocação toma; 400 sem contrato ou slot ocupado; 403; 404 |
| `POST /beasts/:id/sell` | 200 `{ coins, wallet }`: vende ao sistema a besta sem contrato (40 / 250 / 1.500 / 9.000 M pelo grau); 400 com contrato ou sagrada; 403; 404 |
| `DELETE /beasts/:id` | 204: desfaz o contrato ou descarta a besta. **Ela se perde** (não volta, não rende moeda); o front pede confirmação. 403; 404 |

**Na batalha:**
- **Invocação:** é a skill do slot dela, com `beastKey` e `singleUse: true`. Dominância e Mestre:
  `{ type: 'SKILL', skillKey, targetSide: <o próprio lado>, target: <célula livre> }`. Igualdade: em si mesmo.
- **Unidades das bestas:** entram em `units` (refs `PLAYER:B0`, `PLAYER:B0-2`). Fora de campo têm `alive: false` e
  `position: null`. O campo `beast: { key, ownerRef, contract, grade, auto, duration, turnsLeft }` diz de quem é e
  quanto falta.
- **Igualdade no dono:** a unidade do dono traz `equality: { buffer, turnsLeft }`.
- **Vez da Dominância:** é jogada pela máquina e chega pronta nos eventos, como as do rival.
- **Eventos:** `SUMMON` (`ref`, `beastRef`, `to`), `BEAST_LEAVE` (a besta saiu pela duração; com `equality: true`,
  acabou a Igualdade do dono), `EQUALITY` (`buffer`), `EQUALITY_ABSORB` (`amount` segurado) e `EQUALITY_BREAK`
  (`amount` que o dono levou).
- **Bloqueio:** se o personagem não cumpre os requisitos do contrato Mestre, `POST /battles` dá 400.

## Admin (`/admin/...`, papel `ADMIN`)

Toda rota daqui dá 403 para quem não é admin (401 sem login). O front mostra as telas pelo `role` de `GET /me`.

### Leitura e apoio

| Rota | Resposta |
|---|---|
| `GET /admin/catalog` | 200 `{ catalog: { version, variants, traits, templates, skills, fields, npcSquads, awakenings, gear, beasts } }`: tudo, pela `key`, inclusive a formação e as skills dos NPCs (que o jogador não vê). Cada item vem **no formato do corpo da edição** (abaixo) mais campos só de leitura, então a tela pode editar e devolver o mesmo objeto |
| `GET /admin/options` | 200 `{ options }`: as listas dos selects (linhagens, classes, raridades, periculosidade, exclusividade, stats, categorias e origens de traço, tiers, alvos, alcances, áreas, papéis do kit, status, perfis e dificuldades da IA, `awakeningRequirementLevels`, `awakeningMissionCategories` e `awakeningMissionKinds` com a categoria e o limiar padrão de cada tipo, `gearGrades`, `gearKinds`, `beastContracts`, `beastGrades` e `titles`, os títulos que existem), os tipos de efeito (`effectTypes.trait`, `.skill`, `.passiveTrigger`, `.passiveEffect`) e as regras (`rules`: orçamento por classe e tolerância, referência por tier, Poder máximo, nível do despertar, faixa de nível dos NPCs por dificuldade, limites de traços, variantes e campos, `awakeningRequirements`, `awakeningMissionRules`, `gear` (bônus por grau, ajuste do admin, requisitos por grau e limites dos títulos) e `beast` (skills por besta e requisitos do Mestre por grau)) |
| `GET /admin/skills/reference?tier=&target=&range=&area=&isNone=&isAwakened=` | 200 `{ reference: { power, desgastePercent, cooldown, minLevel } }`: os valores de referência do tipo + forma (D16, D92) enquanto o admin monta a skill. `range` só em skill de inimigo; `isNone=true` para skill sem variante; `isAwakened=true` para skill de variante despertada (Poder ×1,25 até 2,5, Desgaste ×1,5, nível mínimo 80, D96) |

Campos só de leitura no `GET /admin/catalog`: modelo `skillKeys` (as skills dele, kit primeiro); skill `lineage`,
`isAwakened`, `templateKey` e `reference`; squad de NPC `level`; despertar `baseVariantKey`; equipamento e besta `saleValue`.
No `PUT` eles são ignorados.

### Criar, editar e apagar

`:collection` = `variants`, `traits`, `templates`, `skills`, `fields`, `npc-squads`, `awakenings`, `gear` ou `beasts`
(outro valor dá 400).

| Rota | Respostas |
|---|---|
| `POST /admin/:collection` `{ key, ...corpo }` | 201 `{ entry, version }`; 400 formato ou regra (do item ou do catálogo inteiro); 404 ligação (`variantKey`, `traitKeys`...) que não existe; 409 `key` já usada |
| `PUT /admin/:collection/:key` `{ ...corpo }` | 200 `{ entry, version }`; troca o item **inteiro** (a `key` não muda); 400, 404 (item ou ligação) como acima |
| `DELETE /admin/:collection/:key` | 204; 404; 409 em uso (a mensagem diz quem usa: outro item do catálogo ou "jogadores") |

`key`: minúsculas, números e `-`, até 80; nas skills, `:` separa o modelo (`kael-vaz:detonacao`). **As skills de um
modelo são as de `key` com o prefixo dele** (o kit básico e o pool de ofertas, D77, D92).

**O catálogo fica válido inteiro.** Cada gravação relê tudo pelo domínio: se a mudança quebra outro item, dá 400 e
nada muda. Exemplos: subir o `minLevel` de uma skill acima do nível do NPC que a usa; um modelo sem as 4 skills do
kit (sem elas a conta nova não recebe o personagem, D133). Por isso, para um **modelo novo**: crie antes as 4 skills
do kit (`key` com o prefixo do modelo, `kitClass` = classe dele, um de cada `kitSlot`, divididas pelas variantes como
no D97) e depois o modelo. Para **apagar um modelo**: apague antes as skills dele (e tire-o dos NPCs).

**Quando vale:** na hora, para todas as contas (os stats saem do modelo) e para as batalhas novas. A batalha em
andamento segue com a foto do início. `version` muda a cada gravação. **Rodar o seed de novo grava por cima**, pela
`key`, o que o admin editou.

**Corpo de cada tipo** (as regras finas são do domínio; ver `data_model.md` 3):

```jsonc
// variants
{ "name": "Vento", "lineage": "ELEMENTAL", "description": null, "awakensFromKey": null }
// traits (efeitos: STAT_MODIFIER { stat, percent }, SKILL_DAMAGE_MODIFIER { range, percent },
//         LINEAGE_COST_MODIFIER { percent }, GEAR_REQUIREMENT_WAIVER { count }, EXTRA_BEAST_SLOT { count })
{ "name": "Veterano", "description": null, "category": "COMBAT", "source": "CONQUERED", "variantKey": null,
  "effects": [{ "type": "STAT_MODIFIER", "stat": "WILL", "percent": 3 }] }
// templates (stats = perfil no nível 100; passiva: src/domain/characters/value-objects/passive.ts)
{ "name": "...", "description": null, "characterClass": "VANGUARD", "rarity": "C", "initialDanger": "DISCRETE",
  "exclusivity": "NONE", "isStarter": false, "variants": [{ "variantKey": "explosao", "isPrimary": true }], "familyTraitKey": null,
  "stats": { "HP": 0, "ATTACK": 0, "DEFENSE": 0, "SPEED": 0, "PRECISION": 0, "EVASION": 0, "WILL": 0 },
  "passive": { "name": "...", "description": "...", "trigger": { "type": "ON_HIT" }, "effects": [...] } }
// skills (efeitos: src/domain/skills/value-objects/skill-effect.ts; todos aceitam "appliesTo": "TARGET" | "SELF")
{ "name": "...", "description": null, "variantKey": "explosao", "tier": "STANDARD", "target": "ENEMY",
  "range": "MELEE", "area": "SINGLE", "cooldown": 1, "desgastePercent": 1.5, "baseHitChance": 0.9, "minLevel": 0,
  "kitClass": null, "kitSlot": null, "effects": [{ "type": "DAMAGE", "power": 1 }] }
// fields
{ "name": "Arena", "description": null, "requiredTraitKeys": ["berserker", "impeto"], "primaryStat": "ATTACK",
  "secondaryStat": "SPEED", "primaryPercent": 6, "secondaryPercent": 4 }
// npc-squads (4 membros; skillKeys = a build, na ordem; o traço de família do modelo entra sozinho se faltar)
{ "name": "...", "description": null, "profile": "BALANCED", "difficulty": "BEGINNER",
  "members": [{ "templateKey": "kael-vaz", "level": 18, "row": 0, "column": 0, "awakenedVariantKey": null,
                "skillKeys": ["...", "...", "...", "..."], "traitKeys": [] }] }
// awakenings (D151; variantKey = uma variante despertada, uma por despertar; requirements: 2 a 3, sem repetir stat,
//             no máximo 2 HIGH e 2 LOW; missions: sem repetir kind, ao menos uma de cada categoria)
{ "name": "Cristal", "description": null, "variantKey": "cristal",
  "requirements": [{ "stat": "WILL", "level": "HIGH" }, { "stat": "HP", "level": "HIGH" }, { "stat": "ATTACK", "level": "LOW" }],
  "missions": [{ "kind": "SUPPORT_ACTIONS", "threshold": 100 }, { "kind": "SUPPORT_SHARE", "threshold": 15 },
               { "kind": "SOLE_SURVIVOR_WIN", "threshold": 1 }] }
// gear (D153; o grau fixa quantos requisitos: 2/2/3/4/4, no máximo 2 HIGH e 2 LOW, ao menos 1 LOW do MASTER para
//       cima; percentuais opcionais = o padrão do grau, ajuste de até ±15%; titles: 2 a 5, só os que existem)
{ "name": "Couraça de Pedra", "description": null, "kind": "ARMOR", "grade": "SQUIRE", "lineage": "MATERIAL",
  "primaryStat": "DEFENSE", "secondaryStat": "HP",
  "requirements": [{ "stat": "DEFENSE", "level": "HIGH" }, { "stat": "HP", "level": "HIGH" }],
  "titles": ["Resiliente", "Indestrutível"] }
// beasts (D154; contract fixo na besta; skills: 2 em Dominância e Mestre, nenhuma na Igualdade, no formato da skill
//         sem Desgaste; requirements e titles só no Mestre, 2/2/3/4/4 pelo grau)
{ "name": "Lobo de Cinzas", "description": null, "contract": "DOMINANCE", "grade": "KNIGHT", "lineage": "ELEMENTAL",
  "skills": [{ "name": "Mordida", "tier": "BASIC", "target": "ENEMY", "range": "MELEE", "area": "SINGLE",
               "cooldown": 0, "baseHitChance": 0.9, "effects": [{ "type": "DAMAGE", "power": 0.8 }] }, { ... }] }
```

**Equipamento no catálogo:** apagar um modelo que alguma conta tem dá 409 ("jogadores"). Mudar o modelo vale na hora
para quem já tem (o item guarda só a ligação); a batalha em andamento segue com a foto do início.

**Despertar no catálogo:** as skills do despertar são skills comuns na variante despertada (`minLevel` ≥ 80), com a
`key` do modelo que as recebe. Apagar um despertar que algum personagem já sorteou dá 409 ("jogadores"). Mudar o
pool não afeta quem já sorteou (o personagem guarda a cópia das 3 missões).

### Contas

Nenhuma rota muda o papel. O username da URL é normalizado como no cadastro.

| Rota | Respostas |
|---|---|
| `GET /admin/accounts` | 200 `{ accounts: [{ id, username, displayName, role, characters, battles }] }`, pelo username (`characters` e `battles` = quantos tem) |
| `GET /admin/accounts/:username/characters` | 200 `{ characters }` (formato de `GET /me/characters`); 404 conta |
| `GET /admin/accounts/:username/battles?status=` | 200 `{ battles }` (formato de `GET /me/battles`); 404 conta |
| `POST /admin/accounts/:username/characters` `{ templateKey }` | 201 `{ character }`: dá o personagem como no cadastro (nível 0, kit na build, traço de família), por exemplo de um modelo criado depois da conta; 404 conta ou modelo; 409 a conta já tem esse modelo |
| `POST /admin/accounts/:username/gear` `{ gearKey }` | 201 `{ gear }`: dá um equipamento vivo à conta, guardado no inventário (D153; serve também para o Divino de um evento único); 400 inventário cheio; 404 conta ou equipamento |
| `POST /admin/accounts/:username/beasts` `{ beastKey }` | 201 `{ beast }`: dá uma besta à conta, sem contrato (no MVP é o "evento" que dá bestas, D154); 400 inventário cheio; 404 conta ou besta |
| `PUT /admin/characters/:characterId/dom` `{ pillars: { MIND?, HEART?, BODY?, AURA? } }` | 200 `{ character }`: define o nível de cada pilar do DOM (`BASIC`, `INTERMEDIATE`, `ADVANCED`; nulo ou ausente = sem o pilar), para testar sem farmar feitos (D152). A janela de feitos não muda e a perda volta a contar do zero: sem feitos, o pilar cai um nível a cada 25 de peso. 400 nível ou pilar desconhecido; 404 personagem. O id vem de `GET /admin/accounts/:username/characters` |
