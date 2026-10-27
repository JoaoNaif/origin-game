# API (contrato HTTP para o front)

O que o front consome. **Atualize este doc ao mudar a API.** Modelo dos dados em [`data_model.md`](./data_model.md);
o servidor é a autoridade do combate (D9): o cliente só envia a jogada e exibe o resultado.

## Convenções

- Base local: `http://localhost:3333` (`PORT` no `.env`). CORS só para as origens de `CORS_ORIGINS`.
- Corpo e resposta em JSON. Cada resposta embrulha o recurso numa chave (`{ account }`, `{ characters }`).
- Erros no formato do Nest: `{ statusCode, message }`. Validação de formato (Zod) devolve 400 com `errors`.
- **Login por username + senha** (`data_model.md` 3.5): toda rota exige estar logado, menos as marcadas como
  **públicas** (cadastro, login, refresh, logout, catálogo e health). O que é da conta logada fica em `/me/...`; o
  que vem pelo id (`/characters/:id`, `/squads/:id`, `/battles/:id`) só serve ao dono (outra conta = 403).
- **Sessão em cookies httpOnly** (`SameSite=Strict`): o front chama a API com `credentials: 'include'` e nunca vê os
  tokens. `access_token` (JWT RS256, 15 min) vai em toda requisição; `refresh_token` (30 dias, com rotação) só nas
  rotas `/sessions`. Quando uma rota der 401, o front chama `POST /sessions/refresh` e repete; se o refresh também
  der 401, volta para o login.
- **CSRF:** além do `SameSite=Strict`, POST/PUT/DELETE vindos de uma origem fora de `CORS_ORIGINS` dão 403. O front
  precisa ficar no mesmo *site* da API (ex.: `app.dominio` e `api.dominio`).
- **Admin:** as rotas `/admin/...` exigem o papel `ADMIN` (403 sem ele; seção Admin no fim). Ninguém vira admin
  pela API.
- **Limite de requisições por IP:** 300/min no geral; cadastro e login 5/min; refresh 30/min (429 ao passar).
- **A seed nunca sai do servidor** (D33).

| Status | Quando |
|---|---|
| 400 | corpo ou parâmetro fora do formato, ou regra do domínio (username inválido, senha curta, build com 3 skills, jogada ilegal) |
| 401 | não está logado, token vencido ou inválido, ou username/senha errados |
| 403 | recurso de outra conta, ou origem não permitida (CSRF) |
| 404 | recurso não existe |
| 409 | já existe (username, `key` do catálogo), item do catálogo em uso, ou a batalha não aceita a jogada agora (já acabou, não é a vez do jogador, ou outra jogada entrou antes: clique duplo ou duas abas) |
| 429 | limite de requisições |

## Fluxo de uma partida contra a máquina

1. `POST /accounts`: cria a conta, já com os 12 personagens (D133). `POST /sessions`: entra.
2. `POST /me/squads`: salva a formação (4 personagens na grade 3x3).
3. `GET /npc-squads`: escolhe o adversário.
4. `POST /me/battle-drafts`: o servidor sorteia o **campo** e mostra antes da escolha do squad (D28).
5. `POST /battles` com o squad: a batalha começa; a máquina joga até a vez do jogador.
6. Na vez do jogador: `GET /battles/:id/options` (o que dá para fazer, com a prévia) e `POST /battles/:id/actions`
   com uma das opções. Repete até `status: FINISHED`; no fim vem o XP (`rewards`, D134).

Contas de teste do seed, as duas com os personagens no nível 18: `admin` / `origin123` (papel de admin) e `tester_01` /
`origin123` (com os blocos de skill do nível 5 do Derik, da Gaia e do Tank).

## Saúde

| Rota | Resposta |
|---|---|
| `GET /health` (pública) | 200 `{ status: 'ok' }` |

## Catálogo (públicas)

| Rota | Resposta |
|---|---|
| `GET /templates` | 200 `{ templates }`: os 12 modelos com classe, raridade, variantes, traço de família, stats (perfil no nível 100), passiva e skills (kit primeiro, na ordem Básica, Padrão, Função, Assinatura) |
| `GET /traits` | 200 `{ traits }`: os 9 traços com `key`, nome, descrição, categoria, origem (`TEMPLATE` família / `CONQUERED`), variante (família) e efeitos. É o que a tela mostra no lugar das `traitKeys` dos personagens, das unidades e do `requiredTraitKeys` dos campos |
| `GET /npc-squads?difficulty=` | 200 `{ npcSquads }`: `{ key, name, description, profile, difficulty, level }`, do mais fácil ao mais difícil. `difficulty` opcional (`BEGINNER` a `GRANDMASTER`); outro valor dá 400 |

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
| `GET /accounts/:username` | 200 `{ account }`; 404 (busca exata, normalizada) |

## Personagens (`characters`)

O personagem: `{ id, templateKey, name, characterClass, level, xp, xpToNextLevel, danger, awakenedVariantKey,
stats, freePoints: { allocated, available, maxPerStat }, traitKeys, skills: [{ key, name, source, isEnhanced,
buildSlot }] }`. `stats` são os de fora da batalha (nível + pontos livres + traços). `buildSlot` 1 a 4 = na build.

| Rota | Respostas |
|---|---|
| `GET /me/characters` | 200 `{ characters }` da conta logada |
| `GET /characters/:id` | 200 `{ character }`; 403 de outra conta; 404 |
| `PUT /characters/:id/build` `{ skillKeys: [4] }` | 200 `{ character }`; 400 (não aprendida, repetida, quantidade); 403 de outra conta |
| `PUT /characters/:id/free-points` `{ HP, ATTACK, DEFENSE, SPEED, PRECISION, EVASION, WILL }` | 200 `{ character }`; 400 (acima do total do nível ou do teto da classe). 403 de outra conta. Troca a distribuição inteira (D48) |

**Blocos de skill (D77, D135):** a cada 5 níveis o personagem ganha um bloco de até 3 skills e escolhe 1. O bloco
nasce no fim da batalha (`rewards[].newSkillOffers` diz quantos abriram), fica numa fila sem prazo e não dá para
recusar. A skill escolhida fica guardada; para usar, entra na build.

| Rota | Respostas |
|---|---|
| `GET /me/skill-offers` | 200 `{ offers: [{ id, characterId, level, skills }] }`: os blocos pendentes, do mais antigo para o mais novo; `skills` no mesmo formato de `GET /templates` |
| `POST /skill-offers/:id/choose` `{ skillKey }` | 200 `{ character }` com a skill aprendida (`source: OFFER`, `buildSlot: null`); 400 skill fora do bloco ou bloco já escolhido; 403 de outra conta; 404 |

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
| `POST /battles` `{ draftId, squadId }` | 201 `{ battle, events, rewards }`; 403 pré-batalha ou squad de outra conta; 404 pré-batalha (já usada, inclusive por um clique duplo, ou expirada) ou squad; 400 squad incompleto ou personagem sem build |
| `GET /me/battles?status=` | 200 `{ battles }`: as batalhas da conta, da mais recente para a mais antiga (até 50), sem a foto e sem o log: `{ id, mode, status, squadId, npcSquadId, opponent: { name, profile, difficulty }, winner, endReason, rounds, startedAt, finishedAt }`. `status=IN_PROGRESS` acha a batalha para retomar (aba fechada, outro aparelho); `FINISHED` é o histórico |
| `GET /battles/:id` | 200 `{ battle, events }` com **todos** os eventos (retomar a tela ou rever); 403 de outra conta |
| `POST /battles/:id/forfeit` | 200 `{ battle }`: desistir (W.O.). A máquina vence (`endReason: ABANDON`) e não há XP (D136, a confirmar); 403 de outra conta; 409 se a batalha já acabou (inclusive por uma jogada que terminou ao mesmo tempo) |
| `GET /battles/:id/options` | 200 `{ turn, options }`: as jogadas legais da vez do jogador (abaixo); 403 de outra conta; 409 se não é a vez do jogador ou a batalha acabou |
| `POST /battles/:id/actions` (jogada) | 200 `{ battle, events, rewards }` com os eventos **desta** jogada e das vezes da máquina que vieram depois; 400 jogada ilegal (nada muda); 403 de outra conta; 409 batalha encerrada ou outra jogada entrou antes (nada desta fica gravado) |

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
mover aliado e trocar campo), mover para uma célula adjacente vazia, trocar com um aliado e, **só sem skill
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
| `units` | as 8 unidades (`PLAYER:0..3`, `OPPONENT:0..3`): modelo (`templateKey`, também o nome da imagem em `origin-front/public/characters/`), HP, escudo, posição, status, Provocado/Protegido, Engajado, classe, nível e traços |
| `result` | no fim: `winner`, `endReason` (`ELIMINATION`, `ROUND_LIMIT` ou `ABANDON`), `rounds` e `rewards` (o XP entregue, o mesmo da resposta da última jogada; vazio na desistência) |

**O que o jogador vê do inimigo** (`pvp_brief.md` 3): classe, nível, traços e o estado em campo. **Não** vê os
`stats` (vêm nulos) nem as skills que ele ainda não usou: `skills` do inimigo só traz as já vistas. Das próprias
unidades vem tudo, com `ready` em cada skill (fora de recarga).

**`events`:** a lista de `BattleEvent` (`src/domain/combat/engine/battle-events.ts`), em ordem: `TURN`, `SKILL`,
`DAMAGE`, `HEAL`, `STATUS`, `MOVE`, `DEFEATED`, `BATTLE_END` e os demais. É o que a tela anima.

**`rewards`** (só quando a batalha acaba): `[{ characterId, xp, levelsGained, level, newSkillOffers }]` dos 4 que
entraram (D134); `newSkillOffers` = blocos de skill que a subida abriu (D135). Ficam guardados na batalha:
`GET /battles/:id` traz os mesmos em `result.rewards`, para a tela de resultado depois de uma reconexão.

**Jogada enviada duas vezes** (clique duplo, duas abas): só a primeira entra. A outra recebe 409 e nada dela fica
gravado, nem o XP. O front deve recarregar com `GET /battles/:id`.

## Admin (`/admin/...`, papel `ADMIN`)

Toda rota daqui dá 403 para quem não é admin (401 sem login). O front mostra as telas pelo `role` de `GET /me`.

### Leitura e apoio

| Rota | Resposta |
|---|---|
| `GET /admin/catalog` | 200 `{ catalog: { version, variants, traits, templates, skills, fields, npcSquads } }`: tudo, pela `key`, inclusive a formação e as skills dos NPCs (que o jogador não vê). Cada item vem **no formato do corpo da edição** (abaixo) mais campos só de leitura, então a tela pode editar e devolver o mesmo objeto |
| `GET /admin/options` | 200 `{ options }`: as listas dos selects (linhagens, classes, raridades, periculosidade, exclusividade, stats, categorias e origens de traço, tiers, alvos, alcances, áreas, papéis do kit, status, perfis e dificuldades da IA), os tipos de efeito (`effectTypes.trait`, `.skill`, `.passiveTrigger`, `.passiveEffect`) e as regras (`rules`: orçamento por classe e tolerância, referência por tier, Poder máximo, nível do despertar, faixa de nível dos NPCs por dificuldade, limites de traços, variantes e campos) |
| `GET /admin/skills/reference?tier=&target=&range=&area=&isNone=` | 200 `{ reference: { power, desgastePercent, cooldown, minLevel } }`: os valores de referência do tipo + forma (D16, D92) enquanto o admin monta a skill. `range` só em skill de inimigo; `isNone=true` para skill sem variante |

Campos só de leitura no `GET /admin/catalog`: modelo `skillKeys` (as skills dele, kit primeiro); skill `lineage`,
`isAwakened`, `templateKey` e `reference`; squad de NPC `level`. No `PUT` eles são ignorados.

### Criar, editar e apagar

`:collection` = `variants`, `traits`, `templates`, `skills`, `fields` ou `npc-squads` (outro valor dá 400).

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
  "exclusivity": "NONE", "variants": [{ "variantKey": "explosao", "isPrimary": true }], "familyTraitKey": null,
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
```

### Contas

Nenhuma rota muda o papel. O username da URL é normalizado como no cadastro.

| Rota | Respostas |
|---|---|
| `GET /admin/accounts` | 200 `{ accounts: [{ id, username, displayName, role, characters, battles }] }`, pelo username (`characters` e `battles` = quantos tem) |
| `GET /admin/accounts/:username/characters` | 200 `{ characters }` (formato de `GET /me/characters`); 404 conta |
| `GET /admin/accounts/:username/battles?status=` | 200 `{ battles }` (formato de `GET /me/battles`); 404 conta |
| `POST /admin/accounts/:username/characters` `{ templateKey }` | 201 `{ character }`: dá o personagem como no cadastro (nível 0, kit na build, traço de família), por exemplo de um modelo criado depois da conta; 404 conta ou modelo; 409 a conta já tem esse modelo |
