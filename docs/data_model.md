# ORIGIN — Modelo de dados

> Referência das tabelas do Prisma (`prisma/schema.prisma`) e das entidades de domínio que as espelham.
> Cada modelo entra **um por vez**, documentado aqui antes de seguir para o próximo.
> Regras do jogo em [`game_design.md`](./game_design.md); este doc só descreve **como os dados são guardados**.

---

## 1. Convenções

- **Id:** `uuid` (`@default(uuid())`). No domínio, `UniqueEntityId`.
- **Nomes:** campos em camelCase no Prisma, mapeados para snake_case no banco (`@map`); tabelas no plural
  (`@@map("variants")`). Mesmo padrão do ZapWave.
- **Datas:** `createdAt` e `updatedAt` em toda tabela.
- **Chave de catálogo:** dados do admin têm um `key` único e estável (ex.: `fire`), usado pelo código e pelo
  `seed.ts`. O `id` é interno; o `key` é o que se referencia em seed e testes.
- **Enums do banco espelhados no domínio:** o domínio não importa Prisma (regra do ESLint). Cada enum existe nos
  dois lados com os mesmos valores (ex.: `Lineage` em `src/domain/characters/enums/lineage.ts`).
- **Regras de negócio ficam no domínio**, não em constraint do banco, quando dependem de lógica (ex.: variante não
  pode ter linhagem `NONE`).
- **Todo modelo documentado tem um exemplo** depois das regras: dados fictícios em tabela e o trecho equivalente
  do `seed.ts`, incluindo um caso **inválido** quando houver regra. Serve de referência para o seed e para quem
  pegar o projeto depois.

### Decisões gerais (aprovadas)

1. **Modelo x instância:** catálogo do admin (o "Yuki Glassier") separado do que é do jogador (a Yuki da conta, com
   nível e build). Vale para personagem e skill.
2. **Batalha guarda seed e ações, não o estado:** o motor é determinístico, então reproduzir a partir disso dá o
   replay. Guarda também um **snapshot dos squads no início** e a **versão do motor e do conteúdo**.
3. **Efeitos em JSON** (de skill e de traço), validados na borda, não em tabelas: o catálogo de efeitos cresce caso
   a caso. **Efeito não é model:** é valor, não entidade. "+5% de Ataque" em dois traços é o mesmo valor, não a mesma
   coisa; dividir uma linha entre eles faria mudar um mudar o outro. Cada tipo tem campos próprios (tabela viraria
   colunas nulas), é sempre lido junto do dono, e o Postgres ainda consulta dentro do JSON. Repetir efeito é normal.
4. **Stats como 7 colunas**, não JSON: são fixos (D45) e consultáveis.

---

## 2. Plano de modelos (MVP)

| # | Modelo | Grupo | Depende de | Estado |
|---|---|---|---|---|
| 1 | `Variant` (+ enum `Lineage`) | Catálogo | nada | **feito** |
| 2 | `Trait` (+ enums `TraitCategory`, `TraitSource`) | Catálogo | Variant (opcional) | **feito** |
| 3 | `CharacterTemplate` (+ `CharacterTemplateVariant` e enums `CharacterClass`, `Rarity`, `DangerLevel`, `Exclusivity`) | Catálogo | Variant, Trait | **feito** |
| 4 | `Skill` (+ enums `SkillTier`, `SkillTarget`, `SkillRange`, `SkillArea`, `SkillKitSlot`) | Catálogo | Variant (opcional) | **feito** |
| 5 | `Account` | Jogador | nada | **feito** |
| 6 | `Character` (+ `CharacterTrait`) | Jogador | Account, CharacterTemplate, Trait, Variant | **feito** |
| 7 | `CharacterSkill` (+ enum `CharacterSkillSource`) | Jogador | Character, Skill | **feito** |
| 8 | `Squad` (+ `SquadMember`) | Jogador | Account, Character | **feito** |
| 9 | `NpcSquad` (+ `NpcSquadMember`, `NpcSquadMemberSkill`, `NpcSquadMemberTrait`, enums `AiProfile`, `AiDifficulty`) | Batalha | CharacterTemplate, Skill, Trait, Variant | **feito** |
| 10 | `Battle` (+ enums `BattleMode`, `BattleStatus`, `BattleSide`, `BattleEndReason`) | Batalha | Account, Squad, NpcSquad | **feito** |
| 11 | `BattleAction` (+ enum `BattleActionType`) | Batalha | Battle | **feito** |
| 12 | `BattleField` (+ `BattleFieldTrait` e enum `Stat`) | Catálogo | Trait | **feito** |
| 13 | `Wallet` + `WalletEntry` (enum `WalletReason`) e `Chest` (enum `ChestSource`) | Economia | Account, Battle | **feito** (D150, 3.13) |
| 14 | `Awakening` (+ colunas do despertar em `Character` e enum `SkillOfferSource`) | Catálogo | Variant | **feito** (D151, 3.14) |
| 15 | Coluna `dom` em `Character` (DOM: níveis e janela de feitos) | Jogador | Character | **feito** (D152, 3.15) |

**Fora do MVP** (cada um vira migração própria quando a camada chegar): inventário, equipamento vivo, bestas,
mercado e organizações.

---

## 3. Modelos

### 3.1 Variant (catálogo)

Variante do poder (ex.: fogo, gelo, raio). Define a **linhagem**, que decide o stat do Desgaste (D59), a
ressonância (D97) e o tipo de fragmento (D104).

**Enum `Lineage`:** `FUNDAMENTAL`, `ELEMENTAL`, `MATERIAL`, `VECTORIAL`, `PSYCHIC`, `BIOLOGICAL`, `NONE`.

| Campo | Tipo | Regra |
|---|---|---|
| `id` | uuid | |
| `key` | texto, **único** | estável (ex.: `fire`) |
| `name` | texto | nome exibido (ex.: "Fogo") |
| `lineage` | `Lineage` | **nunca `NONE`** (validado no domínio: `InvalidVariantLineageError`) |
| `description` | texto, opcional | lore curta |
| `awakensFromId` | FK opcional → `Variant` (ela mesma) | **preenchido = variante despertada** (D67) |
| `createdAt`, `updatedAt` | data | |

**Despertar:** pela lore, o despertar é uma **variante nova** que evolui da base (fogo → fogo azul, plasma). A variante
despertada aponta para a base em `awakensFromId`. A **skill despertada é só uma skill da variante despertada**: não há
campo de despertar na skill, porque isso vem da variante. É o que o motor usa para o Desgaste ×1,5 das despertadas e o
desconto ×0,75 das demais quando houver uma despertada equipada (D96).

- Despertada tem a **mesma linhagem** da base (mesmo Desgaste e fragmento).
- Uma despertada **não pode ser base** de outra (um despertar só, sem estágios, D67).
- Uma base pode ter **várias** despertadas (o sorteio do D96).
- Um **modelo de personagem nunca vem com variante despertada** (3.3): o despertar é conquista da instância.
- O catálogo do despertar (perfil do sorteio e modelos de missão) é o modelo `Awakening` (3.14, D151): uma
  despertada vem de **um** despertar.

**Sem variante (opção A, aprovada):** não existe uma linha "Nenhuma". O personagem sem variante simplesmente **não
tem variante ligada** (zero linhas na ligação com `CharacterTemplate`, 3.3). `NONE` só aparece na **skill none** e no
**Fragmento Neutro**.

- **Por quê:** fiel ao design (sem variante é ausência, 0,4% da população) e a contagem de variantes (1, 2 ou 3) que
  decide a ressonância (D97) e o despertar (só com exatamente 1, D67) fica direta.
- **Não é FK nula:** como um personagem pode ter até 3 variantes (D41), a ligação é uma tabela própria, não uma coluna
  `variantId`.

**Exemplo** (fictício, só para ilustrar; as variantes reais são do admin):

| `key` | `name` | `lineage` | `description` |
|---|---|---|---|
| `fire` | Fogo | `ELEMENTAL` | Controla e gera calor e chamas. |
| `steel` | Aço | `MATERIAL` | Endurece e molda metal. |
| `gravity` | Gravidade | `VECTORIAL` | Altera peso e direção de forças. |
| `telepathy` | Telepatia | `PSYCHIC` | Lê e invade mentes. |
| `regeneration` | Regeneração | `BIOLOGICAL` | Acelera o próprio metabolismo. |
| `antimatter` | Antimatéria | `FUNDAMENTAL` | Apaga matéria. |
| `blue-fire` | Fogo azul | `ELEMENTAL` | Despertar do fogo: chama mais quente. `awakensFromId` = `fire` |

No `seed.ts`:

```ts
Variant.create({
  key: 'fire',
  name: 'Fogo',
  lineage: Lineage.ELEMENTAL,
  description: 'Controla e gera calor e chamas.',
})
// right(Variant)

Variant.create({ key: 'none', name: 'Nenhuma', lineage: Lineage.NONE })
// left(InvalidVariantLineageError): "sem variante" não é uma linha

Variant.create({ key: 'blue-fire', name: 'Fogo azul', lineage: Lineage.ELEMENTAL, awakensFrom: fire })
// right(Variant), isAwakened = true

Variant.create({ key: 'steel-fire', name: 'Fogo de aço', lineage: Lineage.MATERIAL, awakensFrom: fire })
// left(InvalidAwakenedVariantError): a despertada tem a mesma linhagem da base
```

**Domínio:** `src/domain/characters/entities/variant.ts` (`Variant.create` devolve `Either`;
`InvalidAwakenedVariantError` para as regras de despertar).

### 3.2 Trait (catálogo)

Traço do personagem (D27, D39, D47): bônus moderado em status e skills, podendo ter lado negativo. Até **5 por
personagem**, e o **traço de família ocupa 1 dos 5** (D105). O teto de +15% por stat somando traços (D88) é regra do
**personagem**, não do traço.

**Enums:**
- `TraitCategory`: `COMBAT`, `POSTURE`, `ORIGIN`.
- `TraitSource`: `TEMPLATE` (vem no modelo do personagem, ex.: família; **fica na venda**) ou `CONQUERED` (metas do
  histórico e eventos; **se perde na venda**). Enum em vez de booleano para aceitar um terceiro valor no futuro.

| Campo | Tipo | Regra |
|---|---|---|
| `id` | uuid | |
| `key` | texto, **único** | estável (ex.: `berserker`) |
| `name` | texto | |
| `description` | texto, opcional | |
| `category` | `TraitCategory` | `TEMPLATE` é sempre `ORIGIN` |
| `source` | `TraitSource` | |
| `variantId` | FK opcional → `Variant` | o traço só vale para essa variante; quem tem é sempre `TEMPLATE` (família) |
| `effects` | JSON (lista de `TraitEffect`) | pelo menos 1 efeito |
| `createdAt`, `updatedAt` | data | |

**Tipos de efeito** (`src/domain/characters/value-objects/trait-effect.ts`). No banco a coluna é só `Json`; o formato
é garantido pelo tipo do TypeScript e validado na borda ao ler do banco ou do seed. Novo tipo = nova linha no TS, sem
migração.

| `type` | Campos | Uso |
|---|---|---|
| `STAT_MODIFIER` | `stat`, `percent` | +5% de Ataque, −8% de Defesa |
| `SKILL_DAMAGE_MODIFIER` | `range` (`MELEE`, `RANGED`, `PIERCING`, `FLANK`), `percent` | +10% de dano corpo a corpo |
| `LINEAGE_COST_MODIFIER` | `percent` | −10% de Desgaste na própria variante (sangue puro) |
| `GEAR_REQUIREMENT_WAIVER` | `count` | vale 1 requisito no elo (Prodígio) |
| `EXTRA_BEAST_SLOT` | `count` | +1 besta (Domador) |

**Regras (domínio, `InvalidTraitError`):** pelo menos 1 efeito; `TEMPLATE` só em `ORIGIN`; com `variantId`, sempre
`TEMPLATE`.

**Exemplo** (fictício, só para ilustrar; os traços reais são do admin):

| `key` | `category` | `source` | variante | Efeitos |
|---|---|---|---|---|
| `berserker` | `COMBAT` | `CONQUERED` | | +10% dano corpo a corpo · −8% Defesa |
| `martial-artist` | `COMBAT` | `CONQUERED` | | +8% dano corpo a corpo |
| `stealthy` | `POSTURE` | `CONQUERED` | | +6% Esquiva |
| `veteran` | `ORIGIN` | `CONQUERED` | | +3% Vontade · +3% HP |
| `tamer` | `ORIGIN` | `CONQUERED` | | +1 besta |
| `prodigy` | `ORIGIN` | `CONQUERED` | | vale 1 requisito no elo |
| `family-pyranth` | `ORIGIN` | `TEMPLATE` | `fire` | +3% Ataque · +3% HP · −10% Desgaste (sangue puro) |

JSON de `effects` do Berserker e da família Pyranth:

```json
[
  { "type": "SKILL_DAMAGE_MODIFIER", "range": "MELEE", "percent": 10 },
  { "type": "STAT_MODIFIER", "stat": "DEFENSE", "percent": -8 }
]
```

```json
[
  { "type": "STAT_MODIFIER", "stat": "ATTACK", "percent": 3 },
  { "type": "STAT_MODIFIER", "stat": "HP", "percent": 3 },
  { "type": "LINEAGE_COST_MODIFIER", "percent": -10 }
]
```

No `seed.ts`:

```ts
Trait.create({
  key: 'family-pyranth',
  name: 'Família Pyranth',
  category: TraitCategory.ORIGIN,
  source: TraitSource.TEMPLATE,
  variantId: fire.id,
  effects: [
    { type: 'STAT_MODIFIER', stat: Stat.ATTACK, percent: 3 },
    { type: 'STAT_MODIFIER', stat: Stat.HP, percent: 3 },
    { type: 'LINEAGE_COST_MODIFIER', percent: -10 },
  ],
})
// right(Trait)

Trait.create({
  key: 'born-warrior',
  name: 'Guerreiro nato',
  category: TraitCategory.COMBAT,
  source: TraitSource.TEMPLATE,
  effects: [{ type: 'STAT_MODIFIER', stat: Stat.ATTACK, percent: 5 }],
})
// left(InvalidTraitError): traço TEMPLATE é sempre da categoria ORIGIN
```

**Domínio:** `src/domain/characters/entities/trait.ts` (`Trait.create` devolve `Either`).

### 3.3 CharacterTemplate (catálogo)

O **modelo** de personagem: o "Kael Pyranth" igual para todos os jogadores. Tudo o que muda por jogador (nível, XP,
pontos livres, traços conquistados, skills, build) mora na instância, `Character` (modelo nº 6).

**Enums:**
- `CharacterClass`: `VANGUARD`, `MARKSMAN`, `EXECUTOR`, `CONTROLLER`, `SUPPORT`, `ARTILLERY`, `GUARDIAN`, `TACTICIAN`.
- `Rarity`: `E`, `D`, `C`, `B`, `A`, `S`, `SS` (dificuldade de obter, D86).
- `DangerLevel`: `DISCRETE`, `CONTINUOUS`, `DIFFERENTIABLE`, `NON_LINEAR`, `CHAOTIC` (periculosidade inicial, D86).
- `Exclusivity`: `NONE`, `EVENT`, `RANKING` (D82).

| Campo | Tipo | Regra |
|---|---|---|
| `id` | uuid | |
| `key` | texto, **único** | estável (ex.: `kael-pyranth`) |
| `name`, `description` | texto | |
| `characterClass` | `CharacterClass` | |
| `rarity` | `Rarity` | |
| `initialDanger` | `DangerLevel` | |
| `exclusivity` | `Exclusivity` | padrão `NONE` |
| `isStarter` | booleano | padrão falso; **inicial**: a conta nova recebe um de cada (D133, D150). Os outros só saem de baú |
| `familyTraitId` | FK opcional → `Trait` | o traço precisa ser `TEMPLATE`; se ligado a uma variante, o modelo precisa tê-la |
| `hp`, `attack`, `defense`, `speed`, `precision`, `evasion`, `will` | inteiros | **perfil no nível 100**; maiores que zero; orçamento dentro de ±3% da classe |
| `passive` | JSON (`Passive`) | obrigatória, com pelo menos 1 efeito |
| `createdAt`, `updatedAt` | data | |

**Ligação `CharacterTemplateVariant`** (chave composta `templateId` + `variantId`):

| Campo | Regra |
|---|---|
| `templateId`, `variantId` | par único; de 0 a 3 por modelo; sem variante = nenhuma linha; nunca variante despertada |
| `isPrimary` | exatamente uma principal quando houver variante (decide a divisão do kit 2/1/1, D97) |

**Como os stats são usados:** o perfil guardado já inclui a distribuição padrão dos pontos livres (igual à tabela das
classes). O motor deriva: **base** = 85% do perfil (cresce de 34% no nível 0 até 100%, D91); **pontos livres** = os
outros 15%, que o jogador redistribui; **tetos** = perfil × 1,25 nos picos da classe (×1,15 em Ataque e Velocidade) e
×1,10 nos demais. **Orçamento** = HP/5 + os outros 6 stats; por classe (`classes_brief.md` 2), com tolerância de ±3% para o
admin ajustar por personagem.

**Onde ficam os traços do personagem:** o modelo só guarda o **traço de família** (fixo para todos). Os traços
**conquistados** são de cada instância e moram na ligação `CharacterTrait` (modelo nº 6). Ao criar a instância, o traço
de família é **copiado** para lá (com `source = TEMPLATE`), para que o campo de batalha, os bônus e o limite de 5 slots
leiam **uma lista só**.

**Passiva (JSON, `src/domain/characters/value-objects/passive.ts`):** `name`, `description`, `trigger` e `effects`. O
gatilho cobre os 4 formatos do D83.

| Gatilhos | `ALWAYS` (permanente), `PERIODIC` (`everyTurns`), `TURN_START`, `ON_ATTACK`, `ON_HIT`, `ON_KILL`, `ON_HEAL`, `HP_BELOW` (`percent`), `ON_DESGASTE`, `ON_FIELD_CHANGE`, `ON_STATUS` |
|---|---|
| **Efeitos** | `IGNORE_SHIELD`, `REDUCE_COOLDOWN` (`amount`, `scope`), `APPLY_STATUS` (`status` do enum `StatusType`, 3.4; `target`, `chance`), `HEAL` (`percentOfMaxHp`), `ADVANCE_TURN` (`percent`), `REDUCE_DAMAGE` (`percent`), `STAT_MODIFIER` (só condicional, nunca permanente: D83) |

**Regras (domínio, `InvalidCharacterTemplateError`):** variantes (máx. 3, sem repetir, uma principal, **nenhuma
despertada**); traço de família
`TEMPLATE` e com a variante dele no modelo; stats positivos e orçamento em ±3%; passiva com efeito.

**Exemplo** (fictício, só para ilustrar; os personagens reais são do admin):

| `key` | Classe | Variantes | Família | Raridade | Periculosidade |
|---|---|---|---|---|---|
| `kael-pyranth` | `VANGUARD` | `fire` (principal) | `family-pyranth` | `B` | `CONTINUOUS` |
| `mira-voss` | `MARKSMAN` | `gravity` (principal), `steel` | | `A` | `DIFFERENTIABLE` |
| `recruit-guardian` | `GUARDIAN` | nenhuma | | `E` | `DISCRETE` |

Linhas de `character_template_variants`: (`kael-pyranth`, `fire`, principal), (`mira-voss`, `gravity`, principal),
(`mira-voss`, `steel`). O `recruit-guardian` não tem nenhuma.

Passivas (`passive`):

```json
{
  "name": "Brasa interna",
  "description": "Ao ser atingido, 20% de chance de queimar o atacante.",
  "trigger": { "type": "ON_HIT" },
  "effects": [{ "type": "APPLY_STATUS", "status": "DOT", "target": "ATTACKER", "chance": 0.2 }]
}
```

```json
{
  "name": "Dobra do tempo",
  "description": "A cada 3 turnos, reduz em 1 a recarga das skills que estão recarregando.",
  "trigger": { "type": "PERIODIC", "everyTurns": 3 },
  "effects": [{ "type": "REDUCE_COOLDOWN", "amount": 1, "scope": "RECHARGING" }]
}
```

No `seed.ts`:

```ts
CharacterTemplate.create({
  key: 'kael-pyranth',
  name: 'Kael Pyranth',
  characterClass: CharacterClass.VANGUARD,
  rarity: Rarity.B,
  initialDanger: DangerLevel.CONTINUOUS,
  exclusivity: Exclusivity.NONE,
  variants: [{ variant: fire, isPrimary: true }],
  familyTrait: familyPyranth,
  stats: { HP: 700, ATTACK: 105, DEFENSE: 120, SPEED: 80, PRECISION: 100, EVASION: 55, WILL: 95 },
  passive: brasaInterna,
})
// right(CharacterTemplate): orçamento 695

CharacterTemplate.create({ ...kael, variants: [{ variant: steel, isPrimary: true }] })
// left(InvalidCharacterTemplateError): o personagem precisa ter a variante da família
```

**Domínio:** `src/domain/characters/entities/character-template.ts`. Fábricas de teste em
`test/factories/make-character-template.ts` e `test/factories/make-trait.ts`.

### 3.4 Skill (catálogo)

A skill do catálogo, igual para todos. A instância (aprendida, aprimorada, na build) mora em `CharacterSkill` (modelo
nº 7). Regras de jogo em `skills_brief.md` (seção 12 = valores).

**Enums (Prisma e domínio):**
- `SkillTier` (o **tipo**, a força da skill, D92):

| `tier` | Nome no doc | Poder | Cooldown | Desgaste | Nível mínimo |
|---|---|---|---|---|---|
| `BASIC` | Básica | 0,8 | 0 | 1% | 0 |
| `STANDARD` | Padrão | 1,0 | 1 | 1,5% | 0 |
| `REINFORCED` | Reforçada | 1,3 | 2 | 3% | 20 |
| `STRONG` | Forte | 1,6 | 3 | 5% | 40 |
| `FINAL` | Final | 2,0 | 4 | 8% | 60 |

- `SkillTarget`: `ENEMY`, `ALLY`, `SELF`.
- `SkillRange`: `MELEE`, `RANGED`, `PIERCING`, `FLANK` (só em skill de inimigo).
- `SkillArea`: `SINGLE`, `LINE`, `COLUMN`, `GRID`.
- `SkillKitSlot`: `BASIC`, `STANDARD`, `ROLE` (função da classe), `SIGNATURE` (assinatura da variante).

**Enum só do domínio** (vive dentro do JSON): `StatusType` = `STUN`, `LOCK` (Travado), `ROOT` (Preso), `EXPOSE`, `MARK`,
`DOT` (dano contínuo). A passiva do personagem (3.3) usa o mesmo enum.

| Campo | Tipo | Regra |
|---|---|---|
| `id` | uuid | |
| `key` | texto, **único** | estável (ex.: `flame-wave`) |
| `name`, `description` | texto | |
| `variantId` | FK opcional → `Variant` | **nulo = skill none** (linhagem `NONE`) |
| `tier` | `SkillTier` | |
| `target` | `SkillTarget` | |
| `range` | `SkillRange`, opcional | obrigatório se `ENEMY`; nulo se `ALLY` ou `SELF` |
| `area` | `SkillArea` | `SELF` é sempre `SINGLE` |
| `cooldown` | inteiro | ≥ 0, em turnos do próprio personagem |
| `desgastePercent` | decimal | ≥ 0, % do stat base da linhagem |
| `baseHitChance` | decimal, opcional | obrigatório se `ENEMY` (0,8 na normal); **nulo = sem teste de acerto** (cobra sempre) |
| `minLevel` | inteiro | 0 a 100; nunca abaixo do mínimo do tipo; **despertada ≥ 80** |
| `kitClass` + `kitSlot` | opcionais, **sempre juntos** | marca a skill como parte do kit básico daquela classe nesta variante; `minLevel` 0; despertada nunca é kit |
| `effects` | JSON (lista de `SkillEffect`) | pelo menos 1 efeito |
| `createdAt`, `updatedAt` | data | |

**Linhagem e despertar não são colunas:** a linhagem vem da variante (ou `NONE` sem variante), e "despertada" vem de
`Variant.awakensFromId` (3.1). A entidade de domínio guarda os dois prontos (`lineage`, `isAwakened`) para o motor não
precisar buscar a variante a cada ação; quem monta a entidade a partir do banco preenche pelo join.

**Valores guardados prontos + calculadora de referência:** o banco guarda os números finais, porque o admin pode fugir
da tabela (D16). A função `skillReference()` (`src/domain/skills/services/skill-reference.ts`) calcula o padrão a
partir de tipo + forma, para o seed gerar e o admin comparar:

| Forma | Poder | Custo |
|---|---|---|
| `RANGED` | ×0,9 | ×1,25 |
| `FLANK` | ×1,0 | ×1,4 |
| `PIERCING` | ×0,65 | ×1,5 |
| `LINE` (inimigo) | ×0,85 | ×1,3 |
| `COLUMN` (inimigo, sem queda, D108/D109) | ×0,65 | ×1,5 |
| `GRID` (inimigo) | ×0,5 | ×1,5 |
| Área em aliados (buff de squad, D102) | ×0,7 | ×1,3 |
| Skill none (sem variante) | ×0,85 | ×0,5 (cooldown −1, mín. 0) |

**Tipos de efeito** (`src/domain/skills/value-objects/skill-effect.ts`). Todos aceitam `appliesTo`: `TARGET` (padrão)
ou `SELF` (ex.: ataca e ganha um buff).

| `type` | Campos | Observação |
|---|---|---|
| `DAMAGE` | `power` | 0 a 2,5 |
| `HEAL` / `SHIELD` | `power` | 1,0 = 10% do HP máximo do alvo (8% até o nível 20, D137) |
| `STAT_MODIFIER` | `stat`, `percent`, `duration` | buff (+) ou debuff (−) |
| `APPLY_STATUS` | `status`, `duration`, `baseChance` | chance contra a Vontade (`skills_brief.md` 12.4) |
| `REPOSITION` | `kind`: `PUSH`, `PULL`, `SWAP`, `MOVE_ALLY`, `DASH` | |
| `TURN_SHIFT` | `percent` | + adianta, − atrasa (D102) |
| `CHANGE_FIELD` | `duration`, `multiplier` | troca de campo (D98) |

**Regras (domínio, `InvalidSkillError`):**
1. Pelo menos 1 efeito.
2. Inimigo exige `range` e `baseHitChance`; aliado e si mesmo não têm nenhum; si mesmo é sempre `SINGLE`.
3. `minLevel` de 0 a 100, nunca abaixo do mínimo do tipo; skill despertada ≥ 80 (D96).
4. Poder de 0 a 2,5; cooldown inteiro ≥ 0; Desgaste ≥ 0; chances entre 0 e 1; durações ≥ 1.
5. `kitClass` e `kitSlot` juntos; kit tem `minLevel` 0 e nunca é despertado.

**Exemplo** (fictício, só para ilustrar; as skills reais são do admin):

| `key` | Variante | Tipo | Alvo / alcance / área | Poder | CD | Desgaste | Acerto | Kit |
|---|---|---|---|---|---|---|---|---|
| `fire-strike` | `fire` | `BASIC` | inimigo / `MELEE` / `SINGLE` | 0,8 | 0 | 1% | 0,8 | `VANGUARD` · `BASIC` |
| `flame-wave` | `fire` | `STRONG` | inimigo / `RANGED` / `LINE` | 1,22 | 3 | 8,13% | 0,8 | |
| `cauterize` | `fire` | `STANDARD` | aliado / `SINGLE` | cura 1,0 | 1 | 1,5% | | `SUPPORT` · `ROLE` |
| `blue-inferno` | `blue-fire` | `FINAL` | inimigo / `MELEE` / `SINGLE` | 2,5 | 4 | 12% | 0,8 | (despertada, nível 80) |
| `dry-blow` | nenhuma | `BASIC` | inimigo / `MELEE` / `SINGLE` | 0,68 | 0 | 0,5% | 0,8 | |

O `flame-wave` mostra a calculadora: 1,6 × 0,9 × 0,85 = **1,22** de Poder; 5% × 1,25 × 1,3 = **8,13%** de Desgaste. O
`blue-inferno` é a Final despertada (×1,25 de Poder e ×1,5 de Desgaste, D96). O `dry-blow` é none.

`effects` do `flame-wave`:

```json
[
  { "type": "DAMAGE", "power": 1.22 },
  { "type": "APPLY_STATUS", "status": "DOT", "duration": 3, "baseChance": 0.8 }
]
```

No `seed.ts`:

```ts
const ref = skillReference({
  tier: SkillTier.STRONG,
  target: SkillTarget.ENEMY,
  range: SkillRange.RANGED,
  area: SkillArea.LINE,
}) // { power: 1.22, desgastePercent: 8.13, cooldown: 3, minLevel: 40 }

Skill.create({
  key: 'flame-wave',
  name: 'Onda de chamas',
  variant: fire,
  tier: SkillTier.STRONG,
  target: SkillTarget.ENEMY,
  range: SkillRange.RANGED,
  area: SkillArea.LINE,
  cooldown: ref.cooldown,
  desgastePercent: ref.desgastePercent,
  baseHitChance: 0.8,
  minLevel: ref.minLevel,
  effects: [
    { type: 'DAMAGE', power: ref.power },
    { type: 'APPLY_STATUS', status: StatusType.DOT, duration: 3, baseChance: 0.8 },
  ],
})
// right(Skill), lineage = ELEMENTAL

Skill.create({ ...flameWave, target: SkillTarget.ALLY })
// left(InvalidSkillError): skill em aliado ou si mesmo não tem alcance
```

**Domínio:** `src/domain/skills/entities/skill.ts`; referência em `src/domain/skills/services/skill-reference.ts`.
Fábrica de teste em `test/factories/make-skill.ts`.

As skills únicas do DOM **não são do catálogo**: o servidor monta cada uma como valor da batalha (3.15). O catálogo do
despertar está em 3.14.

### 3.5 Account (jogador)

A conta do jogador: dona dos personagens e dos squads, aparece na batalha e **entra por username + senha**. A
máquina **não é uma conta**: o adversário do PvE vem do `NpcSquad` (modelo nº 9).

| Campo | Tipo | Regra |
|---|---|---|
| `id` | uuid | |
| `username` | texto, **único** | normalizado (sem espaços nas pontas, minúsculo); 3 a 20 caracteres: letras minúsculas, números e `_` |
| `displayName` | texto | 2 a 30 caracteres (sem espaços nas pontas); nome exibido na batalha |
| `passwordHash` | texto | hash bcrypt da senha (a senha em texto tem 8 a 72 caracteres e nunca é guardada) |
| `role` | `AccountRole` | `PLAYER` (padrão) ou `ADMIN` |
| `createdAt`, `updatedAt` | data | |

**Regras (domínio, `InvalidAccountError`):** formato do `username`, tamanho do `displayName` e da senha.

**Editar a conta (`PATCH /me`):** o próprio jogador muda o `displayName` e a senha (esta só com a senha atual); o
`username` e o `role` não mudam pela API. Trocar a senha **apaga** todas as sessões da conta e abre uma nova para quem
trocou. Apagar, e não revogar: um refresh token revogado que reaparece é tratado como roubo e derrubaria também a
sessão nova.

**Fica para depois** (cada um com a sua migração):

| Quando | Campos |
|---|---|
| Recuperar a conta | `email` (único), se um dia houver "esqueci a senha" |
| Inventário (D100) | espaços de inventário (a moeda e os fragmentos ficam na carteira, 3.13) |
| Organizações (D101) | organização ativa, reputação por organização |
| Ranqueado (D99) | pontos, faixa, histórico mínimo |

**Login por username + senha (aprovado):** sem e-mail por ora (o usuário escolheu; sem e-mail não há "esqueci a
senha"). Modelo do help-invest: token de acesso JWT RS256 de 15 minutos e refresh token de 30 dias com rotação, os
dois só em cookies httpOnly.

**Sessão (`Session`, tabela `sessions`):** uma linha por login. Guarda o **hash** SHA-256 do refresh token (o token
puro só existe na resposta), `expiresAt`, `revokedAt` e o `userAgent`. Cada refresh token serve uma vez: ao renovar,
a sessão é revogada e outra é criada. Um token já usado aparecendo de novo é sinal de roubo e revoga **todas** as
sessões da conta. Apagar a conta apaga as sessões. Domínio: `src/domain/accounts/entities/session.ts`.

**Papel (`AccountRole`):** o admin cuida do conteúdo (catálogo) pelas rotas `/admin/...` (`api.md`, Admin). Uma conta
vira admin **pelo seed** (conta `admin` / `origin123`) ou **pelo banco** (`npm run admin:promote <username>`, e
`-- --demote` para voltar a jogador); nenhuma rota dá o papel. As rotas de admin usam o `@Admin()`
(`src/infra/auth/admin.ts`), que lê o papel no banco a cada requisição: quem é rebaixado perde o acesso na hora.

**Edição do catálogo pelo admin** (`src/domain/catalog/applications/use-cases/`): cria, troca ou apaga um item pela
`key`, que não muda depois. A gravação (`PrismaCatalogRepository`) roda numa transação que relê o catálogo
**inteiro** pelo domínio e confere `catalogIntegrityError` (todo modelo com kit básico válido): se a mudança quebra
outro item (a build de um NPC, o kit de um modelo), nada fica gravado. Apagar não leva nada em cascata: item usado
no catálogo (`catalogUsages`) ou por um jogador (a chave estrangeira recusa) dá 409. A edição vale na hora para os
personagens das contas (os stats saem do modelo); a batalha em andamento segue com a foto do início (D8). Rodar o
seed de novo grava por cima, pela `key`, o que o admin editou.

**Contas de antes do login:** a migração `auth_sessions` deixou o hash vazio nelas, e assim elas não entram. O seed
dá à `tester_01` a senha de teste `origin123`.

**API:** cadastro, login, refresh, logout, `GET /me` e `GET /accounts/:username`, em [`api.md`](./api.md).

**Exemplo** (fictício):

| `username` | `displayName` | Resultado |
|---|---|---|
| `joao_naif` | João | válido |
| `  Tester_01 ` | Tester | válido, salvo como `tester_01` |
| `Joao Naif!` | João | **inválido**: espaço e símbolo |

No `seed.ts`:

```ts
Account.create({ username: 'tester_01', displayName: 'Tester', passwordHash: await hasher.hash('origin123') })
// right(Account)

Account.create({ username: 'Joao Naif!', displayName: 'João', passwordHash })
// left(InvalidAccountError): username com 3 a 20 caracteres: letras minúsculas, números e _
```

**Domínio:** `src/domain/accounts/entities/account.ts`. Fábrica de teste em `test/factories/make-account.ts`.

### 3.6 Character (jogador)

A **instância** do personagem: a Kael da conta, com nível, pontos livres e traços próprios. O que é igual para todos
fica no modelo (`CharacterTemplate`, 3.3).

| Campo | Tipo | Regra |
|---|---|---|
| `id` | uuid | |
| `accountId` | FK → `Account` | dona; apagar a conta apaga os personagens |
| `templateId` | FK → `CharacterTemplate` | o modelo não pode ser apagado com instâncias |
| `level` | inteiro | 0 a 100; começa em 0 |
| `xp` | inteiro | XP **dentro do nível atual**, sempre menor que o custo do próximo (`70 × (1 + n/25)²`, D92); 0 no nível 100 |
| `danger` | `DangerLevel` | periculosidade atual; começa na inicial do modelo e só sobe (D86) |
| `dangerPoints` | inteiro | pontos de periculosidade (limiares 500 / 1.500 / 4.000 / 10.000, D100); a subida entra com a progressão |
| `awakenedVariantId` | FK opcional → `Variant` | a variante despertada; nulo = não despertou |
| `awakeningId` | FK opcional → `Awakening` | o despertar sorteado (D151); nulo = ainda não sorteou. Restrict: o admin não apaga um despertar sorteado |
| `awakeningMissions` | JSON `[{ kind, threshold, progress }]` | as 3 missões ocultas (uma de cada categoria), cópia do pool com o limiar de sangue puro |
| `awakeningDrawnAt` | data, opcional | quando sorteou |
| `dom` | JSON `{ pillars, history, weightSinceCheck }` | DOM (D152, 3.15): nível de cada pilar, a janela de feitos (até 150 de peso) e o peso desde a última conferência da perda |
| `freeHp` … `freeWill` | 7 inteiros | pontos livres por stat; **HP em pontos** (1 ponto = 5 de HP, D69) |
| `createdAt`, `updatedAt` | data | |

**Ligação `CharacterTrait`** (chave composta `characterId` + `traitId`, com `acquiredAt`): os traços do personagem,
**até 5**. Na criação, o traço de família do modelo é **copiado** para cá (D105), então o campo de batalha, os bônus e o
limite leem uma lista só.

**Stats não são guardados.** O motor calcula o stat final a partir do perfil do modelo + nível + pontos livres (+
traços, DOM e equipamento quando essas camadas entrarem). Guardar o valor criaria duas fontes da verdade.

**Pontos livres (D91):**
- **Disponíveis:** 10 pontos a cada 10 níveis (`floor(nível / 10) × 10`, até 100 no nível 100).
- **Teto por stat**, na escala do nível 100: `perfil × multiplicador − 85% do perfil`. Multiplicador ×1,25 nos picos
  da classe (×1,15 se o pico for Ataque ou Velocidade) e ×1,10 nos demais. Picos = stats em negrito na tabela de
  `classes_brief.md` 2 (`CLASS_PEAK_STATS`).
- Redistribuição grátis fora da batalha (D48): `allocateFreePoints` troca a distribuição inteira de uma vez.

**Operações (domínio, `InvalidCharacterError`):**

| Operação | Regras |
|---|---|
| `Character.create` | nível 0, periculosidade inicial do modelo; o traço de família é obrigatório quando o modelo tem e proibido quando não tem; recebe o **kit básico** (3.7), que entra aprendido e na build |
| `gainXp` | sobe de nível pela curva; para no 100 com XP 0 |
| `addTrait` | só `CONQUERED`; sem repetir; no máximo 5; soma dos `STAT_MODIFIER` positivos num stat ≤ +15% (D88) |
| `allocateFreePoints` | inteiros ≥ 0; total ≤ disponível no nível; cada stat ≤ teto da classe |
| `awaken` | só com **exatamente 1 variante**; nível ≥ 80; a variante é uma despertada **da variante do personagem**; um despertar só (D67, D96) |
| `startAwakening` | guarda o despertar sorteado e as 3 missões; uma vez só, nível ≥ 80, sem ter despertado (D151) |
| `recordAwakeningBattle` | soma uma batalha que conta nas missões (sem passar do limiar); devolve se as 3 estão cumpridas. `awakeningHint` dá a dica (`SILENT`, `SIGNS`, `IMMINENT`, `AWAKENED`) |
| `recordDomBattle` | soma uma batalha no DOM: 1 feito por pilar, janela de 150 de peso, perda a cada 25, no máximo 1 nível a mais por pilar; devolve o que mudou (D152) |
| `setDomPillars` | admin define os níveis (pilar conhecido); a janela fica e a perda volta a contar do zero |
| `Character.restore` | recompõe a partir do banco, sem as regras de criação |

**Exemplo** (fictício): a Kael (Vanguarda, perfil 700 / 100 / 120 / 75 / 85 / 55 / 95) de `tester_01`.

| `level` | `xp` | `danger` | `awakenedVariantId` | Pontos livres | Traços |
|---|---|---|---|---|---|
| 0 | 0 | `CONTINUOUS` | | todos 0 (0 disponíveis) | `family-pyranth` |
| 20 | 120 | `CONTINUOUS` | | Defesa 10, Vontade 10 (20 de 20) | `family-pyranth`, `veteran` |
| 85 | 900 | `DIFFERENTIABLE` | `blue-fire` | HP 20, Defesa 40, Vontade 20 (80 de 80) | `family-pyranth`, `veteran`, `berserker` |

Tetos da Vanguarda (pontos): HP 35 · Ataque 25 · **Defesa 48** (pico) · Velocidade 18 · Precisão 21 · Esquiva 13 ·
Vontade 23.

No `seed.ts`:

```ts
const kael = Character.create({ account: tester, template: kaelTemplate, familyTrait: familyPyranth })
// right(Character): nível 0, traços = [family-pyranth]

kael.gainXp(5_000) // sobe vários níveis pela curva
kael.allocateFreePoints({ ...EMPTY_FREE_POINTS, DEFENSE: 10, WILL: 10 }, kaelTemplate)
// right, se o nível for ≥ 20

kael.allocateFreePoints({ ...EMPTY_FREE_POINTS, ATTACK: 26 }, kaelTemplate)
// left(InvalidCharacterError): acima do teto da classe em ATTACK (máx. 25)
```

**Domínio:** `src/domain/characters/entities/character.ts`; curva em `services/level-curve.ts`; pontos livres em
`services/free-points.ts`.

**Fica para depois:** subida da periculosidade, DOM (pilares e níveis), equipamento vivo, contratos e títulos. O
despertar (sorteio, missões e dica) está em 3.14.

### 3.7 CharacterSkill (jogador)

As skills que o personagem **aprendeu** (kit e escolhas), se cada uma está **aprimorada**, e quais 4 estão na
**build** de batalha. Faz parte do `Character` (as operações são métodos dele).

**Enum `CharacterSkillSource`:** `KIT` (kit básico, desde o nível 0) ou `OFFER` (escolhida num bloco de 3 a cada 5
níveis, D77, inclusive as despertadas).

| Campo | Tipo | Regra |
|---|---|---|
| `characterId` + `skillId` | chave composta | sem repetir skill |
| `source` | `CharacterSkillSource` | |
| `isEnhanced` | booleano | aprimorada (+15% de Poder, D100); **um aprimoramento só** (D80) |
| `buildSlot` | inteiro opcional | **1 a 4 = na build** (D43); nulo = guardada; **único por personagem** (`@@unique`) |
| `acquiredAt` | data | |

Apagar o personagem apaga as linhas; o banco não deixa apagar uma skill que alguém aprendeu.

**Kit básico na criação (D92, D97):** `Character.create` recebe as 4 skills do kit do modelo, que entram com
`source = KIT` e nos slots 1 a 4. O kit precisa ter:
- 4 skills de kit **da classe do modelo**, **um de cada papel** (`BASIC`, `STANDARD`, `ROLE`, `SIGNATURE`);
- a **divisão por variante** do D97: 1 variante = 4; 2 = 2 e 2; 3 = 2 da principal e 1 de cada outra; sem variante =
  4 skills none.

**Operações (métodos do `Character`, `InvalidCharacterError`):**

| Operação | Regras |
|---|---|
| `learnSkill(skill, template)` | só das **próprias variantes** (none só para quem não tem variante, D25); **nível mínimo** atingido; a **despertada** só depois de despertar, e na variante despertada dele (D96); sem repetir. Entra como `OFFER`, guardada |
| `equipSkills([4 ids])` | exatamente **4 aprendidas**, sem repetir; os slots seguem a ordem; as demais ficam guardadas. Se der erro, a build anterior continua |
| `enhanceSkill(id)` | skill aprendida e ainda não aprimorada. A **chance e o custo** da tentativa (D100) ficam no caso de uso; a entidade só registra o sucesso |

**Na batalha** (motor, não modelo): a faixa do ranqueado limita as skills por nível mínimo (D99) e o aprimoramento
(0%, 50% ou 100% do ganho). O modelo guarda o que o personagem tem; o motor decide o que vale naquela partida.

**Exemplo** (fictício): a Kael (Vanguarda de fogo) no nível 40.

| Skill | `source` | `isEnhanced` | `buildSlot` |
|---|---|---|---|
| `fire-strike` (kit, BASIC) | `KIT` | sim | 1 |
| `flame-wave` (Forte, nível 40) | `OFFER` | | 2 |
| `kael-kit-role` (kit, ROLE) | `KIT` | | 3 |
| `kael-kit-signature` (kit, SIGNATURE) | `KIT` | | 4 |
| `kael-kit-standard` (kit, STANDARD) | `KIT` | | guardada |

No `seed.ts`:

```ts
const kael = Character.create({ account: tester, template: kaelTemplate, familyTrait: familyPyranth, kitSkills: kaelKit })
// right(Character): 4 skills do kit nos slots 1 a 4

kael.learnSkill(flameWave, kaelTemplate) // right, se o nível for ≥ 40
kael.equipSkills([fireStrike.id, flameWave.id, kitRole.id, kitSignature.id]) // right

kael.learnSkill(steelStrike, kaelTemplate)
// left(InvalidCharacterError): só skills das próprias variantes
```

**Domínio:** métodos em `src/domain/characters/entities/character.ts`; validação do kit em
`src/domain/characters/services/basic-kit.ts`. Fábrica de teste do kit em `test/factories/make-basic-kit.ts`.

**Blocos de skill (`SkillOffer`, tabela `skill_offers`, D77, D135):** um por personagem e nível (5, 10, ..., 100;
`@@unique` personagem + nível), com as opções (`skillIds`, 1 a 3), a escolhida (`chosenSkillId`, nulo = pendente) e
as datas. Nasce no fim da batalha (`skillOffersOnLevelUp`, sorte derivada da seed da batalha); a escolha chama
`learnSkill` do personagem. Apagar o personagem apaga os blocos. Domínio: `src/domain/characters/entities/skill-offer.ts`
e o sorteio em `services/skill-offer-draw.ts`.

**Em aberto (pergunta ao usuário):** o D97 diz **quantas** skills do kit vêm de cada variante, mas não **quais papéis**
(ex.: com 2 variantes, a principal dá `BASIC` e `ROLE`?). Hoje o domínio só valida a quantidade e exige um de cada papel.

### 3.8 Squad (jogador)

Uma **formação salva** da conta: 4 personagens dela em células da grade 3x3 (D11). A conta pode ter vários squads (um
para cada estilo) e escolhe um ao entrar na batalha.

**A grade (D35):** `row` é a **linha** (0 a 2), que vai da frente para o fundo; `column` é a **profundidade** (0 a 2), com
a **coluna 0 na frente**. Cada lado tem a sua grade, de frente para a outra (D20).

```
            coluna 0 (frente)   coluna 1   coluna 2 (fundo)
  linha 0        [0:0]           [0:1]        [0:2]
  linha 1        [1:0]           [1:1]        [1:2]
  linha 2        [2:0]           [2:1]        [2:2]
                   ↑ de frente para a grade do adversário
```

| Campo (`Squad`) | Tipo | Regra |
|---|---|---|
| `id` | uuid | |
| `accountId` | FK → `Account` | dona; apagar a conta apaga os squads |
| `name` | texto | 1 a 30 caracteres (sem espaços nas pontas) |
| `createdAt`, `updatedAt` | data | |

| Campo (`SquadMember`) | Tipo | Regra |
|---|---|---|
| `squadId` + `characterId` | chave composta | personagem não se repete no squad |
| `row`, `column` | inteiros | 0 a 2; **uma célula por personagem** (`@@unique` de squad + célula) |

**Regras (domínio, `InvalidSquadError`):** exatamente **4** personagens; todos **da própria conta**; sem repetir; dentro
da grade; sem dois na mesma célula; nome de 1 a 30 caracteres.

**Operações:** `Squad.create`, `setFormation` (troca personagens e células de uma vez, fora da batalha; se der erro, a
formação anterior continua) e `Squad.restore`.

**Personagem vendido ou apagado:** a linha dele em `SquadMember` some junto (cascata) e o squad fica com 3. Ao carregar,
a batalha deve recusar um squad incompleto até o jogador completar a formação (regra para quando a batalha for
implementada; o `restore` não valida).

**Exemplo** (fictício): o squad "Muralha" de `tester_01`.

| Personagem | `row` | `column` | Posição |
|---|---|---|---|
| Kael (Vanguarda) | 0 | 0 | frente, linha 0 |
| Recruta (Guardião) | 2 | 0 | frente, linha 2 |
| Mira (Atiradora) | 1 | 1 | meio, linha 1 |
| Suporte | 1 | 2 | fundo, linha 1 |

```
            coluna 0     coluna 1     coluna 2
  linha 0    Kael          .            .
  linha 1     .           Mira        Suporte
  linha 2   Recruta        .            .
```

No `seed.ts`:

```ts
Squad.create({
  account: tester,
  name: 'Muralha',
  members: [
    { character: kael, row: 0, column: 0 },
    { character: recruit, row: 2, column: 0 },
    { character: mira, row: 1, column: 1 },
    { character: support, row: 1, column: 2 },
  ],
})
// right(Squad)

Squad.create({ account: tester, name: 'Empilhado', members: [/* dois em 0:0 */] })
// left(InvalidSquadError): dois personagens na mesma célula
```

**Domínio:** `src/domain/squads/entities/squad.ts`; célula em `src/domain/squads/value-objects/grid-position.ts`.
Fábrica de teste em `test/factories/make-squad.ts`.

### 3.9 NpcSquad (batalha)

O **squad da máquina**, adversário do PvE (D75, D90, D103). É **catálogo**: no MVP vem do `seed.ts`, depois do admin.
Joga com as **mesmas regras do jogador** (4 personagens, grade 3x3, 4 skills cada) e **nunca ganha bônus de stat**: a
dificuldade muda só a qualidade da decisão da IA.

**Enums:**
- `AiProfile` (muda os pesos da pontuação, `pvp_brief.md` 8.1): `AGGRESSIVE`, `CAUTIOUS`, `FINISHER` (focado em abater),
  `BALANCED`.
- `AiDifficulty`: `BEGINNER`, `INTERMEDIATE`, `ADVANCED`, `MASTER`, `GRANDMASTER`.

**Faixa de nível por dificuldade** (D103, inclusiva; `NPC_LEVEL_RANGE`):

| Dificuldade | Nível dos NPCs |
|---|---|
| `BEGINNER` | 10 a 25 |
| `INTERMEDIATE` | 25 a 45 |
| `ADVANCED` | 45 a 70 |
| `MASTER` | 70 a 90 |
| `GRANDMASTER` | 90 a 100 |

| Campo (`NpcSquad`) | Tipo | Regra |
|---|---|---|
| `id`, `key` (único), `name`, `description` | | `key` ex.: `beginner-wall` |
| `profile` | `AiProfile` | |
| `difficulty` | `AiDifficulty` | |
| `createdAt`, `updatedAt` | data | |

| Campo (`NpcSquadMember`) | Tipo | Regra |
|---|---|---|
| `id` | uuid | |
| `npcSquadId` | FK → `NpcSquad` | apagar o squad apaga os membros |
| `templateId` | FK → `CharacterTemplate` | **um modelo por squad** (mesma regra da conta: repetido vira moeda) |
| `level` | inteiro | dentro da faixa da dificuldade |
| `row`, `column` | inteiros | 0 a 2; uma célula por membro (como no `Squad`, 3.8) |
| `awakenedVariantId` | FK opcional → `Variant` | NPC despertado (regras do despertar, D67) |

Ligações: `NpcSquadMemberSkill` (as **4 skills**, com `buildSlot` 1 a 4, único) e `NpcSquadMemberTrait` (até 5 traços).

**Sem conta e sem pontos livres guardados:** o NPC não é um `Character`. O motor usa a **distribuição padrão** do perfil
do modelo (o perfil já a inclui, 3.3), limitada aos pontos do nível dele. Assim o admin não precisa montar pontos à mão.

**Regras (domínio, `InvalidNpcSquadError`):** 4 membros; modelos sem repetir; dentro da grade e sem dois na mesma
célula; nível dentro da faixa; build com **4 skills** sem repetir e **elegíveis** para o membro (próprias variantes,
nível mínimo, despertada só se despertado); despertar válido; até 5 traços, sem repetir, com o **traço de família do
modelo obrigatório** (e o único `TEMPLATE`) e o teto de +15% por stat.

**Regras compartilhadas com o jogador:** a elegibilidade de skill, o despertar e o teto de traços são **os mesmos
serviços** usados pelo `Character` (`src/domain/characters/services/skill-eligibility.ts`, `awakening-rules.ts`,
`trait-rules.ts`). Uma mudança de regra vale para os dois.

**Exemplo** (fictício):

| `key` | `profile` | `difficulty` | Membros |
|---|---|---|---|
| `beginner-wall` | `CAUTIOUS` | `BEGINNER` | 4 recrutas no nível 15 (Guardião e Vanguarda na frente, Suporte e Atirador atrás) |
| `grandmaster-blue` | `FINISHER` | `GRANDMASTER` | Kael **despertada** (`blue-fire`) no nível 95 com `blue-inferno`, mais 3 no nível 92 a 100 |

No `seed.ts`:

```ts
NpcSquad.create({
  key: 'beginner-wall',
  name: 'Muralha de recrutas',
  profile: AiProfile.CAUTIOUS,
  difficulty: AiDifficulty.BEGINNER,
  members: [
    { template: recruitGuardian, level: 15, row: 0, column: 0, skills: guardianBuild },
    { template: recruitVanguard, level: 15, row: 2, column: 0, skills: vanguardBuild },
    { template: recruitSupport, level: 15, row: 1, column: 1, skills: supportBuild },
    { template: recruitMarksman, level: 15, row: 1, column: 2, skills: marksmanBuild },
  ],
})
// right(NpcSquad)

NpcSquad.create({ ...beginnerWall, members: membersAtLevel(30) })
// left(InvalidNpcSquadError): nível 30 fora de 10 a 25 (BEGINNER)
```

**Domínio:** `src/domain/squads/entities/npc-squad.ts`; enums em `src/domain/ai/enums/`.

**Fica para depois:** o DOM e o equipamento do Grão-mestre (D103 diz "com DOM e equipamento") entram com essas
camadas; perfil próprio para chefes de evento (pós-MVP).

### 3.10 Battle (batalha)

A partida. Segue a decisão geral nº 2: **guarda seed, snapshot dos dois lados no início e o log de decisões, não o
estado**. Como o motor é determinístico (D8), `seed + snapshot + ações` reproduzem a batalha inteira (é o replay), e o
servidor é a autoridade (D9).

**Enums:**
- `BattleMode`: `PVE`, `CASUAL`, `RANKED`, `FRIENDLY`. **No MVP só `PVE`** (D75); o domínio só tem `Battle.startPve`.
- `BattleStatus`: `IN_PROGRESS`, `FINISHED`.
- `BattleSide`: `PLAYER` (dono da partida), `OPPONENT` (a máquina no PvE).
- `BattleEndReason`: `ELIMINATION`, `ROUND_LIMIT` (fim forçado na rodada 30, D72), `ABANDON` (W.O.). **Sempre há
  vencedor:** no fim forçado vence quem tem mais % de HP; empate pelo menor Desgaste e depois pela seed (D72).

| Campo | Tipo | Regra |
|---|---|---|
| `id` | uuid | |
| `accountId` | FK → `Account` | dono; apagar a conta apaga o histórico |
| `mode`, `status` | enums | começa `IN_PROGRESS` |
| `squadId` | FK opcional → `Squad` | o squad usado (só referência; apagar o squad deixa nulo) |
| `npcSquadId` | FK opcional → `NpcSquad` | o adversário (só referência; apagar deixa nulo) |
| `aiProfile`, `aiDifficulty` | enums opcionais | copiados do `NpcSquad` (para filtrar histórico e calcular XP/moeda) |
| `seed` | inteiro | 0 a 2.147.483.647; **só no servidor, nunca vai ao cliente** (D33) |
| `engineVersion`, `contentVersion` | texto | obrigatórias; o replay só é garantido com as mesmas versões |
| `snapshot` | JSON (`BattleSnapshot`) | foto dos dois lados no início |
| `winner`, `endReason`, `rounds` | opcionais | preenchidos no fim; `rounds` de 1 a 30; `ROUND_LIMIT` só com 30 |
| `startedAt`, `finishedAt` | data | vindas de fora (o domínio não lê o relógio); fim não antes do início |
| `createdAt`, `updatedAt` | data | |

**Snapshot (`src/domain/combat/value-objects/battle-snapshot.ts`):** cada lado tem nome e **4 unidades**. Cada unidade
guarda **valores, não referências**, porque o personagem e o catálogo podem mudar depois e o replay precisa do original:

| Campo da unidade | O que é |
|---|---|
| `ref` | identificador na batalha (`PLAYER:0` a `PLAYER:3`, `OPPONENT:0` a `OPPONENT:3`), usado pelas ações |
| `name`, `templateKey`, `characterClass`, `lineages` | identidade (linhagens das variantes, principal primeiro) |
| `level`, `profile`, `freePoints` | o motor calcula os stats a partir disso (NPC usa a distribuição padrão) |
| `traitEffects`, `passive` | efeitos dos traços e a passiva |
| `lineageCostPercent` | modificador de custo do Desgaste por linhagem (ex.: sangue puro −10% na linhagem da família), já resolvido pela variante do traço |
| `skills` | as 4 da build, com todos os valores (Poder, custo, cooldown, acerto, efeitos, aprimorada, despertada) |
| `row`, `column` | a célula no início |

**Operações (domínio, `InvalidBattleError`):**

| Operação | Regras |
|---|---|
| `Battle.startPve` | seed válida; versões preenchidas; snapshot com 4 unidades por lado, dentro da grade, sem célula repetida, refs únicas e 4 skills cada |
| `recordAction` | só em andamento; rodada de 1 a 30 e nunca voltando; a unidade é do lado que age; a sequência é atribuída em ordem |
| `finish` | só em andamento; rodadas de 1 a 30; `ROUND_LIMIT` só na 30; fim não antes do início |
| `Battle.restore` | recompõe a partir do banco |

**Recompensas do fim** (`deliverBattleRewards`): `rewards` guarda o XP por personagem (D134) e `loot` a moeda, os
fragmentos e o baú da conta (`{ coins, fragments, chest }`, D150; nulo até o fim e na desistência). **Fica para
depois:** PvP (adversário conta) entra com o `opponentAccountId` quando o PvP chegar.

### 3.11 BattleAction (batalha)

Uma **decisão** de turno, em ordem. Guarda **só a entrada** (o que o jogador ou a IA escolheu); o resultado (acerto,
dano, status) o motor reproduz pela seed. As ações da máquina também são guardadas, para auditoria e para conferir o
replay.

**Enum `BattleActionType`:** `SKILL`, `MOVE`, `SWAP`, `DEFEND`.

| Campo | Tipo | Regra |
|---|---|---|
| `battleId` + `sequence` | chave composta | `sequence` 0, 1, 2... em ordem |
| `round` | inteiro | 1 a 30 |
| `side` | `BattleSide` | |
| `actorRef` | texto | a unidade que agiu (`SnapshotUnit.ref`) |
| `type` | `BattleActionType` | igual ao `type` do payload (coluna para consulta) |
| `payload` | JSON (`BattleActionPayload`) | os dados da decisão |
| `createdAt` | data | |

**Payload:**

| `type` | Campos | Regra |
|---|---|---|
| `SKILL` | `skillKey`, `targetSide`, `target` (célula), `swapWith`, `moveTo` e `fieldKey` (opcionais) | célula dentro da grade; `swapWith` = o inimigo com quem o alvo troca (D111); `moveTo` = destino de avançar (DASH) ou mover aliado (MOVE_ALLY); `fieldKey` = o campo escolhido para trocar (D98) |
| `MOVE` | `to` (célula) | dentro da grade (adjacência é regra do motor, D42) |
| `SWAP` | `withRef` | só com aliado |
| `DEFEND` | | sem skill possível ou tempo esgotado (D38) |

**Exemplo** (fictício): `tester_01` com o squad "Muralha" contra `beginner-wall`, seed `42`.

| `sequence` | `round` | `side` | `actorRef` | `payload` |
|---|---|---|---|---|
| 0 | 1 | `PLAYER` | `PLAYER:2` | `SKILL` `flame-wave` em `OPPONENT` 1:0 |
| 1 | 1 | `OPPONENT` | `OPPONENT:0` | `SKILL` `none-0` em `PLAYER` 0:0 |
| 2 | 1 | `PLAYER` | `PLAYER:0` | `DEFEND` |
| 3 | 2 | `OPPONENT` | `OPPONENT:3` | `MOVE` para 1:1 |

Fim: `winner = PLAYER`, `endReason = ELIMINATION`, `rounds = 12`.

No código:

```ts
const battle = Battle.startPve({
  account: tester,
  squadId: muralha.id,
  npcSquad: beginnerWall,
  seed: 42,
  engineVersion: '0.1.0',
  contentVersion: 'seed-1',
  snapshot,
  startedAt: now,
})
// right(Battle)

battle.recordAction({
  round: 1,
  side: BattleSide.PLAYER,
  actorRef: 'PLAYER:2',
  payload: { type: 'SKILL', skillKey: 'flame-wave', targetSide: BattleSide.OPPONENT, target: { row: 1, column: 0 } },
})
// right({ sequence: 0, ... })

battle.recordAction({ round: 1, side: BattleSide.PLAYER, actorRef: 'OPPONENT:0', payload: { type: 'DEFEND' } })
// left(InvalidBattleError): unidade OPPONENT:0 não está nesse lado
```

**Domínio:** `src/domain/combat/entities/battle.ts`; snapshot e ações em `src/domain/combat/value-objects/`.
Fábricas de teste em `test/factories/make-battle-snapshot.ts` e `test/factories/make-npc-squad.ts`.


### 3.12 BattleField (catálogo)

O **campo de batalha** (D28, D40, D98). Catálogo do admin; no MVP vem do `seed.ts`. Dá um bônus de status, **nos dois
lados**, a quem tem **qualquer um** dos traços pedidos. Nunca é bônus por variante.

**Enum `Stat`** (Prisma): os 7 stats (`HP`, `ATTACK`, `DEFENSE`, `SPEED`, `PRECISION`, `EVASION`, `WILL`).

| Campo | Tipo | Regra |
|---|---|---|
| `id`, `key` (único), `name`, `description` | | `key` ex.: `arena` |
| `primaryStat`, `secondaryStat` | `Stat` | diferentes entre si |
| `primaryPercent`, `secondaryPercent` | decimais | padrão **6** e **4** (D98); maiores que zero; o admin pode ajustar |
| `createdAt`, `updatedAt` | data | |

**Ligação `BattleFieldTrait`** (chave composta `fieldId` + `traitId`): os traços pedidos, **2 a 4**, de **pelo menos 2
categorias** (D98 pede "categorias diferentes"; com 3 categorias, 4 traços não podem ser todos de categorias distintas,
então a regra é não serem todos da mesma).

**Regras (domínio, `InvalidBattleFieldError`):** 2 a 4 traços sem repetir, de pelo menos 2 categorias; stats diferentes;
bônus maior que zero.

**No snapshot** (3.10): o campo entra como valor (`SnapshotField`, com as `key` dos traços) em
`field.initial` (o sorteado) e `field.catalog` (para onde uma skill pode trocar). Cada unidade guarda `traitKeys`, para
o motor saber quem recebe o bônus.

**Exemplo** (fictício):

| `key` | Traços pedidos | Bônus |
|---|---|---|
| `arena` | `warrior` (Combate), `berserker` (Combate), `veteran` (Origem) | +6% Ataque, +4% Velocidade |
| `forest` | `stealthy` (Postura), `tamer` (Origem) | +6% Esquiva, +4% Precisão |

```ts
BattleField.create({
  key: 'forest',
  name: 'Floresta',
  primaryStat: Stat.EVASION,
  secondaryStat: Stat.PRECISION,
  requiredTraits: [stealthy, tamer],
})
// right(BattleField): +6% e +4% (padrão)

BattleField.create({ ...forest, requiredTraits: [warrior, berserker] })
// left(InvalidBattleFieldError): traços de pelo menos 2 categorias diferentes
```

**Domínio:** `src/domain/combat/entities/battle-field.ts`.

---


### 3.13 Wallet, WalletEntry e Chest (economia)

A economia da conta (D79, D100, D104, D150; valores em `progression_brief.md` Parte 3). Domínio em
`src/domain/economy/` (valores em `economy-values.ts`).

**`Wallet`** (uma por conta, chave = `accountId`): criada no primeiro ganho; sem linha = carteira vazia.

| Campo | Tipo | Regra |
|---|---|---|
| `accountId` | FK → `Account` (chave) | apagar a conta apaga a carteira |
| `coins` | inteiro | nunca negativa (gasto é tudo ou nada) |
| `fragments` | JSON `{ [Lineage]: quantidade }` | os 7 tipos (`NONE` = Neutro), até **500** por tipo; o que passaria vira moeda (40 M cada) |
| `version` | inteiro | sobe a cada gravação; gravar exige a mesma versão da leitura (gravação otimista) |

**`WalletEntry`** (registro): uma linha por mudança, gravada na mesma transação da carteira. `reason`
(`WalletReason`: `BATTLE_LOOT`, `CHEST_PURCHASE`, `CHEST_OPEN`, `FRAGMENT_PURCHASE`, `FRAGMENT_SALE`,
`SKILL_ENHANCEMENT`), `coins` e `fragments` com sinal (a variação), `refId` (batalha, baú ou personagem que
causou).

**Concorrência:** duas operações em cima da mesma leitura, só uma grava. Gasto que perde a corrida volta 409 sem gastar
nada (`WalletConflictError`); ganho (fim de batalha, baú aberto) relê e tenta de novo (`creditWallet`). Quem gasta
grava a carteira **antes** de entregar (baú comprado, tentativa de aprimorar), para nunca dar sem cobrar.

**`Chest`** (baú da conta):

| Campo | Tipo | Regra |
|---|---|---|
| `id` | uuid | |
| `accountId` | FK → `Account` | |
| `tier` | `Rarity` | o nível do baú usa a escala de raridade (D86) |
| `source` | `ChestSource` | `PURCHASE` (comprado) ou `BATTLE` (caiu no fim da batalha) |
| `battleId` | FK opcional → `Battle` | a batalha em que caiu (apagar a batalha deixa nulo) |
| `createdAt`, `openedAt` | data | `openedAt` nulo = fechado; abre uma vez só (a gravação confere que ainda estava fechado) |
| `contents` | JSON (`ChestContents`), nulo até abrir | `{ rarity, character: { templateKey, characterId } \| null, convertedTemplateKey, coins, fragments }` |

**Abrir** (`drawChest`, sorte de uma seed nova por abertura): 1 item da raridade sorteada (peso `q^r`, 3.5) entre os
personagens **não exclusivos** dela; novo entra no Elenco como no cadastro (nível 0, kit básico, traço de família);
repetido ou raridade sem personagem vira moeda pelo valor de venda (3.3). Mais os fragmentos do nível (E 1, D 2, C 4).

### 3.14 Awakening (catálogo) e o despertar do personagem

O despertar do admin (D67, D96, D151; regra em `awakening_brief.md` 7). Domínio em
`src/domain/characters/entities/awakening.ts`; sorteio em `services/awakening-draw.ts`; missões e dica em
`services/awakening-missions.ts`; medição na batalha em `src/domain/combat/services/awakening-stats.ts`.

| Campo | Tipo | Regra |
|---|---|---|
| `id` | uuid | |
| `key` | texto, **único** | |
| `name`, `description` | texto | |
| `variantId` | FK → `Variant`, **único** | uma variante **despertada**; uma por despertar. A base (quem pode sortear) é o `awakensFromId` dela |
| `requirements` | JSON `[{ stat, level: HIGH \| LOW }]` | 2 a 3, sem repetir stat, no máximo 2 de cada nível |
| `missions` | JSON `[{ kind, threshold }]` | sem repetir `kind`, limiar inteiro ≥ 1, ao menos uma de cada categoria (`AwakeningMissionKind`, 11 tipos) |

**Não entra na `version` do catálogo:** o despertar não muda o replay de uma batalha (a foto já guarda as skills).

**No personagem** (3.6): o sorteio grava `awakeningId`, `awakeningMissions` e `awakeningDrawnAt`. No fim de cada
batalha (`battle-rewards.ts`): primeiro as missões de quem já sorteou (se a batalha conta: Intermediário ou acima e
NPC fora das últimas 5), depois o despertar de quem cumpriu as 3 (com os blocos de recuperação, `SkillOffer.source =
AWAKENING`), por último o sorteio de quem está no nível 80 ou mais e ainda não sorteou. Cada sorte usa a seed da
batalha com um sal próprio.

**`SkillOffer.source`** (`SkillOfferSource`): `LEVEL_UP` (subida, D77) ou `AWAKENING` (recuperação, D151). A chave
única é `characterId` + `level` + `source`: o bloco de recuperação do 85 convive com o bloco normal do 85.

### 3.15 DOM do personagem

O DOM (D60, D61, D93, D152; regra em `dom_brief.md` 9). Sem tabela própria: é a coluna `dom` do `Character` (JSON),
porque só o personagem lê e escreve. Domínio em `src/domain/characters/services/dom-rules.ts` (valores) e
`dom-progress.ts` (janela, subir e cair); feitos em `src/domain/combat/services/dom-feats.ts`; skills únicas em
`dom-skills.ts`.

| Campo | O que é |
|---|---|
| `pillars` | `{ MIND?, HEART?, BODY?, AURA? }` com `BASIC`, `INTERMEDIATE` ou `ADVANCED`; pilar ausente = sem DOM nele |
| `history` | `[{ weight, feats: [{ pillar, role }] }]`, da mais antiga para a mais nova, somando até 150 de peso. No máximo 1 feito por pilar por entrada. Batalhas seguidas sem feito ficam numa entrada só (o tamanho cresce com os feitos, não com as batalhas) |
| `weightSinceCheck` | peso jogado desde a última conferência da perda (a cada 25) |

**Na batalha:** o snapshot da unidade do jogador ganha `dom: { pillars, statPercents }` (os % já calculados entram nos
stats) e as **skills únicas** dos pilares avançados depois das 4 da build, como `SnapshotSkill` com `singleUse: true`
e `domPillar` (efeitos `WEAKEN`, `FORESIGHT`, `INVULNERABLE` ou `HEAL`, que não existem no catálogo). Batalha antiga,
sem `dom` no snapshot, joga como antes. O NPC não tem DOM no MVP.

**No fim da batalha** (`battle-rewards.ts`): os feitos de cada personagem (`domBattleFeats`, pelos eventos) entram com
o peso da dificuldade; a recompensa traz `domChanges` quando um pilar sobe ou cai.

## 4. Seed do MVP (conteúdo)

Código: `prisma/seed/content/` (o conteúdo, criado pelas entidades do domínio e validado por elas) e `prisma/seed.ts`
(grava no banco). Rodar: `npm run db:seed` (precisa do Postgres e da migração). Idempotente: atualiza pela `key` e
recria as ligações. O simulador usa o mesmo conteúdo sem banco (`loadSeedContent()`).

**Variantes (22):** antimatéria, tempo e alma (Fundamental); relâmpago, gelo superiônico, combustão, névoa
(Elemental); explosão, som (Vetorial); endurecimento, terra, rocha, metal (Material); regeneração, ossos (Biológica);
sombra, ilusão, telecinese (Psíquica). Mais 4 **despertadas** (D151): Sombra Abissal e Eclipse (de sombra), Cristal
(de terra) e Plasma (de combustão).

**Despertares (4, D151, `prisma/seed/content/awakenings.ts`):** um por despertada, com perfil e pool de 7 a 8
missões (`awakening_brief.md` 7.4). As 5 skills de cada um ficam com o personagem da variante base (Nox, Gaia e Oren
Ignara), nos níveis 80, 85, 90, 95 e 100, com Poder ×1,25 e Desgaste ×1,5 (`skillReference` com `isAwakened`). Os
NPCs não usam (não estão no `npcPriority`).

**Personagens (12).** Reformulados a partir das fichas do usuário (`art_direction.md` 4). Stats = perfil da classe
(`classes_brief.md` 2). O elenco foi montado para **testar tudo** com poucos personagens: cada passiva usa um gatilho
diferente (só o `ON_HEAL` fica de fora: 12 personagens, 13 gatilhos) e, juntas, usam todos os efeitos de passiva.

| Personagem | Classe | Variantes | Raridade | Família | Passiva |
|---|---|---|---|---|---|
| Ecko Nocthar | Executor | antimatéria | SS | Nocthar | **Aniquilação** (sempre): todo dano ignora escudo |
| Kael Vaz | Vanguarda | explosão + endurecimento | A | | **Híbrido Perfeito** (ao atacar): +10% Defesa |
| Derik Okoro | Vanguarda | regeneração | A | | **Imortal** (início do turno): cura 2% do HP máx. |
| Lucky | Atirador | relâmpago + tempo | SS | Nocthar | **Fluxo do Tempo** (a cada 3 turnos): recargas em andamento −1 |
| Sunna | Controlador | gelo superiônico | S | | **Toque Gélido** (ao ser atingida): 25% de Prender quem bateu |
| Nox | Executor | sombra | A | Hyperion | **Visão Sombria** (ao derrubar): adianta a vez 30% |
| Gaia | Suporte | terra | A | | **Terra Viva** (o campo muda): adianta a vez dos aliados 15% |
| Rolf Eidvar | Atirador | alma | B | | **Primeiro a Cair** (ao ser derrotado): aliados adiantam a vez 30% |
| Kara | Suporte | ilusão | B | | **Pelos Meus** (aliado cai): +20% Ataque |
| Tyir Ossvald | Tático | ossos | A | | **Veterano** (ao ser Atordoado): todas as recargas −1 |
| Isis Maccarthy | Artilharia | telecinese | B | | **Explosiva** (ao pagar Desgaste): +10% Velocidade |
| Tank Valen | Guardião | sem variante | C | | **Constância** (HP < 40%): 15% menos dano |

**Personagens de baú (6, D150).** Não são iniciais (`isStarter` falso): só saem de baú, para testar o sorteio. Randoms
de famílias ancestrais (`world_build.md` 4.2), de raridade baixa (D85), sem traço de família e fora dos squads de NPC.
Mesmo molde dos 12 (kit de 4 + Reforçada, Forte e Final).

| Personagem | Classe | Variante | Raridade | Passiva |
|---|---|---|---|---|
| Brann Granek | Guardião | rocha | E | **Rocha Rachada** (HP < 50%): +15% Defesa |
| Vesna Kovarik | Vanguarda | metal | E | **Reaproveitar** (ao derrubar): cura 10% do HP máx. |
| Oren Ignara | Artilharia | combustão | D | **Pavio Curto** (ao atacar): 15% de Dano contínuo no alvo |
| Mira Kisar | Executora | névoa | D | **Forma Difusa** (a cada 3 turnos): +15% Esquiva |
| Lio Virelli | Controlador | som | C | **Eco** (ao ser atingido): 20% de Silenciar quem bateu |
| Dax Zarek | Atirador | relâmpago | B | **Hierarquia da Velocidade** (ao derrubar): adianta a vez 25% |

**Carteiras de teste:** `tester_01`, `admin` e `veterano` começam com 20.000 M e 50 de cada fragmento (só na criação da carteira;
rodar o seed de novo não repõe).

**Skills (165, 20 delas despertadas):** 7 a 9 por personagem (mais as despertadas), todas com os números de `skillReference` (tipo + forma, D92, D108, D109) e
acerto base 0,8. Kit básico (nível 0): Básica, Padrão, Função da classe, Assinatura (0,8 do Poder + efeito pequeno).
Pool: Padrão extra (nível 0), Reforçada (20), Forte (40) e Final (60). Juntas cobrem as 8 classes, as 7 linhagens
(incluindo none), os 4 alcances, as 4 áreas, os 3 alvos, os 7 status e todos os efeitos de skill
(`test/seed/seed-content.spec.ts` confere). Onde testar cada mecânica:

| Mecânica | Skills |
|---|---|
| Linha / coluna / grade (dano) | Onda de Choque, Pilar de Explosão, Detonação Total (Kael); Chuva de Metal, Estilhaços, Tempestade (Isis); Corrente (Lucky); Nevasca (Sunna); Terremoto (Gaia); Lanças de Osso (Tyir); Moedor de Carne (Derik) |
| Flanco / perfurante | Infiltração, Gancho da Harpe (Ecko); Passo Sombrio, Assassinato (Nox); Trovão Perfurante (Lucky); Superiônico (Sunna); Bala de Alma, Último Disparo (Rolf) |
| Cura / escudo | Cura da Terra, Coração da Terra (grade), Muralha de Terra (Gaia); Abrigo Ilusório (Kara); Sangue que Volta, Não Morre (Derik); Blindagem (Kael); Escudo Humano, Muralha Humana (Tank) |
| Buff / debuff de squad | Moral, Civilização (Kara); Solo Firme (Gaia); Formação de Guerra (Tyir) / Presença do Rei (Ecko, −Ataque), Perdidos (Kara, −Precisão) |
| Status | Atordoado: Congelar, Superiônico (Sunna), Sonho Acordado (Kara); Travado: Nevasca (Sunna), Tiro na Alma (Rolf); Preso: Grilhão (Sunna), Agarrar a Sombra (Nox), Raízes (Gaia); Exposto: Apagar (Ecko), Abrir a Guarda (Tank); Marcado: Marcar o Instante (Lucky), Ler a Alma (Rolf); Dano contínuo: Estilhaços (Isis); Provocado: Vem pra Cima (Derik), Aqui! (Tank, linha) |
| Executar (D125) | Sentença (Ecko, Exposto), Estilhaçar (Sunna, Preso), Emboscada (Nox, Preso), Sentença da Alma (Rolf, Marcado) |
| Reposicionar | empurrar: Detonação (Kael), Onda Telecinética (Isis); puxar: Gancho da Harpe (Ecko), Puxão (Isis); trocar inimigos: Vertigem (Kara); mover aliado: Reposicionar Tropa (Tyir); avançar: Trator (Derik), Iaijutsu (Lucky), Passo Sombrio (Nox) |
| Fila | adiantar a si: Passo Adiante (Lucky); atrasar: Instante Parado (Lucky), Ler a Batalha (Tyir); Comando: Comando, Agora! (Tyir) |
| Proteger / recuperar / campo | Proteger: Escudo de Aço (Kael), Escudo Vivo (Tank), Em Meu Lugar (Rolf); Recuperar: Não Morre (Derik), Abrigo Ilusório (Kara); trocar campo: Moldar o Terreno (Gaia, Padrão), Inverno Eterno (Sunna, Forte) |

A build dos NPCs sai de `npcPriority` (montada à mão por personagem).

**Traços (9):** Nocthar (família, +3% Ataque e Velocidade, qualquer variante) e Hyperion (família da sombra, +5%
Esquiva); conquistados: Berserker e Olho de Águia (+10% de dano corpo a corpo / à distância), Mira Firme, Muralha Viva,
Sangue Frio, Passo Leve, Ímpeto (+5% em um stat).

**Campos (6, 3 traços cada):** Arena, Floresta, Fortaleza, Planície Aberta, Ruínas de Carmesin, Noite sem Lua
(+6% / +4%, D98).

**Squads de NPC (20):** 4 composições (uma por perfil) × 5 dificuldades, no meio da faixa de nível do D103 (18, 35, 58,
80 e 95). Build: Função + Assinatura + as 2 skills de maior tipo já liberadas. Traços: a família (se tiver) + 1
conquistado.

| Perfil | Squad | Frente (coluna 0) | Atrás |
|---|---|---|---|
| Agressivo | Trindade | Kael, Ecko | Isis (atrás do Kael), Derik (atrás do Ecko) |
| Cauteloso | Muralha da CORE | Tank, Derik | Gaia, Rolf |
| Focado em abater | Caçada | Nox, Tyir | Lucky, Sunna |
| Equilibrado | CORE | Kael, Tyir | Lucky, Gaia |

**Conta de teste:** o seed também cria a `tester_01` (D133) pelo mesmo caso de uso do servidor, com os 12 personagens
no nível 18 e a distribuição padrão dos pontos livres. Se ela já existe, fica como está (o progresso não é apagado).
A conta `admin` também leva os personagens ao 18; se já existe, só sobe quem ainda está abaixo (os pontos livres
padrão só entram em quem não distribuiu nenhum). A gravação do conteúdo está em `prisma/seed/seed-database.ts` (usada
também pelos testes e2e, um schema por arquivo), as contas em `prisma/seed/seed-test-account.ts` e
`seed-admin-account.ts`, e a subida ao 18 em `seed-character-level.ts`.

**Conta de vitrine** (`veterano` / `origin123`, `prisma/seed/seed-showcase-account.ts`): para ver o despertar e o DOM
no front. Kael Vaz (85), Nox (95), Gaia (90) e Oren Ignara (90, de baú, dado à conta) no squad "Vitrine"; os outros
personagens ficam no nível 0. Nox, Gaia e Oren despertados (Sombra Abissal, Cristal e Plasma) com 3 skills despertadas
na build; o DOM treinado por feitos de verdade na janela (60 batalhas de peso 1), cobrindo as 4 skills únicas: Nox com
Mente avançada (Vidente) e Corpo intermediário, Gaia com Coração avançado (Resiliente) e Aura básica, Oren com Aura e
Corpo avançados (Rei e Indestrutível) e Kael com os 4 pilares sem avançado (Corpo e Coração intermediários, Mente e
Aura básicas). Se a conta já existe, fica como está.

## 5. Servidor (infra)

A API está em [`api.md`](./api.md). O que a infra acrescenta ao modelo:

- **Catálogo em memória:** o `PrismaCatalogRepository` lê variantes, traços, modelos, skills, campos e squads de NPC uma
  vez, remonta cada linha pelo `create` do domínio (que valida de novo) e guarda. Rodar o seed de novo pede reiniciar o
  servidor. A **versão do conteúdo** gravada na batalha é um hash do catálogo sem as datas.
- **Skills de um modelo:** a `key` da skill começa pela `key` do modelo (`kael-vaz:...`); é assim que o servidor acha o
  kit e o pool de cada personagem (`src/domain/catalog/services/template-skills.ts`).
- **Snapshot:** cada unidade do jogador guarda o `characterId` (quem recebe o XP no fim, D134). O NPC não tem.
- **Dono:** personagem, squad, pré-batalha e batalha só servem à conta logada (`findOwned...` nos casos de uso;
  outra conta = `NotAllowedError`, 403).
- **Pré-batalha (`BattleDraft`):** o adversário, a seed e o campo sorteado, mostrados antes de escolher o squad (D28,
  D112). Fica **em memória** no servidor por até 30 minutos e some quando a batalha começa; não tem tabela.
- **Estado da batalha não é guardado** (decisão geral nº 2): cada requisição refaz o motor pelo replay (foto + seed +
  ações). A IA monta a decisão com uma sorte própria por jogada (`aiDecisionRng`: seed, lado e posição no log), então
  a mesma batalha dá sempre as mesmas jogadas da máquina, mesmo depois de reiniciar o servidor.
- **XP guardado na batalha:** a coluna `rewards` (JSON, `[]` até o fim) guarda o que cada personagem ganhou
  (`Battle.recordRewards`, uma vez). Desistir (`Battle.forfeit`, D136) encerra com `ABANDON` e deixa vazio.
- **Fim protegido:** o `save` só atualiza uma batalha que ainda está em andamento; quem chega depois (desistir
  enquanto uma jogada termina a batalha) não grava e responde 409.
- **Jogada enviada duas vezes:** o `save` da batalha recebe quantas ações havia na leitura e grava só as novas; a
  chave (batalha + sequência) faz a segunda requisição falhar, e ela responde 409 sem gravar nem dar XP. A pré-batalha
  só vira uma batalha: o `delete` diz se ela ainda estava lá.
- **Versão do motor:** `ENGINE_VERSION` em `src/domain/combat/applications/services/pve-session.ts`. Mudou uma regra
  que altera o resultado das mesmas ações? Sobe a versão.

## 6. Próximos passos

1. **Calibração** da IA com as squads do seed (`engine.md` 3.14).
2. **Tempo do turno (D38):** o Defender automático por tempo esgotado precisa do tempo limite em segundos.
