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
| 3 | `CharacterTemplate` (+ `CharacterTemplateVariant` e enums `CharacterClass`, `Rarity`, `DangerLevel`, `Exclusivity`) | Catálogo | Variant, Trait | a fazer |
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
