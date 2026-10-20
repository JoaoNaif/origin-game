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

**Fora do MVP** (cada um vira migração própria quando a camada chegar): inventário, equipamento vivo, bestas, DOM,
despertar, economia, mercado, baús, materiais e organizações.

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
- O catálogo do despertar (perfil do sorteio e modelos de missão) vira o modelo `Awakening` quando a camada entrar
  (fora do MVP).

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
×1,10 nos demais. **Orçamento** = HP/5 + os outros 6 stats; classe 670 (Artilharia 640), com tolerância de ±3% para o
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
  stats: { HP: 700, ATTACK: 100, DEFENSE: 120, SPEED: 75, PRECISION: 85, EVASION: 55, WILL: 95 },
  passive: brasaInterna,
})
// right(CharacterTemplate): orçamento 670

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
| `HEAL` / `SHIELD` | `power` | 1,0 = 10% do HP máximo do alvo |
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

**Fora do MVP:** a skill única do DOM e o catálogo do despertar (`Awakening`) entram com essas camadas.

### 3.5 Account (jogador)

A conta do jogador. **Mínima no MVP:** só precisa ser dona dos personagens e dos squads e aparecer na batalha. A
máquina **não é uma conta**: o adversário do PvE vem do `NpcSquad` (modelo nº 9).

| Campo | Tipo | Regra |
|---|---|---|
| `id` | uuid | |
| `username` | texto, **único** | normalizado (sem espaços nas pontas, minúsculo); 3 a 20 caracteres: letras minúsculas, números e `_` |
| `displayName` | texto | 2 a 30 caracteres (sem espaços nas pontas); nome exibido na batalha |
| `createdAt`, `updatedAt` | data | |

**Regras (domínio, `InvalidAccountError`):** formato do `username` e tamanho do `displayName`.

**Fica para depois** (cada um com a sua migração):

| Quando | Campos |
|---|---|
| Autenticação | `email` (único), `passwordHash` |
| Economia (D100) | moeda, espaços de inventário |
| Organizações (D101) | organização ativa, reputação por organização |
| Ranqueado (D99) | pontos, faixa, histórico mínimo |

**Autenticação depois (aprovado):** o MVP valida a batalha e usa uma conta de teste criada pelo seed. E-mail e senha
entram junto com o login, numa migração própria.

**Exemplo** (fictício):

| `username` | `displayName` | Resultado |
|---|---|---|
| `joao_naif` | João | válido |
| `  Tester_01 ` | Tester | válido, salvo como `tester_01` |
| `Joao Naif!` | João | **inválido**: espaço e símbolo |

No `seed.ts`:

```ts
Account.create({ username: 'tester_01', displayName: 'Tester' })
// right(Account)

Account.create({ username: 'Joao Naif!', displayName: 'João' })
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

**Fica para depois:** subida da periculosidade, DOM (pilares e níveis), equipamento vivo, contratos, títulos e as
missões ocultas do despertar (o `awaken` já valida a regra; o sorteio e as missões entram com a camada).

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

**Fica para depois:** recompensas (XP e moeda, D92 e D100) entram no caso de uso que encerra a batalha; PvP
(adversário conta) entra com o `opponentAccountId` quando o PvP chegar.

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


## 4. Seed do MVP (conteúdo)

Código: `prisma/seed/content/` (o conteúdo, criado pelas entidades do domínio e validado por elas) e `prisma/seed.ts`
(grava no banco). Rodar: `npm run db:seed` (precisa do Postgres e da migração). Idempotente: atualiza pela `key` e
recria as ligações. O simulador usa o mesmo conteúdo sem banco (`loadSeedContent()`).

**Variantes (13):** antimatéria, tempo e alma (Fundamental); relâmpago, gelo superiônico (Elemental); explosão
(Vetorial); endurecimento, terra (Material); regeneração, resistência (Biológica); sombra, ilusão, telecinese (Psíquica).

**Personagens (12).** Stats = perfil da classe (`classes_brief.md` 2). Passivas do Ecko e do Lucky vêm do usuário; as
outras 10 foram propostas e aprovadas (D116), placeholder de valor.

| Personagem | Classe | Variantes | Raridade | Família | Passiva |
|---|---|---|---|---|---|
| Ecko Nocthar | Executor | antimatéria | SS | Nocthar | **Aniquilação:** todo dano ignora escudo |
| Kael Vaz | Vanguarda | explosão + endurecimento | A | | **Disciplina de Guerra:** HP < 50%, +15% Defesa |
| Derik Okoro | Vanguarda | regeneração | A | | **Imortal:** início do turno, cura 3% do HP máx. |
| Lucky | Atirador | relâmpago + tempo | SS | Nocthar | **Fluxo do Tempo:** a cada 3 turnos, recargas −1 |
| Sunna | Controlador | gelo superiônico | S | | **Controle Absoluto:** ao causar dano, 20% de Prender |
| Nox | Executor | sombra | A | Hyperion | **Visão Sombria:** ao derrubar, adianta a vez 30% |
| Gaia | Guardião | terra | A | | **Coração da CORE:** ao ser atingida, +10% Defesa |
| Rolf Eidvar | Atirador | alma | B | | **Primeiro a Cair:** HP < 30%, +15% Ataque |
| Kara | Suporte | ilusão | B | | **Irmã Mais Velha:** ao curar, adianta a vez 15% |
| Tyir Ossvald | Tático | resistência | A | | **Experiência:** sempre 5% menos dano |
| Isis Maccarthy | Artilharia | telecinese | B | | **Explosiva:** ao pagar Desgaste, +10% Velocidade |
| Tank Valen | Guardião | sem variante | C | | **Constância:** HP < 40%, 15% menos dano |

**Skills (84):** 7 por personagem, todas com os números de `skillReference` (tipo + forma, D92, D108, D109) e acerto
base 0,8. Kit básico (nível 0): Básica, Padrão, Função da classe, Assinatura (0,8 do Poder + efeito pequeno). Pool:
Reforçada (nível 20), Forte (40) e Final (60). Juntas cobrem as 8 classes, as 7 linhagens (incluindo none), os 4
alcances, as 4 áreas, os 6 status, cura, escudo, buff, debuff, adiantar/atrasar e empurrar/puxar.

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
| Agressivo | Trindade | Kael, Ecko, Derik | Isis |
| Cauteloso | Muralha da CORE | Gaia, Tank | Rolf, Kara |
| Focado em abater | Caçada | Nox, Tyir | Lucky, Sunna |
| Equilibrado | CORE | Gaia, Kael | Lucky, Kara |

## 5. Próximos passos

1. **Migração** dos campos (`battle_fields`) e **seed** no banco: `npm run services:up`, `npm run prisma:migrate`,
   `npm run db:seed` (Docker desligado na última sessão).
2. **Mapeadores** do Prisma para o domínio (em `infra/`), validando os JSONs na borda.
3. **Calibração** da IA com as squads do seed (`engine.md` 3.14).
