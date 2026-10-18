# ORIGIN — Motor de combate

> Como o motor calcula e resolve a batalha. Cada peça entra **uma por vez**, documentada aqui com a fórmula, o
> porquê e um exemplo. Regras do jogo em [`game_design.md`](./game_design.md); dados guardados em
> [`data_model.md`](./data_model.md).

---

## 1. Princípios

- **Puro e determinístico:** o motor vive em `src/domain` e não lê relógio, rede ou `Math.random()` (o ESLint
  barra). A aleatoriedade vem da porta `Rng`, alimentada pela seed (D8). Mesma seed + mesmas ações = mesmo resultado.
- **Calcula a partir do snapshot:** a batalha começa de uma foto dos dois lados (`data_model.md` 3.10). O motor não
  busca nada no banco no meio da partida.
- **Funções pequenas e testadas:** cada fórmula é uma função pura com teste próprio, citando a decisão (D) de onde
  vem o número.

## 2. Plano

| # | Peça | Estado |
|---|---|---|
| 1 | Cálculo de stats | **feito** |
| 2 | Montar o snapshot (jogador e máquina) | **feito** |
| 3 | Barra de ação e fila de turnos | a fazer |
| 4 | Acerto e dano | a fazer |
| 5 | Desgaste | a fazer |
| 6 | Alcance, bloqueio, área e queda | a fazer |
| 7 | Status e empilhamento | a fazer |
| 8 | Defender, Interceptar e reposicionamento | a fazer |
| 9 | Exaustão e fim da batalha | a fazer |
| 10 | IA da máquina | a fazer |
| 11 | Simulador IA contra IA (calibração) | a fazer |

---

## 3. Peças

### 3.1 Cálculo de stats

Os stats do personagem **fora de batalha** (antes de buff, debuff e Desgaste), a partir do snapshot da unidade.

**Fórmula** (D91), para cada um dos 7 stats:

```
stat = round( (perfil × 85% × crescimento(nível) + pontos livres) × (1 + % dos traços / 100) )

crescimento(nível) = 0,40 + 0,60 × nível / 100        (0,40 no nível 0, 1,0 no nível 100)
```

| Parte | De onde vem | Observação |
|---|---|---|
| `perfil` | `CharacterTemplate` (nível 100, já com a distribuição padrão) | 3.3 do `data_model.md` |
| `85%` | a base; os outros 15% são os pontos livres | `BASE_SHARE` |
| `crescimento` | linear: **34% do perfil no nível 0** (85% × 0,40) até 85% no 100 | D91 |
| `pontos livres` | `Character.freePoints`; **HP vale 5 por ponto** | NPC usa a distribuição padrão (abaixo) |
| `% dos traços` | soma dos `STAT_MODIFIER`; **positivos param em +15%** (D88), negativos entram inteiros | só os traços que valem para o personagem |

- **Arredondamento:** para inteiro, no fim (stats inteiros, como na tabela das classes).
- **Ordem:** os traços multiplicam a base **com** os pontos livres.
- **Traço de família:** só vale para quem tem a variante da família, e isso já é garantido pelo modelo (um
  `CharacterTemplate` com família sempre tem a variante dela, `data_model.md` 3.3). Por isso o snapshot não filtra.
- **Depois:** DOM e equipamento vivo entram como novas fontes nesta mesma função.

**Distribuição padrão dos pontos livres** (`defaultFreePoints`, usada pelo NPC): os 15% do perfil na mesma proporção do
próprio perfil, limitados aos pontos que o nível já concedeu (10 a cada 10 níveis), arredondando para baixo. No nível
100 ela reconstrói o perfil (diferença de no máximo 1 por stat).

**Exemplo** (Vanguarda, perfil 700 / 100 / 120 / 75 / 85 / 55 / 95):

| Situação | HP | Ataque | Defesa | Velocidade | Precisão | Esquiva | Vontade |
|---|---|---|---|---|---|---|---|
| Nível 0 (34%) | 238 | 34 | 41 | 26 | 29 | 19 | 32 |
| Nível 100, sem pontos (85%) | 595 | 85 | 102 | 64 | 72 | 47 | 81 |
| Nível 100, distribuição padrão | 700 | 100 | 120 | 75 | 84 | 55 | 95 |
| Nível 100, sem pontos, Berserker (+10% dano melee, −8% Defesa) | 595 | 85 | 94 | 64 | 72 | 47 | 81 |
| Nível 100, sem pontos, dois traços de +10% de Ataque | 595 | **98** (teto +15%) | 102 | 64 | 72 | 47 | 81 |

Distribuição padrão da Vanguarda no nível 100: HP 21 · Ataque 15 · Defesa 18 · Velocidade 11 · Precisão 12 · Esquiva 8 ·
Vontade 14 (99 de 100 pontos). No nível 50, metade (ex.: Defesa 9).

```ts
computeStats({
  profile: kaelTemplate.stats,
  level: 100,
  freePoints: kael.freePoints,
  traitEffects: applicableTraits.flatMap((t) => t.effects),
})
// { HP: 700, ATTACK: 100, DEFENSE: 120, ... }
```

**Domínio:** `src/domain/characters/services/stat-calculator.ts` (`computeStats`, `baseGrowth`, `traitPercents`);
distribuição padrão em `src/domain/characters/services/free-points.ts` (`defaultFreePoints`).

### 3.2 Montar o snapshot

Transforma o que está guardado (`Character` + `Squad` do jogador e `NpcSquad` da máquina) na **foto do início da
batalha** (`BattleSnapshot`, `data_model.md` 3.10). É o que o motor recebe; dali em diante ele não consulta mais nada.

**Funções** (`src/domain/combat/services/build-snapshot.ts`):

| Função | O que faz |
|---|---|
| `buildPlayerSide` | o squad do jogador como está **agora** (nível, pontos livres, traços, build e aprimoramentos) |
| `buildNpcSide` | o squad da máquina, com a **distribuição padrão** de pontos livres no nível de cada membro (3.1) |
| `buildPveSnapshot` | junta os dois lados |

**Catálogo carregado (`SnapshotCatalog`):** modelos, variantes, skills e traços indexados pelo id. Quem chama (o caso de
uso de iniciar batalha) busca tudo no repositório antes; o domínio só monta a foto, sem acessar banco.

**Como cada unidade é montada:**

| Campo | Jogador | Máquina |
|---|---|---|
| `ref` | `PLAYER:0` a `PLAYER:3`, na ordem do squad | `OPPONENT:0` a `OPPONENT:3` |
| `name`, `templateKey`, `characterClass`, `passive`, `profile` | do modelo | do modelo |
| `lineages` | linhagens das variantes do modelo, **principal primeiro** | idem |
| `level` | o do personagem | o do membro |
| `freePoints` | os do personagem | `defaultFreePoints(perfil, nível)` |
| `traitEffects` | efeitos de todos os traços do personagem (inclui o de família) | efeitos dos traços do membro |
| `skills` | a **build** (4, na ordem dos slots), com `isEnhanced` | as 4 do membro, nunca aprimoradas |
| `row`, `column` | a célula no squad | a célula no squad da máquina |

**Skills como valor:** cada skill é copiada com todos os números (`toSnapshotSkill`). Se o admin mudar a skill depois,
o replay continua com a original. O aprimoramento é guardado como `isEnhanced`; o **ganho** (+15%) e o limite da faixa
do ranqueado são aplicados pelo motor.

**Erros (`BuildSnapshotError`):** squad de outra conta; **squad incompleto** (personagem vendido, 3.8 do
`data_model.md`); personagem, modelo, variante, skill ou traço não carregado; personagem sem build completa.

**Exemplo** (fictício): o squad "Muralha" de `tester_01` contra `beginner-wall` no nível 20.

| `ref` | Unidade | Nível | Pontos livres | Traços | Célula |
|---|---|---|---|---|---|
| `PLAYER:0` | Kael Pyranth (fogo) | o dela | os dela | `family-pyranth`, `veteran` | 0:0 |
| `OPPONENT:0` | Recruta 1 | 20 | padrão do nível 20 (Defesa 3, ...) | | 0:0 |

```ts
const snapshot = buildPveSnapshot(
  { account: tester, squad: muralha, characters, catalog },
  { npcSquad: beginnerWall, catalog }
)
// right(BattleSnapshot) → vai para Battle.startPve({ ..., snapshot })

buildPlayerSide({ account: tester, squad: muralhaSemUmPersonagem, characters, catalog })
// left(BuildSnapshotError): squad incompleto (3 de 4): complete a formação
```
