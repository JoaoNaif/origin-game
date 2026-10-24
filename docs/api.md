# API (contrato HTTP para o front)

O que o front consome. **Atualize este doc ao mudar a API.** Modelo dos dados em [`data_model.md`](./data_model.md);
o servidor é a autoridade do combate (D9): o cliente só envia a jogada e exibe o resultado.

## Convenções

- Base local: `http://localhost:3333` (`PORT` no `.env`). CORS só para as origens de `CORS_ORIGINS`.
- Corpo e resposta em JSON. Cada resposta embrulha o recurso numa chave (`{ account }`, `{ characters }`).
- Erros no formato do Nest: `{ statusCode, message }`. Validação de formato (Zod) devolve 400 com `errors`.
- **Sem login no MVP** (`data_model.md` 3.5): a conta vai na URL (`/accounts/:username/...`) e os recursos pelo id.
  Autenticação entra depois, numa migração própria.
- **A seed nunca sai do servidor** (D33).

| Status | Quando |
|---|---|
| 400 | corpo ou parâmetro fora do formato, ou regra do domínio (username inválido, build com 3 skills, jogada ilegal) |
| 403 | recurso de outra conta (ex.: squad de outra conta na batalha) |
| 404 | recurso não existe |
| 409 | já existe (username), ou a batalha não aceita a jogada agora (já acabou) |

## Fluxo de uma partida contra a máquina

1. `POST /accounts`: cria a conta, já com os 12 personagens (D133).
2. `POST /accounts/:username/squads`: salva a formação (4 personagens na grade 3x3).
3. `GET /npc-squads`: escolhe o adversário.
4. `POST /accounts/:username/battle-drafts`: o servidor sorteia o **campo** e mostra antes da escolha do squad (D28).
5. `POST /battles` com o squad: a batalha começa; a máquina joga até a vez do jogador.
6. `POST /battles/:id/actions` a cada vez do jogador, até `status: FINISHED`. No fim vem o XP (`rewards`, D134).

## Saúde

| Rota | Resposta |
|---|---|
| `GET /health` | 200 `{ status: 'ok' }` |

## Catálogo (leitura pública)

| Rota | Resposta |
|---|---|
| `GET /templates` | 200 `{ templates }`: os 12 modelos com classe, raridade, variantes, traço de família, stats (perfil no nível 100), passiva e skills (kit primeiro, na ordem Básica, Padrão, Função, Assinatura) |
| `GET /npc-squads?difficulty=` | 200 `{ npcSquads }`: `{ key, name, description, profile, difficulty, level }`, do mais fácil ao mais difícil. `difficulty` opcional (`BEGINNER` a `GRANDMASTER`); outro valor dá 400 |

O squad de NPC **não mostra personagens, formação nem skills**: a formação do rival só aparece quando a batalha
começa e as skills nem nela (`pvp_brief.md` 3).

## Contas (`accounts`)

A conta pública: `{ id, username, displayName }`.

| Rota | Respostas |
|---|---|
| `POST /accounts` `{ username, displayName }` | 201 `{ account }`; 400 formato inválido; 409 username já usado (sem diferença de maiúsculas) |
| `GET /accounts/:username` | 200 `{ account }`; 404 (busca exata, normalizada) |

## Personagens (`characters`)

O personagem: `{ id, templateKey, name, characterClass, level, xp, xpToNextLevel, danger, awakenedVariantKey,
stats, freePoints: { allocated, available, maxPerStat }, traitKeys, skills: [{ key, name, source, isEnhanced,
buildSlot }] }`. `stats` são os de fora da batalha (nível + pontos livres + traços). `buildSlot` 1 a 4 = na build.

| Rota | Respostas |
|---|---|
| `GET /accounts/:username/characters` | 200 `{ characters }`; 404 conta |
| `GET /characters/:id` | 200 `{ character }`; 404 |
| `PUT /characters/:id/build` `{ skillKeys: [4] }` | 200 `{ character }`; 400 (não aprendida, repetida, quantidade) |
| `PUT /characters/:id/free-points` `{ HP, ATTACK, DEFENSE, SPEED, PRECISION, EVASION, WILL }` | 200 `{ character }`; 400 (acima do total do nível ou do teto da classe). Troca a distribuição inteira (D48) |

Aprender skill nova ainda não tem rota: vem com as ofertas a cada 5 níveis (D77).

## Squads (`squads`)

O squad: `{ id, name, members: [{ characterId, row, column }] }`. `row` 0 a 2 (linha), `column` 0 a 2 (0 = frente).

| Rota | Respostas |
|---|---|
| `POST /accounts/:username/squads` `{ name, members: [4 × { characterId, row, column }] }` | 201 `{ squad }`; 400 (4 personagens da conta, sem repetir, células distintas na grade); 404 conta ou personagem |
| `GET /accounts/:username/squads` | 200 `{ squads }` |
| `PUT /squads/:id/formation` `{ members }` | 200 `{ squad }`; se der erro, a formação anterior continua |
| `DELETE /squads/:id` | 204 |

## Batalhas (`battles`, PvE)

| Rota | Respostas |
|---|---|
| `POST /accounts/:username/battle-drafts` `{ npcSquadKey }` | 201 `{ draft: { id, opponent: { key, name, profile, difficulty }, field } }`; 404 conta ou NPC. `field` traz `requiredTraitKeys` (quem tem qualquer um ganha o bônus, D98) e os dois bônus. Vale por 30 minutos |
| `POST /battles` `{ draftId, squadId }` | 201 `{ battle, events, rewards }`; 403 squad de outra conta; 404 pré-batalha (já usada ou expirada) ou squad; 400 squad incompleto ou personagem sem build |
| `GET /battles/:id` | 200 `{ battle, events }` com **todos** os eventos (retomar a tela ou rever) |
| `POST /battles/:id/actions` (jogada) | 200 `{ battle, events, rewards }` com os eventos **desta** jogada e das vezes da máquina que vieram depois; 400 jogada ilegal (nada muda); 409 batalha encerrada |

**Jogada** (`data_model.md` 3.11):

```jsonc
{ "type": "SKILL", "skillKey": "kael-vaz:...", "targetSide": "OPPONENT", "target": { "row": 1, "column": 0 },
  "swapWith": { ... }, "moveTo": { ... }, "fieldKey": "..." }   // os três últimos só nas skills que pedem
{ "type": "MOVE", "to": { "row": 0, "column": 1 } }
{ "type": "SWAP", "withRef": "PLAYER:2" }
{ "type": "DEFEND" }   // só sem skill possível (D38, D122); senão 400
```

**`battle`:**

| Campo | O que é |
|---|---|
| `status`, `mode`, `opponent` | `IN_PROGRESS` / `FINISHED`; `PVE`; nome, perfil e dificuldade da máquina |
| `round`, `turn`, `timeline` | rodada (até 30); de quem é a vez (`{ ref, side }`, nulo no fim); as próximas 8 vezes |
| `field`, `fields` | o campo valendo (`key`, `untilRound`, `isInitial`) e o catálogo para as trocas |
| `units` | as 8 unidades (`PLAYER:0..3`, `OPPONENT:0..3`): HP, escudo, posição, status, Provocado/Protegido, Engajado, classe, nível e traços |
| `result` | no fim: `winner`, `endReason` (`ELIMINATION` ou `ROUND_LIMIT`), `rounds` |

**O que o jogador vê do inimigo** (`pvp_brief.md` 3): classe, nível, traços e o estado em campo. **Não** vê os
`stats` (vêm nulos) nem as skills que ele ainda não usou: `skills` do inimigo só traz as já vistas. Das próprias
unidades vem tudo, com `ready` em cada skill (fora de recarga).

**`events`:** a lista de `BattleEvent` (`src/domain/combat/engine/battle-events.ts`), em ordem: `TURN`, `SKILL`,
`DAMAGE`, `HEAL`, `STATUS`, `MOVE`, `DEFEATED`, `BATTLE_END` e os demais. É o que a tela anima.

**`rewards`** (só quando a batalha acaba): `[{ characterId, xp, levelsGained, level }]` dos 4 que entraram (D134).
