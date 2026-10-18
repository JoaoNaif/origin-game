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
| 3 | Barra de ação e fila de turnos | **feito** |
| 4 | Acerto e dano | **feito** |
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

### 3.3 Barra de ação e fila de turnos

Decide **quem age e quando** (D10, D30, D102). Não há "turno da equipe": a fila passa de unidade em unidade, de quem
for, pela Velocidade.

**Barra de ação** (`TurnQueue`, `src/domain/combat/services/turn-queue.ts`):

- Cada unidade tem uma barra de **0 a 1000**, começando em 0.
- **A cada tick**, a barra de todas soma a **Velocidade** atual.
- Ao chegar a **1000**, a unidade age e **subtrai 1000**. A **sobra fica** (Velocidade 115 age no tick 9 com 1035 e
  fica com 35), para a proporção entre Velocidades ser exata ao longo da luta.

**Quem age primeiro quando várias chegam no mesmo tick** (D30):

1. Quem **cruzou 1000 antes dentro do tick**: fração `(1000 − barra antes do tick) / Velocidade`, a menor primeiro.
   A comparação é feita por multiplicação cruzada, sem divisão (sem erro de arredondamento).
2. Empate exato: maior **média de stats** (`statAverage`: orçamento ÷ 7, com HP valendo 1/5).
3. Empate total: **sorteio pela seed** (`Rng`).

**Outras operações:**

| Operação | Regra |
|---|---|
| `setSpeed` | buff ou debuff de Velocidade: vale a partir do próximo tick, sem mexer na barra (efeito gradual, `skills_brief.md` 9.2) |
| `shift(percent)` | adiantar (+) ou atrasar (−) a vez do Tático (D102): `barra + 1000 × %`, **presa entre 0 e 1000**. Adiantar nunca dá mais de uma ação extra; atrasar nunca deixa negativo |
| `remove` | tira a unidade derrotada (ou a besta que saiu) da fila |

**Sobra da barra (D106):** depois de agir, a unidade fica com a sobra (Velocidade 115 age no tick 9 com 1035 e fica
com 35). Sem isso, personagens de Velocidade diferente passariam a agir quase na mesma frequência. O "a barra nunca
passa de 1000" do D102 vale para o **adiantar** do Tático, que é onde ele impede ganhar várias ações extras.

**Rodada (D106):** **termina quando todas as unidades vivas agiram pelo menos uma vez**, ou seja, quando o mais lento faz
a sua ação. Aí começa a próxima. Quem é mais rápido pode agir **mais de uma vez** na mesma rodada.

- Se a última unidade que faltava agir é derrotada, a rodada fecha ali (o próximo mais lento passa a fechar a rodada).
- Uma unidade que entra no meio (besta invocada) precisa agir antes de a rodada fechar.
- A duração de uma rodada depende do mais lento em campo (um squad com Artilharia tem rodadas mais longas), mas vale
  igual para os dois lados, porque conta todas as unidades da batalha.
- A rodada conta para a **Exaustão** (a partir da 21), o **fim forçado** (30) e o **Interceptar** (1 vez por rodada).

**Exemplo** (Executor 115 contra Artilharia 65):

| Tick | Barra do Executor | Barra da Artilharia | Age | Rodada |
|---|---|---|---|---|
| 9 | 1035 → **35** | 585 | Executor | 1 |
| 16 | 840 | 1040 → **40** | Artilharia | 1 (fecha: todos agiram) |
| 18 | 1070 → **70** | 170 | Executor | 2 |
| 27 | 1105 → **105** | 755 | Executor | 2 (age 2 vezes) |
| 31 | 565 | 1015 → **15** | Artilharia | 2 (fecha) |

Em 60 turnos, o Executor age ~1,77 vez para cada vez da Artilharia (115 ÷ 65).

```ts
const queue = new TurnQueue(
  units.map((u) => ({ ref: u.ref, speed: stats[u.ref].SPEED, statAverage: statAverage(stats[u.ref]) })),
  new SeededRng(battle.seed)
)

const turn = queue.next() // { ref: 'PLAYER:2', tick: 9, round: 1 }
queue.shift('PLAYER:0', 50) // Tático adianta um aliado em 50%
```

### 3.4 Acerto e dano

**Acerto** (`src/domain/combat/services/hit.ts`, D68, D91):

```
chance de acerto = base da skill × 2 × Precisão / (Precisão + Esquiva)      entre 30% e 100%
```

- Com Precisão igual à Esquiva, a chance é a própria base (0,8 na skill normal).
- O sorteio usa a seed (`roll`): acerta se o próximo número da `Rng` for menor que a chance. Com chance de 100% não
  sorteia (não gasta a seed). **Errar não cobra Desgaste** (9.4b do `skills_brief.md`).
- Skill sem teste de acerto (aliado ou si mesmo, `baseHitChance` nulo) não passa por aqui.

**Chance de status** (mesma forma, contra a Vontade, D92):

```
chance de status = base do status × 2 × Precisão / (Precisão + Vontade)      entre 30% e 90%
```

O teto de 90% garante que nenhum status é certo.

| Exemplo (base 0,8) | Precisão | Esquiva | Acerto |
|---|---|---|---|
| Atirador → Vanguarda | 125 | 55 | 100% (teto) |
| Atirador → Executor | 125 | 115 | 83% |
| Vanguarda → Executor | 85 | 115 | 68% |
| Guardião → Executor | 70 | 115 | 60% |

**Dano** (`src/domain/combat/services/damage.ts`, D68):

```
dano base = Poder × Ataque² / (Ataque + Defesa)
```

- **Razão, não subtração:** o dano nunca zera e o equilíbrio é o mesmo em qualquer nível. Sem variação aleatória e sem
  crítico.
- **Ataque e Defesa já entram ajustados** (buffs, debuffs e Desgaste, peças 5 e 7).
- **Poder efetivo:** skill aprimorada ganha **+15%** (D100). No ranqueado o ganho é limitado pela faixa (100% na
  Platina, 50% no Ouro, 0 no Bronze e na Prata, D99); no PvE vale inteiro.
- **Ordem completa (D68):** dano base → queda da linha (peça 6) → modificadores de dano (Marcado, Exaustão, traços de
  dano: peças 7 e 9) → Defender (peça 8) → escudo → HP.
- **Arredondamento:** inteiro no fim; um acerto sempre tira pelo menos 1.

**Escudo e HP (`applyDamage`):** o escudo absorve primeiro (é a única forma de "passar" do HP); o resto sai do HP, que
não fica negativo. A passiva "ignora escudos" (ex.: Ecko, D83) pula o escudo.

**Cura e escudo concedidos (`healAmount`, D92):** Poder 1,0 = **10% do HP máximo do alvo** (cura 2,0 em quem tem 420 de
HP = 84). A cura não passa do HP máximo (8.3 do `skills_brief.md`), regra aplicada quando a cura entrar na resolução.

**Conferido com a tabela de `classes_brief.md` 4** (Poder 1,0, nível 100):

| Ataque → Alvo | Ataque | Defesa do alvo | HP do alvo | Dano | % do HP |
|---|---|---|---|---|---|
| Vanguarda → Vanguarda | 100 | 120 | 700 | 45 | 6,5% |
| Executor → Atirador | 140 | 60 | 420 | 98 | 23,3% |
| Atirador → Executor | 125 | 55 | 400 | 87 | 21,7% |
| Guardião → Guardião | 60 | 140 | 780 | 18 | 2,3% |

```ts
const chance = hitChance(skill.baseHitChance, attacker.PRECISION, target.EVASION)
if (roll(rng, chance)) {
  const power = effectivePower(skill.power, skill.isEnhanced)
  const damage = finalDamage(baseDamage(power, attacker.ATTACK, target.DEFENSE))
  const result = applyDamage(damage, { hp: target.hp, shield: target.shield })
}
```
