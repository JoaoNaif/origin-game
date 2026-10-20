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
| 5 | Desgaste | **feito** |
| 6 | Alcance, bloqueio, área e queda | **feito** |
| 7 | Status, empilhamento e recarga | **feito** |
| 8 | Defender, Interceptar e reposicionamento | **feito** |
| 9 | Exaustão e fim da batalha | **feito** |
| 10 | Resolução do turno (juntar as peças num motor que executa a batalha) | **feito** |
| 10b | Passivas dos personagens (executar os gatilhos e efeitos do D83) | **feito** |
| 10c | Campo de batalha no snapshot e no motor (D98) | **feito** |
| 11 | IA da máquina (D90, D103, D114) | **feito** |
| 12 | Simulador IA contra IA (calibração) | **feito** (calibração em andamento, 3.14) |

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
- A rodada conta para a **Exaustão** (a partir da 16, D119), o **fim forçado** (30) e o **Interceptar** (1 vez por rodada).

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

### 3.5 Desgaste

O custo das skills (9.4 e 9.4b do `skills_brief.md`, D71, D91, D96, D97). Acumula durante a batalha, **nunca usa
aleatoriedade** (custo é lei) e some no fim (D32). Fica em `DesgasteState`, um por unidade
(`src/domain/combat/services/desgaste.ts`).

**Onde cada linhagem cobra** (9.4):

| Linhagem | Cobra em | Como |
|---|---|---|
| Fundamental | HP máximo | reduz o máximo (cura comum não recupera, D59) |
| Elemental | HP atual | dano em si, imediato (cura desfaz) |
| Material | Defesa | perda no stat |
| Vetorial | Precisão | perda no stat |
| Psíquica | Vontade | perda no stat |
| Biológica | Esquiva | perda no stat |
| none (sem variante) | Defesa | perda no stat (D107; divide com a Material, mas nunca juntos) |

**Quanto cobra:** `desgastePercent` da skill (já com os modificadores do tipo e da forma, 12.1 e 12.2) **sobre o stat
base** (o stat fora de batalha, 3.1), vezes os modificadores da unidade:

| Modificador | Efeito |
|---|---|
| Despertado (D96) | skill **não** despertada custa ×0,75 se a build tem uma despertada (a despertada já vem com ×1,5 no valor) |
| Sangue puro (D88) | −10% na linhagem da família (`lineageCostPercent` do snapshot) |
| Ressonância (D97) | a skill cobra 100% na própria linhagem e mais **60%** na outra variante (2 variantes) ou **40%** em cada uma das outras (3) |

- A ressonância conta **por variante**: duas variantes da mesma linhagem (ex.: fogo e gelo, Elemental) cobram as duas
  partes no mesmo stat (160%).
- **Quando cobrar** (regra do chamador, peça de resolução): só se a skill produziu efeito em pelo menos 1 alvo (errar
  não cobra); skill sem teste de acerto cobra sempre; área cobra uma vez.

**Piso (D91):** o stat nunca cai abaixo de **80% do base** (perde no máximo 20%). No Elemental, o dano em si nunca leva o
HP atual abaixo de 80% do máximo. O que passa do piso simplesmente não é cobrado.

**Potência (9.4b):** depende da **folga na linhagem da própria skill** antes de cobrar:

```
potência = 0,7 + 0,3 × min(1, folga / custo pedido)      (D119; era 0,5 + 0,5)
```

Com folga suficiente, 100%; parcial, interpola; sem folga, **70%** (D119). Multiplica dano, cura, buff e debuff; **duração e
acerto não mudam**. A skill nunca deixa de poder ser usada.

**Alívio (`relieve`, 9.4b, placeholders):** remove uma fração do Desgaste acumulado: cura **20%**, Defender **10%**, skill
de recuperação **50%**. A cura comum não devolve o HP máximo perdido pela Fundamental; só a skill de recuperação. O
"buff no mesmo stat soma direto" entra na peça de status e empilhamento.

**Exemplo** (Vanguarda Material, nível 100, Defesa base 120 → piso 96):

| Ação | Pede | Cobra | Defesa | Potência |
|---|---|---|---|---|
| Forte (5%) | 6 | 6 | 114 | 100% |
| Forte | 6 | 6 | 108 | 100% |
| Forte | 6 | 6 | 102 | 100% |
| Reforçada (2,5%) | 3 | 3 | 99 | 100% |
| Forte | 6 | 3 | **96** (piso) | 75% |
| Forte | 6 | 0 | 96 | **50%** |

Com 2 variantes (Material + Vetorial, Precisão base 84), a mesma Forte também tira 60% × 5% × 84 = **2,52** de Precisão.

```ts
const desgaste = new DesgasteState({
  baseStats,
  lineages: unit.lineages,
  hasAwakenedSkill: unit.skills.some((s) => s.isAwakened),
  lineageCostPercent: unit.lineageCostPercent,
})

const { potency, selfDamage } = desgaste.charge(skill, currentHp) // só se a skill teve efeito
const defense = desgaste.stat(Stat.DEFENSE) // entra no dano já com o Desgaste
```

**Fica para depois:** o custo do equipamento vivo no elo pleno (D94) e a Vontade da Dominância (D95), quando essas
camadas entrarem.

### 3.6 Alcance, bloqueio, área e queda

Quem a skill atinge e com quanto da força (D21, D22, D34 a D36, `skills_brief.md` 11.1 a 11.4). Função
`resolveTargets` em `src/domain/combat/services/targeting.ts`: recebe a skill, quem usa, as unidades **vivas** do lado
alvo e a célula escolhida, e devolve a lista de atingidos com o multiplicador da queda.

**A grade (D35):** a **linha** vai da frente (coluna 0) para o fundo (coluna 2). O **exposto** é a primeira célula
ocupada da linha. **Derrotado não bloqueia** (D21): só unidades vivas entram.

Os dois lados frente a frente (desenho do usuário; os números são as colunas, 1 = frente, `x` = o meio do campo):

```
3 2 1 x 1 2 3
3 2 1 x 1 2 3
3 2 1 x 1 2 3
```

No código, a coluna 1 do desenho é a `column: 0`, a 2 é a `1` e a 3 é a `2`.

**Alvo único contra inimigo**, pelo alcance:

| Alcance | Quem pode ser alvo | Queda |
|---|---|---|
| Corpo a corpo | **só o exposto** da linha escolhida, ou quem tem o status **Exposto** (11.9) | |
| À distância | **qualquer** célula ocupada | |
| Flanco | o **fundo** da linha (última célula ocupada), ignorando o bloqueio | |
| Perfurante | **a linha inteira** da célula escolhida, atravessando | **sem queda** (D36) |

**Área contra inimigo** (ignora o bloqueio; o atacante escolhe a célula, 11.3):

| Área | Atinge | Queda |
|---|---|---|
| Linha | todos da linha da célula, **da frente para o fundo** | **100% / 60% / 30%** pela ordem dos personagens na profundidade |
| Coluna | todos da mesma profundidade nas 3 linhas | **sem queda** (D108) |
| Grade | todos | sem queda |

- **A queda é pela profundidade de cada personagem na linha** (D36): o primeiro que aparece leva 100%, o seguinte 60% e
  o terceiro 30%. **Coluna vazia não conta.** Linha com perfurante não tem queda (a linha inteira leva 100%).
- **Coluna sem queda (D108):** todos estão na mesma profundidade, então todos levam 100%.

Exemplo da queda (lado inimigo, colunas 1 a 3 da frente para o fundo):

```
          1   2   3
linha 1   A   B   C     ataque na linha 1 → A 100%, B 60%, C 30%
linha 2   D   .   E     ataque na linha 2 → D 100%, E 60%  (a coluna 2 está vazia)
linha 3   .   .   F     ataque na linha 3 → F 100%
```

Perfurante na linha 1: A, B e C levam 100%. Coluna 1: A e D levam 100%.

**Skill em aliado** (11.4): **sem bloqueio** e **sem queda**. Alvo único na célula escolhida; linha, coluna ou grade em
todos os aliados da área (buff de squad, D102). **Si mesmo:** só quem usa.

**Erros (`InvalidTargetError`):** célula fora da grade; célula vazia (alvo único); corpo a corpo atrás de alguém; área
sem ninguém.

**Exemplo** (grade inimiga):

```
            coluna 0   coluna 1   coluna 2
  linha 0      A          .          B
  linha 1      .          C          .
  linha 2      D          .          .
```

| Skill | Célula | Atinge |
|---|---|---|
| Corpo a corpo | 0:0 | A |
| Corpo a corpo | 0:2 | **inválido** (B está atrás de A); com B **Exposto**, atinge B |
| À distância | 0:2 | B |
| Flanco | linha 0 | B |
| Perfurante | linha 0 | A 100%, B 100% |
| Linha | linha 0 | A 100%, B 60% |
| Coluna | coluna 0 | A 100%, D 100% |
| Grade | | A, B, C, D (100%) |

```ts
const hits = resolveTargets({
  skill: { target: SkillTarget.ENEMY, range: SkillRange.RANGED, area: SkillArea.LINE },
  actor,
  units: aliveEnemies,
  cell: { row: 0, column: 1 },
})
// right([{ ref: 'OPPONENT:0', falloff: 1 }, { ref: 'OPPONENT:1', falloff: 0.6 }])
```

**Fica para outras peças:** o Interceptar do Guardião (peça 8) desvia golpes de alvo único depois daqui; a
dificuldade de cada alvo (acerto) é por alvo atingido (peça 4).

### 3.7 Status e empilhamento

Os estados e os buffs/debuffs de cada unidade (`skills_brief.md` 11.9, 11.10, 12.4, 12.5, D31, D73). Ficam em
`UnitConditions`, um por unidade (`src/domain/combat/services/conditions.ts`). **Não sorteia:** a chance de aplicar
já foi decidida antes (`statusChance` + `roll`, 3.4).

**Status** (valores do 12.4; duração em **turnos do afetado**, D31):

| Status | Efeito | Duração | Base |
|---|---|---|---|
| Atordoado | perde a próxima ação; depois fica **imune a novo Atordoado por 1 turno** (anti-cadeia) | 1 | 70% |
| Travado | **+2 de recarga** numa skill do alvo (instantâneo) | | 80% |
| Preso | não pode se mover nem ser movido | 2 | 80% |
| Exposto | vira alvo de corpo a corpo mesmo atrás de alguém (3.6) | 2 | 85% |
| Marcado | recebe **+20%** de dano | 3 | 80% |
| Dano contínuo | perde **4% do HP máximo** no início de cada turno dele (ignora a Defesa) | 3 | 80% |

- **Início do turno do afetado** (`startTurn`): aplica o dano contínuo, consome o Atordoado (perde a ação e ganha a
  imunidade) e baixa 1 de todas as durações (status e modificadores).
- **O mesmo status de novo renova** (fica a maior duração e o maior valor), não soma (9.5b).
- **Travado (D110):** instantâneo; coloca **+2 de recarga na skill mais forte que está pronta** (maior tipo; empate, maior
  Poder; empate, a primeira da build). Se nenhuma está pronta, trava a que ficaria pronta primeiro. Fica em
  `SkillCooldowns.lock` (abaixo).

**Buffs e debuffs** (`addModifier`, D73, D92):

- **Multiplicativos** sobre o stat (já com o Desgaste): `stat × (1 + %₁) × (1 + %₂)...`. A ordem não importa: +20% e
  −20% dão ×0,96.
- **No máximo 2 buffs e 2 debuffs por stat** (contados separados). Magnitudes 10%, 15% e 20% (12.5): no máximo **+44%** e
  **−36%**.
- **A mesma fonte** (a mesma skill) **renova** a duração (e fica o maior valor), não soma.
- **Fonte além do limite (D110):** substitui a **mais fraca** do mesmo sentido se for **mais forte ou igual**; se for mais
  fraca, é ignorada (trocar um 15% por um 10% pioraria o personagem).
- **Fora do limite** (`unlimited`): o Defender (+50% de Defesa, D102) e o bônus do campo de batalha (D98).

**Exemplo** (Ataque 100, com Desgaste já aplicado):

| Ação | Fontes no Ataque | Multiplicador | Ataque |
|---|---|---|---|
| Grito de guerra +20% | +20 | ×1,20 | 120 |
| Comando +20% | +20, +20 | ×1,44 | 144 (teto prático) |
| Encorajar +15% | ignorado (mais fraco que os dois) | ×1,44 | 144 |
| Maldição −20% | +20, +20, −20 | ×1,152 | 115 |

```ts
const conditions = new UnitConditions()

if (roll(rng, statusChance(0.8, attacker.PRECISION, target.WILL))) {
  conditions.applyDefaultStatus(StatusType.MARK) // +20% de dano recebido por 3 turnos dele
}

const { skipAction, dotDamage } = conditions.startTurn(maxHp) // no início do turno do afetado
const attack = conditions.effectiveStat(Stat.ATTACK, desgaste.stat(Stat.ATTACK))
```

**Recarga** (`SkillCooldowns`, `src/domain/combat/services/cooldowns.ts`, D92 e 8.2 do `skills_brief.md`):

- Conta em **turnos do próprio personagem**: recarga **N** = a skill fica **fora dos próximos N turnos dele**. A Básica
  (recarga 0) pode ser usada todo turno.
- Baixa 1 no **fim de cada turno** dele, menos na skill usada naquele turno.
- O Travado soma 2 à recarga da skill travada (uma skill pronta fica fora dos próximos 2 turnos).

| Turno do personagem | Usa | Padrão (recarga 1) | Final (recarga 4) |
|---|---|---|---|
| 1 | Final | pronta | entra em 4 |
| 2 | Padrão | entra em 1 | 3 |
| 3 | Básica | 0 → pronta no 4 | 2 |
| 4 | Padrão | entra em 1 | 1 |
| 5 | Básica | pronta no 6 | 0 → pronta no 6 |

### 3.8 Defender, Interceptar e reposicionamento

**Defender** (`defend`, `src/domain/combat/services/defend.ts`, D38, 9.5, D102):

- A ação quando não há skill possível (ou de propósito). **Não existe ataque básico grátis.**
- **+50% de Defesa** até o início do próximo turno dele, **fora do limite de 2 fontes**, e **alívio de 10%** do Desgaste.
- Reduz de ~13% (Executor) a ~19% (Vanguarda) do dano recebido: é "menor que dano" (11.8), não trava o jogo.

**Interceptar do Guardião** (`InterceptState`, `src/domain/combat/services/intercept.ts`, D102, 11.6, 12.8):

- **Passiva de classe**, automática, sem Desgaste, não ocupa slot.
- **Uma vez por rodada** (a rodada do D106), o primeiro golpe **de alvo único, corpo a corpo ou à distância**, contra um
  aliado **adjacente** (4 direções) é desviado para o Guardião. O dano é calculado contra a Defesa dele, e o status do
  golpe cai nele.
- **Não intercepta:** área, perfurante e flanco (são os contras da formação).
- Não intercepta se estiver **Atordoado ou Preso**.
- Com mais de um Guardião, a **ordem é fixa pela seed** no início da batalha; o primeiro da ordem que puder intercepta.

**Reposicionamento** (`BattleGrid`, `src/domain/combat/services/battle-grid.ts`, D19, D42, D44, 10.4, 11.11):

| Movimento | Regra |
|---|---|
| Mover (ação) | só para célula **adjacente e vazia**; custa o turno |
| Trocar com aliado (ação) | os dois perdem a ação (D42); pelo Tático, nenhum perde (D102) |
| Empurrar (skill) | o alvo vai para o **fundo** (coluna +1), na mesma linha |
| Puxar (skill) | o alvo vem para a **frente** (coluna −1), na mesma linha |
| Avançar/recuar (DASH, skill) | quem usa vai para uma célula adjacente e vazia |
| Mover aliado (MOVE_ALLY, skill) | move ou troca aliados sem custar a ação deles (Tático, D102) |
| Trocar inimigos (SWAP, skill) | o alvo troca de lugar com **outro inimigo adjacente a ele**, escolhido por quem usa (D111) |

- **Preso** não se move nem é movido (11.9).
- **Empurrar ou puxar para célula ocupada ou fora da grade:** o movimento é **barrado**, mas o resto da skill acontece
  (D44). Por isso o resultado é `BLOCKED`, não erro.
- **Resistência da Vontade** (11.9): o empurrar e o puxar passam pela mesma forma da chance de status,
  `base × 2 × Precisão / (Precisão + Vontade)`, entre 30% e 90%.
- **Base do reposicionamento forçado: 80%** (D111, `FORCED_MOVE_BASE_CHANCE`), a mesma dos status de controle Preso e
  Travado (12.4). Vale para empurrar, puxar e trocar inimigos.
- **Trocar inimigos (D111):** bagunça a formação inimiga (ex.: traz um frágil para a frente). A ação de skill guarda a
  segunda célula em `swapWith`. Os dois precisam ser adjacentes e nenhum pode estar Preso; senão é barrado e o resto da
  skill acontece (D44).

**Exemplo** (grade de um lado):

```
            coluna 0   coluna 1   coluna 2
  linha 0      A          B          .
  linha 1      .          C          .
  linha 2      D          .          .
```

| Ação | Resultado |
|---|---|
| A move para 1:0 | ok (adjacente e vazia) |
| A move para 0:1 | inválido (B está lá) |
| Empurrar B | B vai para 0:2 |
| Empurrar A | **barrado** (B atrás); o dano da skill acontece igual |
| Puxar C | C vem para 1:0 |
| Trocar B com C | B vai para 1:1 e C para 0:1 (C passa a ser o exposto da linha 0) |
| Guardião em 0:0, golpe à distância em B (0:1) | o Guardião recebe (1ª vez na rodada) |
| Guardião em 0:0, golpe em linha na linha 0 | não intercepta (área) |

### 3.9 Exaustão e fim da batalha

Funções em `src/domain/combat/services/battle-end.ts` (11.8, 12.5, D31, D72, `pvp_brief.md` 6).

**Exaustão** (pressão contra o turtling, só depois do tempo normal; não pesa para o iniciante):

```
passo = rodada − 15   (0 até a rodada 15; D119, era 20)
cura × (1 − 0,10 × passo)      dano × (1 + 0,05 × passo)
```

| Rodada | Cura (e escudo concedido) | Dano |
|---|---|---|
| até 15 | 100% | 100% |
| 16 | 90% | 105% |
| 20 | 50% | 125% |
| 25 | **0%** | 150% |
| 30 | 0% | **175%** |

**Por que a 16 (D119):** com a Exaustão na 21, só 27% das batalhas acabavam por eliminação (simulação, 3.14); a
batalha virava tanque contra tanque com o Desgaste no piso. Junto com o piso de potência de 70% (3.5), sobe para ~68%.

O multiplicador de dano entra nos "modificadores de dano" da ordem do D68 (3.4); o de cura multiplica o `healAmount`.

**Fim da batalha:**

- **Eliminação** (`checkElimination`): o lado sem ninguém vivo perde. Se os dois zerarem no mesmo evento (raro), desempata
  como o fim forçado.
- **Fim forçado** (`isForcedEnd` e `forcedEnd`): quando a **rodada 30 fecha** (D106), vence quem tem **mais % de HP
  total**; empate, o de **menor Desgaste** acumulado; empate ainda, a **seed**. Sempre há vencedor.

**Como cada critério é medido** (leitura do D72):
- **% de HP total** = HP atual somado ÷ **HP máximo do início da batalha** somado (derrotado conta 0). Usar o máximo do
  início evita que quem perdeu HP máximo pela Fundamental ganhe vantagem na conta.
- **Desgaste acumulado** = soma das frações perdidas de cada stat de cada unidade (`DesgasteState.totalFraction`; ex.: 10%
  de Defesa + 5% de Precisão = 0,15). O dano em si do Elemental já entra no HP.

**Exemplo** (fim forçado, 4 contra 4, HP máximo de 500 cada):

| Lado | HP no fim | % de HP total | Desgaste | Resultado |
|---|---|---|---|---|
| Jogador | 250, 0, 0, 0 | 12,5% | 0,40 | **vence** (mais HP) |
| Máquina | 100, 100, 0, 0 | 10% | 0,10 | |

Se os dois tivessem 10%, venceria a máquina, que tem menos Desgaste.

### 3.10 Resolução do turno (o motor)

`BattleEngine` (`src/domain/combat/engine/battle-engine.ts`) junta todas as peças e roda a batalha. Recebe o **snapshot**
(3.2) e a **`Rng` da seed**; não acessa banco nem relógio. **Mesmo snapshot + mesma seed + mesmas ações = mesmos
eventos** (D8): é o que permite o servidor ser a autoridade (D9) e o replay.

**Como usar:**

```ts
const engine = new BattleEngine(battle.snapshot, new SeededRng(battle.seed))

for (let turn = engine.nextTurn(); turn; turn = engine.nextTurn()) {
  const payload = await decide(turn) // jogador (pela API) ou IA da máquina
  const result = engine.act(payload) // left(InvalidActionError) se a ação for inválida: nada muda, a vez continua
  if (result.isRight()) battle.recordAction({ round: turn.round, side: turn.side, actorRef: turn.ref, payload })
}

engine.outcome // { winner, reason }
engine.events // o que aconteceu, em ordem (para o front e para conferir o replay)
```

**No início** cada unidade tem os stats de fora da batalha (3.1), HP cheio, sem escudo, todas as skills prontas. A ordem
dos Guardiões de cada lado é sorteada pela seed (D102).

**`nextTurn()`** avança a fila (3.3) até alguém precisar decidir, resolvendo sozinho o início do turno:
1. dano contínuo (pode derrotar a unidade);
2. **Atordoado** ou **troca com aliado no turno anterior** (D42): perde a ação; o turno conta para a recarga.

**`act(payload)`** executa a ação da vez:

| Ação | O que faz |
|---|---|
| `SKILL` | resolve a skill (abaixo) |
| `MOVE` | move para célula adjacente e vazia (3.8) |
| `SWAP` | troca com um aliado; **o aliado perde a próxima ação** (D42) |
| `DEFEND` | +50% de Defesa e alívio de 10% (3.8) |

**Resolução de uma skill:**
1. Valida: skill na build e pronta (recarga), lado alvo certo, alvo válido (3.6).
2. **Potência** pela folga do Desgaste, calculada antes (3.5).
3. **Interceptar** (golpe de alvo único: o Guardião adjacente recebe no lugar, 3.8).
4. Para cada atingido: **teste de acerto** (3.4; skill de aliado ou si mesmo não testa). Errou: segue para o próximo.
5. Efeitos em quem foi atingido:
   - **dano:** Poder (com aprimoramento) × potência → `Poder × Ataque² / (Ataque + Defesa)` × queda × Exaustão × Marcado ×
     traço de dano pelo alcance → escudo → HP (ordem do D68);
   - **cura e escudo:** 10% do HP máximo por Poder × potência × Exaustão; a cura não passa do máximo e alivia 20% do Desgaste;
   - **buff e debuff:** magnitude × potência (3.7);
   - **status:** teste contra a Vontade só se for hostil; Travado vai para a skill mais forte pronta (D110);
   - **reposicionamento:** empurrar, puxar e trocar inimigos com resistência da Vontade (D111); avançar e mover aliado
     usam `moveTo`;
   - **adiantar/atrasar a vez:** na fila; o atrasado fica imune a novo atraso até agir (D102).
6. Efeitos com `appliesTo: SELF` em quem usou, uma vez.
7. **Desgaste** só se acertou alguém (ou não tinha teste); o dano em si do Elemental sai do HP; HP cortado ao novo máximo da
   Fundamental.
8. **Recarga** sempre, mesmo errando.

**Depois de cada ação:** recalcula as Velocidades (buffs e debuffs mudam a fila), confere a **eliminação** e, quando a
rodada 30 fecha, o **fim forçado** (3.9). Derrotado sai da fila e da grade (deixa de bloquear).

**Eventos (`BattleEvent`, `src/domain/combat/engine/battle-events.ts`):** `TURN`, `SKIP`, `DOT`, `SKILL`, `INTERCEPT`,
`MISS`, `DAMAGE`, `HEAL`, `SHIELD`, `MODIFIER`, `STATUS`, `LOCK`, `MOVE`, `MOVE_BLOCKED`, `TURN_SHIFT`, `DESGASTE`,
`DEFEND`, `PASSIVE`, `FIELD`, `DEFEATED`, `BATTLE_END`. Não vão para o banco: o banco guarda só as ações (3.11 do
`data_model.md`), e os eventos são reproduzidos.

**Conferido** (squad de teste: 8 Vanguardas no nível 15, só a skill básica, seed 1): 8 turnos por rodada enquanto todos
vivem, dano médio de **5,2% do HP** (o que a tabela do `classes_brief.md` 4 prevê para Vanguarda contra Vanguarda com
Poder 0,8), 6 derrotados e fim forçado na rodada 30 com 1 contra 1. É o confronto mais lento possível; com squads
variados o dano de referência é o dobro (D68).

**Ainda não entra no motor:**
- Equipamento vivo, contratos, DOM e despertar com efeito próprio (camadas pós-MVP).


### 3.11 Passivas dos personagens

Cada personagem tem **uma passiva**, fixa no modelo (D78, D83, `data_model.md` 3.3), com **gatilho** e **efeitos**. O
motor (3.10) executa as passivas durante a batalha. Elas ficam no `BattleEngine` (métodos `firePassive`,
`applyPassiveEffect` e os de leitura contínua).

**Dois tipos de gatilho:**

| Tipo | Gatilhos | Como funciona |
|---|---|---|
| **Contínuo** | `ALWAYS` (permanente), `HP_BELOW` (condicional) | lido na hora de cada cálculo: enquanto vale, o efeito está ligado |
| **Evento** | `TURN_START`, `PERIODIC`, `ON_ATTACK`, `ON_HIT`, `ON_KILL`, `ON_HEAL`, `ON_DESGASTE`, `ON_STATUS` | dispara uma vez quando o evento acontece |

**Quando cada evento dispara:**

| Gatilho | Momento |
|---|---|
| `TURN_START` | início de cada turno do dono (depois do dano contínuo; vale mesmo se ele estiver Atordoado) |
| `PERIODIC` (N) | a cada N turnos começados do dono (o 3º, o 6º...) |
| `ON_ATTACK` | o dono causou dano a pelo menos um inimigo com a skill (uma vez por ação) |
| `ON_HIT` | o dono levou dano de um inimigo e continua vivo |
| `ON_KILL` | o dono derrotou um inimigo com a skill |
| `ON_HEAL` | o dono curou alguém (cura maior que zero) |
| `ON_DESGASTE` | o dono pagou Desgaste |
| `ON_STATUS` (status) | o dono recebeu aquele status (aplicado ou renovado) |
| `ON_FIELD_CHANGE` | o campo mudou (troca por skill ou volta ao inicial), para todas as unidades vivas (3.12) |

**Efeitos:**

| Efeito | No contínuo | No evento |
|---|---|---|
| `IGNORE_SHIELD` | o dano do dono ignora escudos (ex.: Ecko) | |
| `REDUCE_DAMAGE` | o dono recebe X% menos dano (entra nos modificadores de dano, antes do escudo) | |
| `STAT_MODIFIER` | só no `HP_BELOW`: multiplica o stat enquanto o HP estiver baixo | buff no dono até o fim do próximo turno dele |
| `REDUCE_COOLDOWN` | | tira N das recargas em andamento do dono (ex.: Lucky) |
| `HEAL` | | cura X% do HP máximo do dono (com a Exaustão) |
| `ADVANCE_TURN` | | adianta a vez do dono em X% |
| `APPLY_STATUS` | | aplica o status no dono, no atacante ou no alvo, com a duração padrão (12.4) |

**Regras de funcionamento (D113):** o D83 define o formato; o D113 fixa o momento de cada efeito:

1. **Status de passiva em inimigo passa pela Vontade:** a `chance` da passiva vira a base da disputa
   `chance × 2 × Precisão / (Precisão + Vontade)` (teto de 90%), como qualquer status hostil (11.9). Em aliado ou em si
   mesmo, vale a chance direta.
2. **`ON_ATTACK` dispara uma vez por ação**, mesmo numa skill de área; o "alvo" é o primeiro inimigo que levou dano.
3. **Buff de passiva num evento** dura **até o fim do próximo turno do dono** (senão um buff ganho no próprio turno
   acabaria antes de ele agir de novo). Conta no limite de 2 fontes, com a fonte `PASSIVE:<unidade>` (a mesma passiva
   renova, não soma).
4. **Stat de passiva condicional (`HP_BELOW`)** é um multiplicador à parte, ligado enquanto o HP estiver baixo, **fora**
   do limite de fontes.
5. **`ALWAYS` com `STAT_MODIFIER` não faz nada:** o D83 proíbe aumento de status puro e permanente.
6. **Passiva não dispara passiva:** efeito vindo de uma passiva nunca aciona outra (evita cadeias infinitas, como dois
   personagens que respondem a status um do outro).

**Exemplos** (os do `progression_brief.md` 2.2 e do `data_model.md` 3.3):

| Personagem | Passiva | No motor |
|---|---|---|
| Ecko | `ALWAYS` → `IGNORE_SHIELD` | todo dano dele ignora escudo |
| Lucky | `PERIODIC` 3 → `REDUCE_COOLDOWN` 1 | no 3º, 6º, 9º... turno dele, as recargas em andamento baixam 1 |
| Kael (Brasa interna) | `ON_HIT` → `APPLY_STATUS` DOT no atacante, 20% | ao levar dano, chance de queimar quem bateu (contra a Vontade dele) |
| Recruta (Firmeza) | `HP_BELOW` 30 → `REDUCE_DAMAGE` 10 | abaixo de 30% do HP, recebe 10% menos dano |

### 3.12 Campo de batalha

O campo dá um bônus de status, **nos dois lados**, a quem tem **qualquer um** dos traços pedidos (D28, D40, D98). O
catálogo é do admin (`data_model.md` 3.12); no motor, o campo vem no snapshot como valor.

**Sorteio do campo inicial (D112)** (`drawInitialField`, `src/domain/combat/services/field-draw.ts`): pela seed, entre
**todos** os campos do catálogo, **antes** de os jogadores escolherem a squad. O campo é a primeira coisa mostrada, para
cada um planejar a squad em cima dele (`pvp_brief.md` 3). Catálogo vazio: batalha sem campo.

O D98 previa um "sorteio justo" (diferença de no máximo 2 qualificados entre as squads), mas ele só funciona depois de
escolhidas as squads. Como o campo vem antes, essa regra saiu (D112): adaptar a squad ao campo é parte do jogo.

**Bônus** (no cálculo de cada stat): `+6%` no stat principal e `+4%` no secundário (padrão do D98), **fora do limite de 2
fontes** (é ambiental). Só para quem qualifica, nos dois lados.

**Troca por skill** (efeito `CHANGE_FIELD`, com `duration` e `multiplier` da skill, 12.7 do `skills_brief.md`):

- Quem usa **escolhe o campo** do catálogo da batalha (`fieldKey` na ação). Campo fora do catálogo: ação inválida.
- O bônus vem **multiplicado** (×1,0, ×1,25 ou ×1,5 pelo tipo da skill): na Forte, +9% e +6%.
- **Duração em rodadas:** vale até o fim da rodada atual **mais N rodadas**. Usada na rodada 5 com N = 2, vale no resto da
  5, na 6 e na 7; volta ao inicial na 8.
- **Uma troca ativa por vez:** a nova substitui a anterior. Ao fim, volta ao **campo inicial**.
- Toda mudança de campo dispara as passivas `ON_FIELD_CHANGE` (3.11) e gera o evento `FIELD`.

**Evento `FIELD`:** `fieldKey` (o campo que passou a valer, ou nulo), `ref` (quem trocou; nulo = início ou volta ao
inicial) e `untilRound` (última rodada da troca). O primeiro evento da batalha é sempre o campo inicial (D28).

**Exemplo:** campo inicial **Arena** (+6% Ataque, +4% Velocidade para guerreiros). Na rodada 5, o Tático usa uma troca
**Forte** para a **Floresta** (+6% Esquiva, +4% Precisão para furtivos): nas rodadas 5 a 7 os furtivos dos dois lados têm
+9% de Esquiva e +6% de Precisão, e os guerreiros perdem o bônus da Arena. Na rodada 8 volta a Arena.

**Fica para depois:** a fraqueza de luz da família Hyperion (campo "iluminado" reduz o bônus de Origem, D101) é dado do
admin e entra quando houver campos iluminados no catálogo.

### 3.13 IA da máquina

Código: `src/domain/ai/` (`machine-ai.ts`, `ai-values.ts`, `services/`). Regras em `pvp_brief.md` 8 e 10 (D90, D103).

**Uso:** `new MachineAi({ side, profile, difficulty }, aiRng(seed, side))`; a cada vez da máquina,
`ai.decide(engine, ref)` devolve a ação (e, para o simulador, a nota de cada candidata).

**Sorte própria.** A IA usa uma `Rng` **separada** da do motor, derivada da mesma seed (`aiRng`). O replay só reaplica
as ações gravadas e não roda a IA; se ela usasse a `Rng` do motor, consumiria números que o replay não consome e a
batalha reproduzida sairia diferente. Continua determinística (D90): mesma seed, mesmas decisões.

**Passo a passo de cada decisão:**

1. **Gerar as ações legais** (`generateCandidates`): cada skill pronta em cada célula que dá um conjunto diferente de
   alvos, com as escolhas extras (com quem trocar o inimigo, para onde avançar ou mover o aliado, qual campo); mover para
   célula adjacente vazia; trocar com um aliado; Defender (sempre existe).
2. **Prévia** (`engine.previewSkill`): o motor calcula o que a skill faria em cada alvo (chance de acerto, dano, cura,
   escudo, chance de status, buff, atraso), **sem mudar nada e sem usar a Rng**. É a mesma conta da ação de verdade.
   Não prevê o Interceptar.
3. **Fatores** (`scoreFactors`, 10.1), em "% de HP equivalente ÷ 25", teto 1:
   - **Dano:** chance × dano (limitado à vida + escudo do alvo) em % do HP máximo, somando os alvos.
   - **Abate:** (dano esperado ÷ vida + escudo)², somando os alvos, teto 1.
   - **Ameaça:** (Ataque × Velocidade) do alvo ÷ o maior entre os inimigos, × chance de acerto; o maior entre os alvos.
   - **Risco** (subtrai): 50% × (custo do Desgaste ÷ folga, teto 1) + 50% × "HP baixo e ação ofensiva", + 0,10 da skill
     forte (abaixo).
   - **Defesa/cura/status:** tabela do 10.1 (cura e escudo × (1 + o que falta de vida); status × chance; buff/debuff 0,3
     por ponto; adiantar/atrasar X% × 11; Defender 4; mover/trocar 2).
   - **Situação:** `s × abate − s × defesa`, com `s` = HP% aliado − HP% inimigo.
4. **Nota** = soma ponderada pelo perfil, **só dos fatores que o nível enxerga** (os outros valem 0).
5. **Normaliza** (min-max), soma o **bônus de proteção** do log, **corta** abaixo de 0,2 e **sorteia** com
   `p ∝ exp(nota' / T)` (Grão-mestre: sempre a melhor, desempate pela Rng). O sorteio usa sempre um número só da Rng.

**Log do jogador** (`PlayerLog`, 10.2): lê os eventos do motor (só o que aconteceu à vista): alvo atingido por dano,
skill usada, Defender e movimento. O personagem focado é o mais atacado na janela (pesos 1,0 a 0,2); o bônus sai dos
ataques **seguidos** nele (2 = +0,15, 3 = +0,30), × escala do nível. Ações que protegem o focado: cura, escudo ou buff
nele, ele Defender, se mover ou trocar de lugar. Mestre e Grão-mestre lembram as skills **já vistas** do jogador.

**Exemplo:** o jogador atacou a Tanque da máquina 3 vezes seguidas. No turno da Tanque, Grão-mestre: Defender tinha
nota' 0,08; com o padrão confirmado, +0,30 × 1,0 = 0,38, e passa do corte. No Iniciante (não lê o log), continua 0,08 e
nunca é sorteado.

**Pontos que o `pvp_brief.md` não fixava (D114):**

| # | Ponto | Proposta |
|---|---|---|
| 1 | "HP baixo" do Risco | Começa abaixo de **50%** do HP e sobe em linha até 1 com HP zero |
| 2 | Leitura do Intermediário ("última ação") | Janela de **1**: o último ataque já é indício; escala **×0,25** (+0,04) |
| 3 | Valor de **trocar o campo** | Mudança do bônus (pontos %) dos aliados − a dos inimigos, × **0,3** por ponto (como buff) |
| 4 | Empurrar, puxar e trocar inimigo | Valor de mover (**2**) × chance contra a Vontade |
| 5 | Onde entra o bônus do log | **Depois** da normalização (soma na nota', antes do corte) |
| 6 | "Skill forte" e "exposto" do +0,10 | Forte, Final ou despertada, já vista e pronta; exposto = frente da linha ou com Exposto; vale só para ação de skill (mover, trocar e Defender tiram o risco) |
| 7 | Ameaça | Multiplicada pela chance de acerto no alvo |

### 3.14 Simulador IA contra IA (calibração)

Código: `src/domain/ai/simulation/` (`simulateBattle`, `runMatchup`), script `scripts/calibrate.sim.ts`, squad
`test/factories/make-calibration-snapshot.ts`.

- **`simulateBattle(snapshot, seed, setups)`:** uma batalha inteira IA contra IA. Devolve vencedor, motivo, rodada e as
  ações no formato do log (`BattleActionRecord`), então a batalha simulada pode ser reproduzida pelo replay.
- **`runMatchup`:** o mesmo confronto em N seeds, **trocando de lado a cada batalha** (A é PLAYER nas pares e OPPONENT
  nas ímpares), para tirar a vantagem de lado da medida.
- **Squad de calibração:** espelhada (os dois lados iguais, como pede o 10.4), nível 50: Guardião e Vanguarda na frente,
  Atirador e Suporte atrás. Cobre dano único, linha, atordoar, marcar, veneno, cura, escudo e buffs, com os valores do
  `skills_brief.md` 12. Quando o `seed.ts` existir, a calibração passa a usar as squads de NPC de verdade.

**Rodar:** `npm run simulate` (fora do `npm test`, leva alguns minutos). Variáveis: `SIM_BATTLES` (padrão 100),
`SIM_LEVEL` (padrão 50), `SIM_SECTIONS` (`mirror,gap1,gap2,gap4,profiles`) e `SIM_OVERRIDES` (JSON com pesos ou regras
de nível, para testar valores sem mudar o código).


**Primeira rodada (2026-10-19, 100 batalhas por confronto, valores do D90/D103/D114):**

| Confronto (A x B) | A vence | Meta |
|---|---|---|
| Equilibrado Mestre x ele mesmo | 48% | ~50% |
| Intermediário x Iniciante | 82% | ~65% |
| Avançado x Intermediário | 89% | ~65% |
| Mestre x Avançado | 100% | ~65% |
| Grão-mestre x Mestre | 73% | ~65% |
| Dois e quatro níveis acima | 98% a 100% | ~80% / ≥95% |
| Agressivo x Cauteloso (Mestre) | 1% | 45–55% |
| Agressivo x Focado em abater | 38% | 45–55% |
| Agressivo x Equilibrado | 9% | 45–55% |
| Cauteloso x Focado em abater | 99% | 45–55% |
| Cauteloso x Equilibrado | 75% | 45–55% |
| Focado em abater x Equilibrado | 14% | 45–55% |

Leitura: o lado e o sorteio estão neutros (espelho 48%). A escada de níveis está **íngreme demais**, e o maior salto é
Avançado → Mestre, o primeiro nível que enxerga **defesa/cura/status**. Entre os perfis, **quem cura mais vence**
(Cauteloso, peso 1,0 em defesa/cura/status).

**Experimentos (não aplicados, aguardam decisão):**
- **E1:** todos os níveis enxergam defesa/cura/status. Avançado x Intermediário caiu para 68% (na meta), mas Mestre x
  Avançado continua 97% e o Intermediário passou a **perder** do Iniciante (26%): com a cura visível, o fator **Ameaça**
  (que só o Intermediário em diante enxerga) parece atrapalhar.
- **E2:** pesos de defesa/cura/status mais próximos (Agressivo 0,4, Cauteloso 0,8, Focado 0,45). Melhora (Cauteloso x
  Equilibrado 57%), mas Agressivo e Focado ainda perdem muito (11% a 42%).

**Ressalva:** é uma squad só (com Suporte e Guardião, então cura e escudo pesam muito). A calibração final precisa das
squads do `seed.ts`, senão os pesos ficam ajustados para essa composição.

**Segunda rodada: squads do seed (2026-10-19, 4 composições espelhadas no nível 58, 100 batalhas por confronto):**

| Confronto (A x B) | Valores atuais | E1 | E1 + Risco pela metade | Meta |
|---|---|---|---|---|
| Espelho (Mestre) | 47% | | 51% | ~50% |
| Intermediário x Iniciante | 48% | 63% | 63% | ~65% |
| Avançado x Intermediário | 51% | 44% | 58% | ~65% |
| Mestre x Avançado | 93% | 87% | 89% | ~65% |
| Grão-mestre x Mestre | 71% | 71% | 65% | ~65% |
| Avançado x Iniciante | 64% | 49% | 70% | ~80% |
| Mestre x Intermediário | 95% | 68% | 94% | ~80% |
| Grão-mestre x Avançado | 94% | 95% | 91% | ~80% |
| Perfis (Mestre), faixa | 37% a 59% | | 30% a 75% | 45–55% |

Leitura:
- Com squads variadas, os **perfis ficam quase na meta** (na squad de calibração, quem curava vencia por 99%).
- **Cura/escudo/status invisível até o Avançado** achata os três primeiros níveis. Com E1, o Intermediário vence o
  Iniciante em 63%.
- O **Risco** como está piora a IA: o Avançado só com E1 (vendo Risco) perde do Intermediário (44%); **sem Risco**, vence
  com 76%. Pela metade, 58%.
- O salto que sobra é **Avançado → Mestre** (~90%): o Mestre ganha a Situação e a temperatura cai de 0,25 para 0,1.
  Próximo experimento.

**Aplicado (D115):** E1 (todos os níveis enxergam defesa/cura/status) e Risco pela metade. Os valores atuais do código
são os da coluna "E1 + Risco pela metade".

**Terceira rodada: o salto do Mestre (com o D115 aplicado, squads do seed, 100 batalhas por confronto):**

- **X1, Mestre com T = 0,25 (a do Avançado):** Mestre x Avançado cai de 89% para **45%**; Grão-mestre x Mestre sobe para 92%.
- **X2, Mestre sem a Situação:** Mestre x Avançado continua 89%.
- Conclusão: **a temperatura é o que separa os níveis**; os fatores a mais quase não pesam.

**Escada de temperatura aplicada (D117):** 0,6 / 0,35 / 0,18 / 0,1 / 0.

| Confronto | A vence | Meta |
|---|---|---|
| Espelho (Mestre) | 51% | ~50% |
| Intermediário x Iniciante | 63% | ~65% |
| Avançado x Intermediário | 70% | ~65% |
| Mestre x Avançado | 72% | ~65% |
| Grão-mestre x Mestre | 65% | ~65% |
| Avançado x Iniciante | 68% | ~80% |
| Mestre x Intermediário | 93% | ~80% |
| Grão-mestre x Avançado | 82% | ~80% |
| Grão-mestre x Iniciante | 91% | ≥95% |

**Calibração completa com o D117 (100 batalhas por confronto):** a escada de níveis é a da tabela acima (sem erro de
timeout). Perfis no Mestre (não mudam com o D117, a temperatura do Mestre é a mesma):

| Confronto (Mestre) | A vence | Meta |
|---|---|---|
| Agressivo x Cauteloso | 36% | 45–55% |
| Agressivo x Focado em abater | 52% | 45–55% |
| Agressivo x Equilibrado | 41% | 45–55% |
| Cauteloso x Focado em abater | 75% | 45–55% |
| Cauteloso x Equilibrado | 63% | 45–55% |
| Focado em abater x Equilibrado | 30% | 45–55% |

Pendente: o **Cauteloso** está forte demais e o **Focado em abater** fraco demais (pesos dos perfis). Sinal de design:
só **~30% das batalhas acabam por eliminação**; o resto vai ao fim forçado da rodada 30.

**Pesos dos perfis, experimentos (Mestre, 100 batalhas por confronto):**

| Confronto | Atual | P1 | P2 | Meta |
|---|---|---|---|---|
| Agressivo x Cauteloso | 36% | 40% | 58% | 45–55% |
| Agressivo x Focado em abater | 52% | 38% | 47% | 45–55% |
| Agressivo x Equilibrado | 41% | 41% | 43% | 45–55% |
| Cauteloso x Focado em abater | 75% | 64% | 48% | 45–55% |
| Cauteloso x Equilibrado | 63% | 52% | 50% | 45–55% |
| Focado em abater x Equilibrado | 30% | 45% | 50% | 45–55% |

- **P1:** defesa/cura/status do Cauteloso 0,8 e do Focado 0,45.
- **P2:** defesa/cura/status do Cauteloso 0,7, do Focado 0,5 e do Agressivo 0,35; dano do Focado 0,8.

Com 100 batalhas, a margem de ruído é de ~±5 pontos: o P2 fica todo dentro de 43% a 58%. **Aplicado (D118).**

**Confirmação com D115 a D118 no código (2026-10-19):** escada de níveis igual à da tabela do D117 (o Equilibrado não
mudou) e perfis entre 43% e 58%, iguais ao P2. Relatório sem erro de timeout. **Calibração da IA fechada para o MVP**;
reabrir quando houver mais personagens ou jogo humano.

**Calibração depois do D119 (Exaustão na 16, piso de potência 70%; 100 batalhas por confronto):**

| Confronto | A vence | Meta | Eliminação |
|---|---|---|---|
| Espelho (Mestre) | 55% | ~50% | 61% |
| Intermediário x Iniciante | 68% | ~65% | 61% |
| Avançado x Intermediário | **86%** | ~65% | 71% |
| Mestre x Avançado | 71% | ~65% | 66% |
| Grão-mestre x Mestre | **51%** | ~65% | 67% |
| Dois níveis acima | 83% a 94% | ~80% | 63% a 72% |
| Grão-mestre x Iniciante | 100% | ≥95% | 71% |
| Perfis (Mestre) | 41% a 57% | 45–55% | 58% a 75% |

A eliminação subiu para **58% a 75%** (meta 60–70%). Os perfis seguem perto da meta. A escada de níveis desalinhou: o
Avançado ficou forte demais contra o Intermediário e o Grão-mestre não ganha mais do Mestre. **Pendente:** reajustar as
temperaturas (Intermediário e Mestre) com as regras novas.
