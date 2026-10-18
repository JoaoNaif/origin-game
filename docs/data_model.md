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
| 4 | `Skill` (+ enums `SkillTier`, `SkillTarget`, `SkillRange`, `SkillArea`, `SkillKitSlot`) | Catálogo | Variant (opcional) | a fazer |
| 5 | `Account` | Jogador | nada | a fazer |
| 6 | `Character` (+ `CharacterTrait`) | Jogador | Account, CharacterTemplate, Trait, Variant | a fazer |
| 7 | `CharacterSkill` (+ enum `CharacterSkillSource`) | Jogador | Character, Skill | a fazer |
| 8 | `Squad` (+ `SquadMember`) | Jogador | Account, Character | a fazer |
| 9 | `NpcSquad` (+ `NpcSquadMember`, `NpcSquadMemberSkill`, `NpcSquadMemberTrait`, enums `AiProfile`, `AiDifficulty`) | Batalha | CharacterTemplate, Skill, Trait, Variant | a fazer |
| 10 | `Battle` (+ enums `BattleMode`, `BattleStatus`, `BattleSide`, `BattleEndReason`) | Batalha | Account, Squad, NpcSquad | a fazer |
| 11 | `BattleAction` (+ enum `BattleActionType`) | Batalha | Battle | a fazer |

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
